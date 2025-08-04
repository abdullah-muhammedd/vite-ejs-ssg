import { renderView } from '../../lib/template-engine.js';
import { getHero, getFeatures } from './home.model.js';

export const pageTitle = 'Home';

export async function render(): Promise<string> {
  const hero = getHero();
  const features = getFeatures();
  return renderView('src/pages/home/home.view.ejs', { hero, features });
}
