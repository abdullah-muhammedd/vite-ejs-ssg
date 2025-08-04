import { getLayoutData } from './layout.model.js';
import { renderView } from '../lib/template-engine.js';

export async function renderLayout({
  title,
  tags,
  content,
}: {
  title: string;
  tags: string;
  content: string;
}) {
  return renderView('src/layout/layout.view.ejs', {
    title,
    tags,
    content,
    notifications: [
      {
        title: 'Notification Title',
        message: 'This is a notification message.',
      },
    ],
    ...getLayoutData(),
  });
}
