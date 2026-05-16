/**
 * ImgDivider — UI Controller
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
    this.previewDebounceTimer = null;
    this.baseWidth = 1080;
    this.baseHeight = 1350;

    this.cacheDOM();
    this.bindEvents();
    this.renderPresets();
    this.applyTheme();
    this.selectPreset('instagram-post');
  }

  cacheDOM() {
    this.dom = {
      stepUpload: document.getElementById('stepUpload'),
      stepConfigure: document.getElementById('stepConfigure'),
      stepDownload: document.getElementById('stepDownload'),
      uploadZone: document.getElementById('uploadZone'),
      fileInput: document.getElementById('fileInput'),
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
      multiplier: document.getElementById('multiplier'),
      btnBackUpload: document.getElementById('btnBackUpload'),
      btnPreview: document.getElementById('btnPreview'),
      btnBackConfig: document.getElementById('btnBackConfig'),
      btnDownloadAll: document.getElementById('btnDownloadAll'),
      canvasWrapper: document.getElementById('canvasWrapper'),
      previewCanvas: document.getElementById('previewCanvas'),
      previewInfo: document.getElementById('previewInfo'),
      originalSize: document.getElementById('originalSize'),
      targetSize: document.getElementById('targetSize'),
      totalParts: document.getElementById('totalParts'),
      partsGrid: document.getElementById('partsGrid'),
      toastContainer: document.getElementById('toastContainer'),
      themeToggle: document.getElementById('themeToggle'),
      themeIcon: document.getElementById('themeIcon')
    };
  }

  bindEvents() {
    // Upload
    this.dom.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
      this.dom.uploadZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    this.dom.uploadZone.addEventListener('dragenter', () => this.dom.uploadZone.classList.add('upload-zone--dragover'));
    this.dom.uploadZone.addEventListener('dragleave', () => this.dom.uploadZone.classList.remove('upload-zone--dragover'));
    this.dom.uploadZone.addEventListener('drop', (e) => {
      this.dom.uploadZone.classList.remove('upload-zone--dragover');
      if (e.dataTransfer.files.length) this.handleFileSelect(e.dataTransfer.files[0]);
    });

    // Navigation
    this.dom.btnBackUpload.addEventListener('click', () => this.goToStep('upload'));
    this.dom.btnPreview.addEventListener('click', () => this.goToStep('download'));
    this.dom.btnBackConfig.addEventListener('click', () => this.goToStep('configure'));
    this.dom.btnDownloadAll.addEventListener('click', () => this.downloadAllZip());

    // Real-time preview on ANY input change (debounced 120ms)
    const inputs = [
      this.dom.targetWidth, this.dom.targetHeight, this.dom.cols,
      this.dom.rows, this.dom.scaleMode, this.dom.outputFormat, this.dom.quality
    ];
    inputs.forEach(input => {
      input.addEventListener('input', () => this.debouncedPreview());
      input.addEventListener('change', () => this.debouncedPreview());
    });

    // Multiplier changes base dimensions and updates inputs
    this.dom.multiplier.addEventListener('change', () => this.applyMultiplier());

    // When user manually edits width/height, update base dims so multiplier still works
    this.dom.targetWidth.addEventListener('change', () => this.updateBaseFromInputs());
    this.dom.targetHeight.addEventListener('change', () => this.updateBaseFromInputs());

    // Quality label update + preview
    this.dom.quality.addEventListener('input', () => {
      this.dom.qualityValue.textContent = this.dom.quality.value;
      this.debouncedPreview();
    });

    // Format change -> show/hide quality
    this.dom.outputFormat.addEventListener('change', () => {
      const isLossy = this.dom.outputFormat.value !== 'image/png';
      this.dom.qualityGroup.style.display = isLossy ? 'flex' : 'none';
      this.debouncedPreview();
    });

    // Theme
    this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Resize -> re-render preview with correct scaling
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        if (this.currentFile && this.dom.stepConfigure.classList.contains('step--active')) {
          this.updatePreview();
        }
      }, 200);
    });
  }

  debouncedPreview() {
    clearTimeout(this.previewDebounceTimer);
    this.previewDebounceTimer = setTimeout(() => {
      if (this.currentFile) this.updatePreview();
    }, 120);
  }

  async handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showToast('Selecciona un archivo de imagen válido.', 'error');
      return;
    }

    this.currentFile = file;
    try {
      const { width, height } = await this.processor.loadImage(file);
      this.showToast(`${width}×${height}px cargado`, 'success');
      this.goToStep('configure');
      this.updatePreview();
    } catch (err) {
      this.showToast('Error al cargar: ' + err.message, 'error');
    }
  }

  goToStep(stepName) {
    this.dom.stepUpload.classList.remove('step--active');
    this.dom.stepConfigure.classList.remove('step--active');
    this.dom.stepDownload.classList.remove('step--active');

    if (stepName === 'upload') {
      this.dom.stepUpload.classList.add('step--active');
      this.processor.cleanup();
      this.currentFile = null;
      this.dom.fileInput.value = '';
    } else if (stepName === 'configure') {
      this.dom.stepConfigure.classList.add('step--active');
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

    const categoryLabels = {
      social: 'Redes', print: 'Print', grid: 'Grid', custom: 'Custom'
    };

    let html = '';
    for (const [cat, presets] of Object.entries(groups)) {
      for (const preset of presets) {
        const dims = preset.targetWidth ? `${preset.targetWidth}×${preset.targetHeight}` : `${preset.cols}×${preset.rows}`;
        const activeClass = preset.id === this.currentPresetId ? 'preset-chip--active' : '';
        html += `<button class="preset-chip ${activeClass}" data-id="${preset.id}" title="${preset.description} — ${dims}">${preset.name}</button>`;
      }
    }

    this.dom.presetGrid.innerHTML = html;
    this.dom.presetGrid.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => this.selectPreset(chip.dataset.id));
    });
  }

  selectPreset(id) {
    this.currentPresetId = id;
    const preset = getPreset(id);
    if (!preset) return;

    this.dom.presetGrid.querySelectorAll('.preset-chip').forEach(chip => {
      chip.classList.toggle('preset-chip--active', chip.dataset.id === id);
    });

    // Store base dimensions from preset
    this.baseWidth = preset.targetWidth || parseInt(this.dom.targetWidth.value, 10) || 1080;
    this.baseHeight = preset.targetHeight || parseInt(this.dom.targetHeight.value, 10) || 1350;

    // Apply current multiplier to base dims
    const mult = parseInt(this.dom.multiplier.value, 10) || 1;
    this.dom.targetWidth.value = this.baseWidth * mult;
    this.dom.targetHeight.value = this.baseHeight * mult;

    this.dom.cols.value = preset.cols === 'auto' ? 1 : preset.cols;
    this.dom.rows.value = preset.rows;
    this.dom.scaleMode.value = preset.scaleMode;
    this.dom.outputFormat.value = preset.format;
    this.dom.quality.value = preset.quality;
    this.dom.qualityValue.textContent = preset.quality;

    const isLossy = preset.format !== 'image/png';
    this.dom.qualityGroup.style.display = isLossy ? 'flex' : 'none';

    if (this.currentFile) this.updatePreview();
  }

  applyMultiplier() {
    const mult = parseInt(this.dom.multiplier.value, 10) || 1;
    this.dom.targetWidth.value = this.baseWidth * mult;
    this.dom.targetHeight.value = this.baseHeight * mult;
    if (this.currentFile) this.debouncedPreview();
  }

  updateBaseFromInputs() {
    const mult = parseInt(this.dom.multiplier.value, 10) || 1;
    const w = parseInt(this.dom.targetWidth.value, 10);
    const h = parseInt(this.dom.targetHeight.value, 10);
    if (w && mult) this.baseWidth = Math.round(w / mult);
    if (h && mult) this.baseHeight = Math.round(h / mult);
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
      this.dom.originalSize.textContent = `${info.originalWidth}×${info.originalHeight}`;
      this.dom.targetSize.textContent = `${info.targetWidth}×${info.targetHeight}`;
      this.dom.totalParts.textContent = `${info.totalParts} partes`;
      this.dom.previewInfo.style.display = 'flex';

      // CSS-scale the canvas to fit the wrapper without scroll
      const wrapper = this.dom.canvasWrapper;
      const maxW = wrapper.clientWidth;
      const maxH = wrapper.clientHeight;
      const scale = Math.min(maxW / info.originalWidth, maxH / info.originalHeight, 1);
      const w = Math.floor(info.originalWidth * scale);
      const h = Math.floor(info.originalHeight * scale);
      this.dom.previewCanvas.style.width = w + 'px';
      this.dom.previewCanvas.style.height = h + 'px';
    }
  }

  async generateAndShowParts() {
    this.dom.btnPreview.disabled = true;
    const originalText = this.dom.btnPreview.textContent;
    this.dom.btnPreview.textContent = 'Dividiendo...';

    try {
      const config = this.getConfig();
      this.parts = await this.processor.generateParts(config);

      this.dom.partsGrid.innerHTML = '';
      for (const part of this.parts) {
        const card = document.createElement('div');
        card.className = 'part-card';
        card.style.animationDelay = `${part.index * 0.04}s`;
        card.innerHTML = `
          <img src="${part.url}" alt="${part.name}" loading="lazy">
          <div class="part-card-info">
            <div>
              <div class="part-name">${part.index + 1}</div>
              <div class="part-dims">${part.width}×${part.height}</div>
            </div>
            <button class="part-download" title="Descargar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        `;
        card.querySelector('.part-download').addEventListener('click', () => {
          this.exporter.downloadSingle(part.blob, part.name);
        });
        this.dom.partsGrid.appendChild(card);
      }

      this.dom.stepDownload.classList.add('step--active');
      this.dom.stepConfigure.classList.remove('step--active');
      this.showToast(`${this.parts.length} partes listas`, 'success');
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
      console.error(err);
    } finally {
      this.dom.btnPreview.disabled = false;
      this.dom.btnPreview.textContent = originalText;
    }
  }

  async downloadAllZip() {
    if (!this.parts.length) return;

    this.dom.btnDownloadAll.disabled = true;
    const originalText = this.dom.btnDownloadAll.textContent;
    this.dom.btnDownloadAll.textContent = 'Generando...';

    try {
      const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^.]+$/, '') : 'imagen';
      await this.exporter.downloadZip(this.parts, `${baseName}_dividida.zip`);
      this.showToast('ZIP descargado', 'success');
    } catch (err) {
      this.showToast('Error ZIP: ' + err.message, 'error');
    } finally {
      this.dom.btnDownloadAll.disabled = false;
      this.dom.btnDownloadAll.textContent = originalText;
    }
  }

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

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = {
      success: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }
}
