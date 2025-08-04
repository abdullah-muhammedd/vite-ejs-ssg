#!/usr/bin/env ts-node

import { promises as fs } from 'fs';
import { renderLayout } from '../src/layout/layout.controller.js';
import * as path from 'path';
import fg from 'fast-glob';
// --- Types ---
type ManifestChunk = {
  file: string; // e.g. "assets/main-ABC.js"
  css?: string[]; // e.g. ["assets/main-XYZ.css"]
  imports?: string[]; // any code-split imports
};
type Manifest = Record<string, ManifestChunk | undefined>;

// --- Helpers ---
function importedChunks(
  manifest: Manifest,
  key: string,
  seen = new Set<string>()
): ManifestChunk[] {
  const list: ManifestChunk[] = [];
  const recurse = (name: string) => {
    const chunk = manifest[name];
    if (!chunk?.imports) return;
    for (const imp of chunk.imports) {
      if (!seen.has(imp)) {
        seen.add(imp);
        recurse(imp);
        const ic = manifest[imp];
        if (ic) list.push(ic);
      }
    }
  };
  recurse(key);
  return list;
}

function tagsForEntry(
  manifest: Manifest,
  entryKey: string,
  publicPath = '/'
): string {
  const main = manifest[entryKey];
  if (!main) return '';
  const prefix = publicPath.endsWith('/') ? publicPath : publicPath + '/';

  const allImports = importedChunks(manifest, entryKey);
  const cssPaths = [
    ...(main.css ?? []),
    ...allImports.flatMap(c => c.css ?? []),
  ];
  const jsPreload = allImports.map(c => c.file);

  const cssTags = cssPaths.map(
    file =>
      `<link rel="stylesheet" href="${prefix}${file.replace(/^\/+/, '')}">`
  );
  const preloadTags = jsPreload.map(
    file =>
      `<link rel="modulepreload" href="${prefix}${file.replace(/^\/+/, '')}">`
  );
  const scriptTag = `<script type="module" src="${prefix}${main.file.replace(/^\/+/, '')}"></script>`;

  return [...cssTags, ...preloadTags, scriptTag].join('\n');
}

// --- Build Process ---
async function build() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const manifestFP = path.join(distDir, '.vite', 'manifest.json');
  const manifestTxt = await fs.readFile(manifestFP, 'utf-8');
  const manifest = JSON.parse(manifestTxt) as Manifest;

  // Find every page controller under src/pages/<pagename>/
  const controllers = await fg('src/pages/*/*.controller.ts');

  for (const ctrlPath of controllers) {
    const pageName = path.basename(path.dirname(ctrlPath)); // e.g. "home"
    const outFilename = pageName === 'home' ? 'index.html' : `${pageName}.html`;
    const { render, pageTitle } = await import(path.resolve(ctrlPath));

    // 1) Render page-specific content
    const contentHtml = await render();

    // 2) Inject hashed CSS/JS
    const tags = tagsForEntry(manifest, 'src/main.ts', '/');

    // 3) Wrap in your global layout
    const finalHtml = await renderLayout({
      title: pageTitle ?? pageName,
      tags,
      content: contentHtml,
    });

    // 4) Write to dist/
    const outPath = path.join(distDir, outFilename);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, finalHtml.trim(), 'utf-8');
    console.log(`✓ Generated ${outFilename}`);
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
