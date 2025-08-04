import { Component } from '../../../lib/component.js';

export class HeaderComponent extends Component {
  constructor() {
    super('[data-header]');
  }

  init() {
    console.log('HeaderComponent initialized');
  }
}