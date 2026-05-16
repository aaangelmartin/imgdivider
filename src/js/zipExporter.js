/**
 * ImgDivider — ZIP Exporter
 * Packages multiple image blobs into a single ZIP download.
 */

export class ZipExporter {
  constructor() {
    this.JSZip = window.JSZip;
    if (!this.JSZip) {
      throw new Error('JSZip no está disponible. Asegúrate de que jszip.min.js esté cargado.');
    }
  }

  /**
   * Create a ZIP file from an array of parts
   * @param {Array} parts — Array of { name, blob }
   * @param {string} filename — Name of the output ZIP file
   */
  async downloadZip(parts, filename = 'imgdivider_parts.zip') {
    const zip = new this.JSZip();

    for (const part of parts) {
      zip.file(part.name, part.blob);
    }

    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    this.triggerDownload(content, filename, 'application/zip');
  }

  /**
   * Download a single blob as a file
   */
  downloadSingle(blob, filename) {
    this.triggerDownload(blob, filename, blob.type || 'image/jpeg');
  }

  /**
   * Trigger browser download for a Blob
   */
  triggerDownload(blob, filename, mimeType) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
