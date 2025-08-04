import { getLayoutData } from './layout.model.js';
import { renderView } from '../lib/template-engine.js';

export async function renderLayout({
  title,
  tags,
  content,
  globalCssHref = null,
}: {
  title: string;
  tags: string;
  content: string;
  globalCssHref: string | null;
}) {
  return renderView('src/layout/layout.view.ejs', {
    title,
    tags,
    content,
    globalCssHref,
    ...getLayoutData(),
  });
}
