#!/usr/bin/env ts-node

import { existsSync, promises as fs } from 'fs';
import * as path from 'path';

async function genPage(pageName: string) {
  const pagesDir = path.resolve('src/pages');
  const pageDir = path.join(pagesDir, pageName);
  const componentsDir = path.join(pageDir, 'components');
  const heroDir = path.join(componentsDir, 'hero');
  if (existsSync(pageDir)) {
    console.error(`✘ Page '${pageName}' already exists at ${pageDir}`);
    process.exit(1);
  }
  // --- Ensure directories exist ---
  await fs.mkdir(heroDir, { recursive: true });
  await fs.mkdir(componentsDir, { recursive: true });

  // --- Stub: Component (Hero) ---
  const heroComponentEjs = `<section data-hero>
  <h1><%= hero.headline %></h1>
  <p><%= hero.subtitle %></p>
  <a href="<%= hero.ctaHref %>"><%= hero.ctaText %></a>
</section>`;
  await fs.writeFile(
    path.join(heroDir, 'hero.component.ejs'),
    heroComponentEjs
  );

  const heroComponentClient = `import { Component } from '../../../../lib/component.js';

export class HeroComponent extends Component {
  constructor() {
    super('[data-hero]');
  }

  init() {
    console.log('HeroComponent initialized');
  }
}`;
  await fs.writeFile(path.join(heroDir, 'hero.client.ts'), heroComponentClient);

  // --- Stub: Model ---
  const model = `export function getHero() {
  return {
    headline: 'Headline',
    subtitle: 'lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    ctaText: 'Get Started',
    ctaHref: '/signup',
  };
}

export function getFeatures() {
  return [
    { title: 'lorem ipsum', desc: 'lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'lorem ipsum', desc: 'lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'lorem ipsum', desc: 'lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  ];
}`;
  await fs.writeFile(path.join(pageDir, `${pageName}.model.ts`), model);

  // --- Stub: Controller ---
  const controller = `import { renderView } from '../../lib/template-engine.js';
import { getHero, getFeatures } from './${pageName}.model.js';

export const pageTitle = '${pageName && pageName.length > 0 ? pageName[0]?.toUpperCase() + pageName.slice(1) : ''}';

export async function render(): Promise<string> {
  const hero = getHero();
  const features = getFeatures();
  return renderView('src/pages/${pageName}/${pageName}.view.ejs', { hero, features });
}`;
  await fs.writeFile(
    path.join(pageDir, `${pageName}.controller.ts`),
    controller
  );

  // --- Stub: View ---
  const view = `<%- include('./components/hero/hero.component.ejs') %>`;
  await fs.writeFile(path.join(pageDir, `${pageName}.view.ejs`), view);

  // --- Stub: Page Client ---
  const pageClient = `import { HeroComponent } from './components/hero/hero.client.js';

new HeroComponent().init();`;
  await fs.writeFile(path.join(pageDir, `${pageName}.client.ts`), pageClient);

  // --- Update src/main.ts ---
  const mainPath = path.resolve('src/main.ts');
  let mainContent = await fs.readFile(mainPath, 'utf-8');
  const importLine = `import './pages/${pageName}/${pageName}.client.js';`;

  if (!mainContent.includes(importLine)) {
    // Insert at the end of imports
    const lines = mainContent.split('\n');
    const lastImportIndex = lines
      .map(l => l.trim())
      .reduce((idx, line, i) => (line.startsWith('import ') ? i : idx), -1);
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine);
      mainContent = lines.join('\n');
    } else {
      mainContent = importLine + '\n' + mainContent;
    }
    await fs.writeFile(mainPath, mainContent, 'utf-8');
    console.log(`✓ Updated src/main.ts to import ${pageName}.client.js`);
  } else {
    console.log(`ℹ src/main.ts already imports ${pageName}.client.js`);
  }

  console.log(`✓ Page '${pageName}' generated`);
}

// Run from CLI
const pageName = process.argv[2];
if (!pageName) {
  console.error('Usage: ts-node scripts/gen-page.ts <page-name>');
  process.exit(1);
}

genPage(pageName).catch(err => {
  console.error(err);
  process.exit(1);
});
