import { exec } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Run the HTML builder, optionally targeting a single page.
 * @param page Optional page name (e.g., "home"). If omitted, rebuilds all pages.
 */
export async function runHtmlBuilder(page?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = page
      ? `bun scripts/build-html.ts ${page}`
      : 'bun scripts/build-html.ts';

    exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr || '');
        console.error(stdout || '');
        reject(err);
      } else {
        console.log(stdout.trim());
        resolve();
      }
    });
  });
}

async function initialBuild(page?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = `npm run build`;

    exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr || '');
        console.error(stdout || '');
        reject(err);
      } else {
        console.log(stdout.trim());
        resolve();
      }
    });
  });
}

export default function htmlBuilderDev(): Plugin {
  return {
    name: 'html-builder-dev',
    apply: 'serve',
    async configureServer(server) {
      const dist = path.resolve(__dirname, '../dist');
      if (!existsSync(dist)) {
        await initialBuild();
      }
      server.middlewares.use(
        (await import('sirv')).default(dist, { dev: true })
      );

      server.watcher.add(['src/**/*.{ts,ejs}']);

      server.watcher.on('change', async file => {
        const normalized = file.replace(/\\/g, '/');

        const pageMatch = normalized.includes('/src/pages/');
        const page = pageMatch
          ? normalized.split('/src/pages/')?.[1]?.split('/')[0]
          : undefined;

        console.log(
          page
            ? `↻ Rebuilding only page: ${page}`
            : `↻ Rebuilding all pages (change in: ${normalized})`
        );

        try {
          await runHtmlBuilder(page);
        } catch {
          console.error('HTML rebuild failed – check logs above.');
        }
      });
    },
  };
}
