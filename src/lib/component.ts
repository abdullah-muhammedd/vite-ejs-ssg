// lib/component.ts
export abstract class Component {
  protected root: HTMLElement;

  constructor(public selector: string) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      throw new Error(`Component root not found for selector: ${selector}`);
    }
    this.root = el;
  }

  /** Query a single element and throw if not found */
  protected $<T extends HTMLElement = HTMLElement>(sel: string): T {
    const el = this.root.querySelector<T>(sel);
    if (!el) {
      throw new Error(`Element not found: ${sel} inside ${this.selector}`);
    }
    return el;
  }

  /** Query multiple elements and throw if none found */
  protected $all<T extends HTMLElement = HTMLElement>(sel: string): T[] {
    const els = Array.from(this.root.querySelectorAll<T>(sel));
    if (els.length === 0) {
      throw new Error(`No elements found: ${sel} inside ${this.selector}`);
    }
    return els;
  }

  abstract init(): void;
}
