#!/usr/bin/env ts-node

import madge from 'madge';
import * as path from 'path';
import { promises as fs } from 'fs';

async function validate() {
  const SRC = path.resolve('src');
  const pagesDir = path.join(SRC, 'pages');
  const layoutDir = path.join(SRC, 'layout');
  const designSystemDir = path.join(SRC, 'design-system'); // Updated path

  // Utility to recurse
  async function walk(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(e => {
        const res = path.join(dir, e.name);
        return e.isDirectory() ? walk(res) : Promise.resolve(res);
      })
    );
    return ([] as string[]).concat(...files);
  }

  // 1) FS structure for pages & layout
  async function checkSection(baseDir: string, sectionName: string) {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(baseDir, e.name);

      if (e.name === 'components') {
        // validate the contents of components/
        const comps = await fs.readdir(dir, { withFileTypes: true });
        for (const c of comps) {
          if (!c.isDirectory()) {
            throw new Error(
              `✘ Only component-folders allowed under ${sectionName}/components, found file: ${c.name}`
            );
          }
          const compPath = path.join(dir, c.name);
          const files = await fs.readdir(compPath);
          const expected = [`${c.name}.client.ts`, `${c.name}.component.ejs`];
          // Missing?
          expected.filter(f => !files.includes(f)).length &&
            (() => {
              throw new Error(
                `✘ Component '${c.name}' in ${sectionName}/components/${c.name} is missing ${expected
                  .filter(f => !files.includes(f))
                  .join(', ')}`
              );
            })();
          // Extra?
          files.filter(f => !expected.includes(f)).length &&
            (() => {
              throw new Error(
                `✘ Component '${c.name}' in ${sectionName}/components/${c.name} has extra files: ${files
                  .filter(f => !expected.includes(f))
                  .join(', ')}`
              );
            })();
        }
        continue;
      }

      // For each page/layout dir e.name, validate its root files
      const files = await fs.readdir(dir);
      const required = [
        `${e.name}.controller.ts`,
        `${e.name}.view.ejs`,
        'components',
      ];
      const valid = [`${e.name}.client.ts`, `${e.name}.model.ts`];
      // Missing?
      required.filter(r => !files.includes(r)).length &&
        (() => {
          throw new Error(
            `✘ ${sectionName} '${e.name}' is missing: ${required
              .filter(r => !files.includes(r))
              .join(', ')}`
          );
        })();
      // Extra?
      files.filter(f => !required.includes(f) && !valid.includes(f)).length &&
        (() => {
          throw new Error(
            `✘ ${sectionName} '${e.name}' has extra files: ${files
              .filter(f => !required.includes(f))
              .join(', ')}`
          );
        })();
    }
  }

  await checkSection(pagesDir, 'Page');
  await checkSection(layoutDir, 'Layout');

  // 2) Dependency rules with madge
  const graph = await madge(SRC, { fileExtensions: ['ts'] });
  const deps = graph.obj();

  // Identify all page/layout components
  const compRegex =
    /^src\/(pages\/[^/]+|layout)\/components\/([^/]+)\/\2\.client\.ts$/;

  const comps: Record<string, { owner: string }> = {};
  for (const file of Object.keys(deps)) {
    const p = file.replace(/\\/g, '/');
    const m = p.match(compRegex);
    if (!m || m.length < 3) continue; // skip if no match
    if (m && m[1]) comps[p] = { owner: m[1] }; // owner = "pages/home" or "layout"
  }

  // Track usage
  const usage = new Map<string, Set<string>>();

  for (const [file, imps] of Object.entries(deps)) {
    const srcFile = file.replace(/\\/g, '/');

    // a) Pages can't import each other
    if (srcFile.startsWith('src/pages/')) {
      for (const imp of imps) {
        const i = imp.replace(/\\/g, '/');
        if (
          i.startsWith('src/pages/') &&
          !i.startsWith(srcFile.split('/').slice(0, 3).join('/'))
        ) {
          throw new Error(
            `✘ Page '${srcFile}' imports another page '${i}'. Pages cannot import each other.`
          );
        }
      }
    }

    // b) Component imports
    for (const imp of imps) {
      const i = imp.replace(/\\/g, '/');
      if (comps[i]) {
        const { owner } = comps[i];
        // cross-owner import?
        if (!srcFile.startsWith(`src/${owner}`)) {
          throw new Error(
            `✘ Component '${path.basename(path.dirname(i))}' from '${owner}' is imported in '${srcFile}'. Move it to design-system/${path.basename(
              path.dirname(i)
            )}/`
          );
        }
        // track usage
        const set = usage.get(i) || new Set();
        set.add(srcFile);
        usage.set(i, set);
      }
    }
  }

  // c) Shared misuse: component used >1 in its owner
  for (const [comp, users] of usage) {
    if (users.size > 1) {
      throw new Error(
        `✘ Component '${path.basename(path.dirname(comp))}' is used in multiple places (${[
          ...users,
        ].join(', ')}). Move to design-system/${path.basename(
          path.dirname(comp)
        )}/`
      );
    }
  }

  // 3) design-system must not include or import outside
  if (await fs.stat(designSystemDir).catch(() => null)) {
    // EJS includes
    const ejsFiles = (await walk(designSystemDir)).filter(f =>
      f.endsWith('.ejs')
    );
    for (const file of ejsFiles) {
      const txt = await fs.readFile(file, 'utf-8');
      if (/include\(.+pages\//.test(txt)) {
        throw new Error(
          `✘ Design system component '${file}' includes page/layout templates. It must be standalone.`
        );
      }
    }
    // TS imports
    const tsFiles = (await walk(designSystemDir)).filter(f =>
      f.endsWith('.ts')
    );
    for (const file of tsFiles) {
      const txt = await fs.readFile(file, 'utf-8');
      if (/from\s+['"]\.\.\/\.\./.test(txt)) {
        throw new Error(
          `✘ Design system component '${file}' imports from outside design-system. Keep it self-contained.`
        );
      }
    }
  }

  console.log('✓ Structure validation passed');
}

validate().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
