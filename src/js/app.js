/**
 * ImgDivider — Main Entry Point
 */

import { UIController } from './uiController.js';

document.addEventListener('DOMContentLoaded', () => {
  window.app = new UIController();
  console.log('ImgDivider v1.0.0 initialized');
});
