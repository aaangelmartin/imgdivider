/**
 * ImgDivider — Image Processor
 * Core canvas operations: load, preview, split.
 */

export class ImageProcessor {
  constructor() {
    this.sourceImage = null;
    this.sourceWidth = 0;
    this.sourceHeight = 0;
    this.parts = []; // Array of { canvas, blob, name, width, height }
  }

  /**
   * Load an image from a File object
   */
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.sourceImage = img;
          this.sourceWidth = img.naturalWidth;
          this.sourceHeight = img.naturalHeight;
          resolve({ width: this.sourceWidth, height: this.sourceHeight });
        };
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Draw a preview on a canvas with guides showing the split grid
   */
  drawPreview(canvas, config) {
    if (!this.sourceImage) return;

    const ctx = canvas.getContext('2d');
    const { targetWidth, targetHeight, cols, rows, scaleMode } = config;

    // Determine actual cols/rows
    const actualCols = this.resolveCols(cols, targetWidth, targetHeight);
    const actualRows = rows === 'auto' ? 1 : rows;

    // Calculate cell dimensions
    const cellW = targetWidth || Math.floor(this.sourceWidth / actualCols);
    const cellH = targetHeight || Math.floor(this.sourceHeight / actualRows);

    // Determine preview canvas size (scale down to fit display)
    const maxPreviewWidth = Math.min(800, window.innerWidth - 60);
    const scale = Math.min(1, maxPreviewWidth / this.sourceWidth);
    const previewW = Math.floor(this.sourceWidth * scale);
    const previewH = Math.floor(this.sourceHeight * scale);

    canvas.width = previewW;
    canvas.height = previewH;
    canvas.style.width = previewW + 'px';
    canvas.style.height = previewH + 'px';

    // Clear and draw image
    ctx.clearRect(0, 0, previewW, previewH);
    ctx.drawImage(this.sourceImage, 0, 0, previewW, previewH);

    // Draw guide lines
    const guideScaleX = previewW / this.sourceWidth;
    const guideScaleY = previewH / this.sourceHeight;

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    // Vertical guides
    for (let c = 1; c < actualCols; c++) {
      const x = c * cellW * guideScaleX;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, previewH);
      ctx.stroke();
    }

    // Horizontal guides
    for (let r = 1; r < actualRows; r++) {
      const y = r * cellH * guideScaleY;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(previewW, y);
      ctx.stroke();
    }

    // Draw labels on each cell
    ctx.setLineDash([]);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < actualRows; r++) {
      for (let c = 0; c < actualCols; c++) {
        const x = c * cellW * guideScaleX;
        const y = r * cellH * guideScaleY;
        const w = cellW * guideScaleX;
        const h = cellH * guideScaleY;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`${r * actualCols + c + 1}`, centerX, centerY);
      }
    }

    return {
      originalWidth: this.sourceWidth,
      originalHeight: this.sourceHeight,
      targetWidth: cellW,
      targetHeight: cellH,
      cols: actualCols,
      rows: actualRows,
      totalParts: actualCols * actualRows
    };
  }

  /**
   * Resolve 'auto' cols for carousel mode
   */
  resolveCols(cols, targetWidth, targetHeight) {
    if (cols !== 'auto') return parseInt(cols, 10) || 1;

    // For carousel: calculate how many target-sized panels fit horizontally
    if (!targetWidth || !targetHeight) return 1;

    const imgRatio = this.sourceWidth / this.sourceHeight;
    const targetRatio = targetWidth / targetHeight;

    // If image is wider than target ratio, split it
    if (imgRatio > targetRatio) {
      const colsCount = Math.max(2, Math.round((this.sourceWidth / this.sourceHeight) * targetHeight / targetWidth));
      return colsCount;
    }
    return 1;
  }

  /**
   * Generate all split parts as canvases/blobs
   */
  async generateParts(config) {
    if (!this.sourceImage) throw new Error('No hay imagen cargada');

    const { targetWidth, targetHeight, cols, rows, scaleMode, format, quality } = config;
    const actualCols = this.resolveCols(cols, targetWidth, targetHeight);
    const actualRows = rows === 'auto' ? 1 : parseInt(rows, 10) || 1;

    const cellW = targetWidth || Math.floor(this.sourceWidth / actualCols);
    const cellH = targetHeight || Math.floor(this.sourceHeight / actualRows);

    this.parts = [];
    const total = actualCols * actualRows;

    for (let r = 0; r < actualRows; r++) {
      for (let c = 0; c < actualCols; c++) {
        const canvas = document.createElement('canvas');
        canvas.width = cellW;
        canvas.height = cellH;
        const ctx = canvas.getContext('2d');

        // Fill background (for fit mode with transparency or gaps)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cellW, cellH);

        // Calculate source crop/scale
        const sx = c * cellW;
        const sy = r * cellH;
        const sWidth = cellW;
        const sHeight = cellH;

        if (scaleMode === 'stretch') {
          // Stretch source region to fill cell exactly
          ctx.drawImage(this.sourceImage, sx, sy, sWidth, sHeight, 0, 0, cellW, cellH);
        } else if (scaleMode === 'fit') {
          // Scale to fit within cell, preserving aspect ratio, centered
          const srcRatio = sWidth / sHeight;
          const cellRatio = cellW / cellH;
          let drawW, drawH, dx, dy;

          if (srcRatio > cellRatio) {
            drawW = cellW;
            drawH = cellW / srcRatio;
            dx = 0;
            dy = (cellH - drawH) / 2;
          } else {
            drawH = cellH;
            drawW = cellH * srcRatio;
            dx = (cellW - drawW) / 2;
            dy = 0;
          }

          ctx.drawImage(this.sourceImage, sx, sy, sWidth, sHeight, dx, dy, drawW, drawH);
        } else {
          // Default: crop — draw source region directly (1:1 pixel mapping if possible)
          // But we need to handle if source region is smaller/larger than cell
          ctx.drawImage(this.sourceImage, sx, sy, sWidth, sHeight, 0, 0, cellW, cellH);
        }

        // Convert to blob
        const blob = await this.canvasToBlob(canvas, format, quality / 100);
        const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
        const name = `parte_${String(r * actualCols + c + 1).padStart(2, '0')}.${ext}`;

        this.parts.push({
          canvas,
          blob,
          name,
          width: cellW,
          height: cellH,
          index: r * actualCols + c,
          url: URL.createObjectURL(blob)
        });
      }
    }

    return this.parts;
  }

  /**
   * Convert canvas to Blob with format and quality
   */
  canvasToBlob(canvas, format, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), format, quality);
    });
  }

  /**
   * Clean up object URLs to prevent memory leaks
   */
  cleanup() {
    for (const part of this.parts) {
      if (part.url) URL.revokeObjectURL(part.url);
    }
    this.parts = [];
  }
}
