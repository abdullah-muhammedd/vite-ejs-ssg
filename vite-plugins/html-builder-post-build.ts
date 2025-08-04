import { exec } from 'child_process';
import type { Plugin } from 'vite';
import { runHtmlBuilder } from './html-builder-dev.plugin.js';

export default function htmlBuilderPostBuild(): Plugin {
  return {
    name: 'html-builder-post-build',
    apply: 'build',
    async writeBundle() {
      console.log('Vite build complete – running HTML builder now');
      await runHtmlBuilder();
    },
  };
}
