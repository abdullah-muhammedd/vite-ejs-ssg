#!/usr/bin/env ts-node

import { existsSync, promises as fs } from 'fs';
import * as path from 'path';

async function updateViteConfig(pageName: string) {
  const viteConfigPath = path.resolve('vite.config.ts');
  if (!existsSync(viteConfigPath)) {
    console.log('ℹ vite.config.ts not found - skipping Vite config update');
    return;
  }

  let viteConfig = await fs.readFile(viteConfigPath, 'utf-8');
  const newEntry = `'src/pages/${pageName}/${pageName}.client.ts'`;

  // Check if entry already exists
  if (viteConfig.includes(newEntry)) {
    console.log(`ℹ vite.config.ts already includes ${newEntry}`);
    return;
  }

  // Find the input array in the config
  const inputArrayRegex = /input:\s*\[([^\]]*)\]/;
  const match = viteConfig.match(inputArrayRegex);

  if (match) {
    // Get existing entries
    const existingEntries = (match[1] ?? '')
      .split(',')
      .map(entry => entry.trim().replace(/['"]/g, ''))
      .filter(entry => entry.length > 0);

    // Add new entry if not already present
    if (!existingEntries.includes(newEntry.replace(/['"]/g, ''))) {
      const updatedInput = `input: [\n${existingEntries.map(e => `      '${e}'`).join(',\n')},\n      ${newEntry}\n    ]`;
      viteConfig = viteConfig.replace(inputArrayRegex, updatedInput);
      await fs.writeFile(viteConfigPath, viteConfig, 'utf-8');
      console.log(`✓ Updated vite.config.ts with ${newEntry}`);
    }
  } else {
    console.log(
      'ℹ Could not find input array in vite.config.ts - please add manually:'
    );
    console.log(`input: [${newEntry}]`);
  }
}

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
  await updateViteConfig(pageName);
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
