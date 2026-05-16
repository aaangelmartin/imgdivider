/**
 * ImgDivider — Image Processor
 * Core canvas operations: load, preview, split.
 */

export class ImageProcessor {
  constructor() {
    this.sourceImage = null;
    this.sourceWidth = 0;
    this.sourceHeight = 0;
    this.parts = [];
  }

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
   * Draw preview with split guides.
   * Renders the ORIGINAL image at full resolution, then the canvas is CSS-scaled down.
   * This preserves 100% quality for the actual split later.
   */
  drawPreview(canvas, config) {
    if (!this.sourceImage) return null;

    const ctx = canvas.getContext('2d');
    const { targetWidth, targetHeight, cols, rows } = config;

    const actualCols = this.resolveCols(cols, targetWidth, targetHeight);
    const actualRows = parseInt(rows, 10) || 1;

    // Use source dimensions as canvas size for 1:1 pixel mapping
    const canvasW = this.sourceWidth;
    const canvasH = this.sourceHeight;

    if (canvas.width !== canvasW || canvas.height !== canvasH) {
      canvas.width = canvasW;
      canvas.height = canvasH;
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw original image
    ctx.drawImage(this.sourceImage, 0, 0);

    // Determine cell dimensions in source pixels
    let cellW, cellH;
    if (targetWidth && targetHeight) {
      cellW = targetWidth;
      cellH = targetHeight;
    } else {
      cellW = Math.floor(canvasW / actualCols);
      cellH = Math.floor(canvasH / actualRows);
    }

    // Draw guide lines with glow effect
    ctx.save();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)';
    ctx.lineWidth = Math.max(2, Math.floor(canvasW / 800));
    ctx.setLineDash([Math.floor(canvasW / 120), Math.floor(canvasW / 180)]);
    ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
    ctx.shadowBlur = 8;

    // Vertical guides
    for (let c = 1; c < actualCols; c++) {
      const x = c * cellW;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    }
    // Horizontal guides
    for (let r = 1; r < actualRows; r++) {
      const y = r * cellH;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }

    ctx.restore();

    // Draw cell labels
    ctx.font = `bold ${Math.max(14, Math.floor(canvasW / 60))}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    for (let r = 0; r < actualRows; r++) {
      for (let c = 0; c < actualCols; c++) {
        const x = c * cellW;
        const y = r * cellH;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(`${r * actualCols + c + 1}`, cx, cy);
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

  resolveCols(cols, targetWidth, targetHeight) {
    if (String(cols) !== 'auto') return parseInt(cols, 10) || 1;
    if (!targetWidth || !targetHeight) return 1;

    const imgRatio = this.sourceWidth / this.sourceHeight;
    const targetRatio = targetWidth / targetHeight;

    if (imgRatio > targetRatio) {
      return Math.max(2, Math.round((this.sourceWidth / this.sourceHeight) * targetHeight / targetWidth));
    }
    return 1;
  }

  /**
   * Generate parts at FULL source resolution (100% quality preservation).
   * Only compress at the final blob conversion step based on user format/quality.
   */
  async generateParts(config) {
    if (!this.sourceImage) throw new Error('No hay imagen cargada');

    const { targetWidth, targetHeight, cols, rows, scaleMode, format, quality } = config;
    const actualCols = this.resolveCols(cols, targetWidth, targetHeight);
    const actualRows = parseInt(rows, 10) || 1;

    let cellW, cellH;
    if (targetWidth && targetHeight) {
      cellW = targetWidth;
      cellH = targetHeight;
    } else {
      cellW = Math.floor(this.sourceWidth / actualCols);
      cellH = Math.floor(this.sourceHeight / actualRows);
    }

    this.parts = [];

    for (let r = 0; r < actualRows; r++) {
      for (let c = 0; c < actualCols; c++) {
        const canvas = document.createElement('canvas');
        canvas.width = cellW;
        canvas.height = cellH;
        const ctx = canvas.getContext('2d');

        // White background for fit mode gaps
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cellW, cellH);

        const sx = c * cellW;
        const sy = r * cellH;

        if (scaleMode === 'stretch') {
          // Map exact source region to cell (may sample subpixels, sharp)
          ctx.drawImage(this.sourceImage, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
        } else if (scaleMode === 'fit') {
          const srcRatio = cellW / cellH;
          const cellRatio = cellW / cellH;
          let drawW, drawH, dx, dy;

          // Source region might be larger/smaller depending on original
          const sourceRegionW = cellW;
          const sourceRegionH = cellH;
          const regionRatio = sourceRegionW / sourceRegionH;

          if (regionRatio > cellRatio) {
            drawW = cellW;
            drawH = cellW / regionRatio;
            dx = 0;
            dy = (cellH - drawH) / 2;
          } else {
            drawH = cellH;
            drawW = cellH * regionRatio;
            dx = (cellW - drawW) / 2;
            dy = 0;
          }

          ctx.drawImage(this.sourceImage, sx, sy, sourceRegionW, sourceRegionH, dx, dy, drawW, drawH);
        } else {
          // crop — exact 1:1 mapping of source pixels to cell
          ctx.drawImage(this.sourceImage, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
        }

        // Convert to blob with user-chosen format/quality
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

  canvasToBlob(canvas, format, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), format, quality);
    });
  }

  cleanup() {
    for (const part of this.parts) {
      if (part.url) URL.revokeObjectURL(part.url);
    }
    this.parts = [];
  }
}
