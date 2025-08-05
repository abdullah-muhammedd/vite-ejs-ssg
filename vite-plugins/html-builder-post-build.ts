import { exec } from 'child_process';
import type { Plugin } from 'vite';

async function htmlBuild() {
  const cmd = 'bun scripts/build-html.ts';

  await new Promise<void>((res, rej) => {
    const child = exec(cmd);
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
    child.on('close', code => (code === 0 ? res() : rej()));
  });
  console.log(`✓ HTML build`);
}

export default function htmlBuilderPostBuild(): Plugin {
  return {
    name: 'html-builder-post-build',
    apply: 'build',
    async writeBundle() {
      console.log('Vite build complete – running HTML builder now');
      await htmlBuild();
    },
  };
}
