import { promises as fs } from 'fs';
import { render } from 'ejs';
import * as path from 'path';

export async function renderView(
  viewPath: string,
  data: Record<string, unknown>
) {
  const absPath = path.resolve(viewPath);
  const template = await fs.readFile(absPath, 'utf-8');
  return render(template, data, { async: false, filename: absPath });
}
