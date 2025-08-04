import { Component } from '../../../lib/component.js';

export class HeadComponent extends Component {
  constructor() {
    super('[data-head]');
  }

  init() {
    console.log('head layout component initialized');
  }
}
