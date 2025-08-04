#!/usr/bin/env ts-node

import { promises as fs } from 'fs';
import { renderLayout } from '../src/layout/layout.controller.js';
import * as path from 'path';
import fg from 'fast-glob';

// Types
type ManifestChunk = { file: string; css?: string[]; imports?: string[] };
type Manifest = Record<string, ManifestChunk | undefined>;

// Helpers
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

function cssTagsForEntry(
  manifest: Manifest,
  entryKey: string,
  publicPath = '/'
) {
  const main = manifest[entryKey];
  if (!main) return [];
  const prefix = publicPath.endsWith('/') ? publicPath : publicPath + '/';

  const allImports = importedChunks(manifest, entryKey);
  const cssPaths = [
    ...(main.css ?? []),
    ...allImports.flatMap(c => c.css ?? []),
  ];

  return cssPaths.map(
    file =>
      `<link rel="stylesheet" href="${prefix}${file.replace(/^\/+/, '')}">`
  );
}
// Build process
// Build process
async function build() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const manifestFP = path.join(distDir, '.vite', 'manifest.json');
  const manifestTxt = await fs.readFile(manifestFP, 'utf-8');
  const manifest = JSON.parse(manifestTxt) as Manifest;

  // Get global CSS path from manifest
  const globalCssHref = manifest['src/styles.css']?.file
    ? `/${manifest['src/styles.css'].file.replace(/^\/+/, '')}`
    : null;

  const targetPage = process.argv[2];
  const controllers = targetPage
    ? await fg(`src/pages/${targetPage}/*.controller.ts`)
    : await fg('src/pages/*/*.controller.ts');

  if (!controllers.length && targetPage) {
    console.warn(
      `No matching page found for "${targetPage}", rebuilding all pages instead.`
    );
  }

  const pagesToBuild = controllers.length
    ? controllers
    : await fg('src/pages/*/*.controller.ts');

  for (const ctrlPath of pagesToBuild) {
    const pageName = path.basename(path.dirname(ctrlPath));
    const outFilename = pageName === 'home' ? 'index.html' : `${pageName}.html`;
    const { render, pageTitle } = await import(path.resolve(ctrlPath));

    const contentHtml = await render();
    const pageEntryKey = `src/pages/${pageName}/${pageName}.client.ts`;
    const pageTags = tagsForEntry(manifest, pageEntryKey);

    const finalHtml = await renderLayout({
      title: pageTitle ?? pageName,
      tags: pageTags,
      content: contentHtml,
      globalCssHref,
    });

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
