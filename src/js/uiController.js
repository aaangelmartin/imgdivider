/**
 * ImgDivider — UI Controller
 * Handles all DOM interactions, state management, and view orchestration.
 */

import { PRESETS, getPreset } from './presets.js';
import { ImageProcessor } from './imageProcessor.js';
import { ZipExporter } from './zipExporter.js';

export class UIController {
  constructor() {
    this.processor = new ImageProcessor();
    this.exporter = new ZipExporter();
    this.currentFile = null;
    this.currentPresetId = 'instagram-post';
    this.parts = [];

    this.cacheDOM();
    this.bindEvents();
    this.renderPresets();
    this.applyTheme();
  }

  cacheDOM() {
    this.dom = {
      // Steps
      stepUpload: document.getElementById('stepUpload'),
      stepConfigure: document.getElementById('stepConfigure'),
      stepDownload: document.getElementById('stepDownload'),

      // Upload
      uploadZone: document.getElementById('uploadZone'),
      fileInput: document.getElementById('fileInput'),

      // Config sidebar
      presetGrid: document.getElementById('presetGrid'),
      targetWidth: document.getElementById('targetWidth'),
      targetHeight: document.getElementById('targetHeight'),
      cols: document.getElementById('cols'),
      rows: document.getElementById('rows'),
      scaleMode: document.getElementById('scaleMode'),
      outputFormat: document.getElementById('outputFormat'),
      quality: document.getElementById('quality'),
      qualityValue: document.getElementById('qualityValue'),
      qualityGroup: document.getElementById('qualityGroup'),

      // Buttons
      btnBackUpload: document.getElementById('btnBackUpload'),
      btnPreview: document.getElementById('btnPreview'),
      btnBackConfig: document.getElementById('btnBackConfig'),
      btnDownloadAll: document.getElementById('btnDownloadAll'),

      // Preview
      canvasWrapper: document.getElementById('canvasWrapper'),
      previewCanvas: document.getElementById('previewCanvas'),
      previewInfo: document.getElementById('previewInfo'),
      originalSize: document.getElementById('originalSize'),
      targetSize: document.getElementById('targetSize'),
      totalParts: document.getElementById('totalParts'),

      // Download
      partsGrid: document.getElementById('partsGrid'),

      // Global
      toastContainer: document.getElementById('toastContainer'),
      themeToggle: document.getElementById('themeToggle'),
      themeIcon: document.getElementById('themeIcon')
    };
  }

  bindEvents() {
    // File upload
    this.dom.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

    // Drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dom.uploadZone.addEventListener(eventName, (e) => this.preventDefaults(e), false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dom.uploadZone.addEventListener(eventName, () => this.dom.uploadZone.classList.add('upload-zone--dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dom.uploadZone.addEventListener(eventName, () => this.dom.uploadZone.classList.remove('upload-zone--dragover'), false);
    });

    this.dom.uploadZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) this.handleFileSelect(files[0]);
    });

    // Navigation
    this.dom.btnBackUpload.addEventListener('click', () => this.goToStep('upload'));
    this.dom.btnPreview.addEventListener('click', () => this.goToStep('download'));
    this.dom.btnBackConfig.addEventListener('click', () => this.goToStep('configure'));
    this.dom.btnDownloadAll.addEventListener('click', () => this.downloadAllZip());

    // Quality slider
    this.dom.quality.addEventListener('input', () => {
      this.dom.qualityValue.textContent = this.dom.quality.value;
    });

    // Format change (show/hide quality)
    this.dom.outputFormat.addEventListener('change', () => {
      const isLossy = this.dom.outputFormat.value !== 'image/png';
      this.dom.qualityGroup.style.display = isLossy ? 'block' : 'none';
    });

    // Theme toggle
    this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Window resize re-render preview
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.currentFile && this.dom.stepConfigure.classList.contains('step--active')) {
          this.updatePreview();
        }
      }, 250);
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  async handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showToast('Por favor selecciona un archivo de imagen válido.', 'error');
      return;
    }

    this.currentFile = file;

    try {
      const { width, height } = await this.processor.loadImage(file);
      this.showToast(`Imagen cargada: ${width}×${height}px`, 'success');
      this.goToStep('configure');
      this.updatePreview();
    } catch (err) {
      this.showToast('Error al cargar la imagen: ' + err.message, 'error');
    }
  }

  goToStep(stepName) {
    // Hide all steps
    this.dom.stepUpload.classList.remove('step--active');
    this.dom.stepConfigure.classList.remove('step--active');
    this.dom.stepDownload.classList.remove('step--active');

    // Show target
    if (stepName === 'upload') {
      this.dom.stepUpload.classList.add('step--active');
      this.processor.cleanup();
      this.currentFile = null;
      this.dom.fileInput.value = '';
    } else if (stepName === 'configure') {
      this.dom.stepConfigure.classList.add('step--active');
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (stepName === 'download') {
      this.generateAndShowParts();
    }
  }

  renderPresets() {
    const groups = {};
    for (const preset of PRESETS) {
      if (!groups[preset.category]) groups[preset.category] = [];
      groups[preset.category].push(preset);
    }

    let html = '';
    const categoryLabels = {
      social: 'Redes Sociales',
      print: 'Impresión',
      grid: 'Grids',
      custom: 'Personalizado'
    };

    for (const [cat, presets] of Object.entries(groups)) {
      html += `<div class="preset-section"><h3 class="section-label">${categoryLabels[cat] || cat}</h3><div class="preset-grid">`;
      for (const preset of presets) {
        const dims = preset.targetWidth ? `${preset.targetWidth}×${preset.targetHeight}` : `${preset.cols}×${preset.rows}`;
        const activeClass = preset.id === this.currentPresetId ? 'preset-card--active' : '';
        const badgeHtml = preset.badge ? `<span class="preset-badge">${preset.badge}</span>` : '';
        html += `
          <div class="preset-card ${activeClass}" data-id="${preset.id}">
            ${badgeHtml}
            <div class="preset-name">${preset.name}</div>
            <div class="preset-dims">${dims}</div>
          </div>
        `;
      }
      html += '</div></div>';
    }

    this.dom.presetGrid.innerHTML = html;

    // Bind preset clicks
    this.dom.presetGrid.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => this.selectPreset(card.dataset.id));
    });
  }

  selectPreset(id) {
    this.currentPresetId = id;
    const preset = getPreset(id);
    if (!preset) return;

    // Update UI active state
    this.dom.presetGrid.querySelectorAll('.preset-card').forEach(card => {
      card.classList.toggle('preset-card--active', card.dataset.id === id);
    });

    // Update inputs
    if (preset.targetWidth) this.dom.targetWidth.value = preset.targetWidth;
    if (preset.targetHeight) this.dom.targetHeight.value = preset.targetHeight;
    this.dom.cols.value = preset.cols === 'auto' ? 1 : preset.cols;
    this.dom.rows.value = preset.rows;
    this.dom.scaleMode.value = preset.scaleMode;
    this.dom.outputFormat.value = preset.format;
    this.dom.quality.value = preset.quality;
    this.dom.qualityValue.textContent = preset.quality;

    // Show/hide quality
    const isLossy = preset.format !== 'image/png';
    this.dom.qualityGroup.style.display = isLossy ? 'block' : 'none';

    // Update preview if image loaded
    if (this.currentFile) {
      this.updatePreview();
    }
  }

  getConfig() {
    return {
      targetWidth: parseInt(this.dom.targetWidth.value, 10) || null,
      targetHeight: parseInt(this.dom.targetHeight.value, 10) || null,
      cols: this.dom.cols.value,
      rows: parseInt(this.dom.rows.value, 10) || 1,
      scaleMode: this.dom.scaleMode.value,
      format: this.dom.outputFormat.value,
      quality: parseInt(this.dom.quality.value, 10)
    };
  }

  updatePreview() {
    if (!this.currentFile) return;

    const config = this.getConfig();
    const info = this.processor.drawPreview(this.dom.previewCanvas, config);

    if (info) {
      this.dom.canvasWrapper.classList.add('has-image');
      this.dom.originalSize.textContent = `Original: ${info.originalWidth}×${info.originalHeight}`;
      this.dom.targetSize.textContent = `Celda: ${info.targetWidth}×${info.targetHeight}`;
      this.dom.totalParts.textContent = `Partes: ${info.totalParts}`;
      this.dom.previewInfo.style.display = 'flex';
    }
  }

  async generateAndShowParts() {
    this.dom.btnPreview.disabled = true;
    this.dom.btnPreview.textContent = 'Procesando...';

    try {
      const config = this.getConfig();
      this.parts = await this.processor.generateParts(config);

      // Render parts grid
      this.dom.partsGrid.innerHTML = '';
      for (const part of this.parts) {
        const card = document.createElement('div');
        card.className = 'part-card';
        card.style.animationDelay = `${part.index * 0.05}s`;
        card.innerHTML = `
          <img src="${part.url}" alt="${part.name}" loading="lazy">
          <div class="part-card-info">
            <div>
              <div class="part-name">Parte ${part.index + 1}</div>
              <div class="part-dims">${part.width}×${part.height}</div>
            </div>
            <button class="part-download" data-name="${part.name}" title="Descargar esta parte">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        `;

        // Bind single download
        card.querySelector('.part-download').addEventListener('click', () => {
          this.exporter.downloadSingle(part.blob, part.name);
        });

        this.dom.partsGrid.appendChild(card);
      }

      // Show download step
      this.dom.stepDownload.classList.add('step--active');
      this.dom.stepConfigure.classList.remove('step--active');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      this.showToast(`${this.parts.length} partes generadas correctamente`, 'success');
    } catch (err) {
      this.showToast('Error al generar partes: ' + err.message, 'error');
      console.error(err);
    } finally {
      this.dom.btnPreview.disabled = false;
      this.dom.btnPreview.textContent = 'Generar vista previa';
    }
  }

  async downloadAllZip() {
    if (!this.parts.length) return;

    this.dom.btnDownloadAll.disabled = true;
    this.dom.btnDownloadAll.textContent = 'Generando ZIP...';

    try {
      const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^.]+$/, '') : 'imagen';
      await this.exporter.downloadZip(this.parts, `${baseName}_dividida.zip`);
      this.showToast('ZIP descargado correctamente', 'success');
    } catch (err) {
      this.showToast('Error al generar ZIP: ' + err.message, 'error');
    } finally {
      this.dom.btnDownloadAll.disabled = false;
      this.dom.btnDownloadAll.textContent = '📦 Descargar ZIP';
    }
  }

  // Theme management
  applyTheme() {
    const saved = localStorage.getItem('imgdivider-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeIcon(theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('imgdivider-theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    const svg = theme === 'dark'
      ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    this.dom.themeIcon.innerHTML = svg;
  }

  // Toast notifications
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = {
      success: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}
