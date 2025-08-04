import { Component } from '../../../../lib/component.js';

export class HeroComponent extends Component {
  constructor() {
    super('[data-hero]');
  }

  init() {
    console.log('HeroComponent initialized');
  }
}