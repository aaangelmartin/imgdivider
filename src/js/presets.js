/**
 * ImgDivider — Preset System
 * All pre-defined split configurations.
 */

export const PRESETS = [
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    description: 'Post cuadrado/alargado',
    badge: 'Popular',
    targetWidth: 1080,
    targetHeight: 1350,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 92,
    category: 'social'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    description: 'Historia/Reel vertical',
    badge: 'Popular',
    targetWidth: 1080,
    targetHeight: 1920,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 92,
    category: 'social'
  },
  {
    id: 'instagram-carousel',
    name: 'IG Carousel',
    description: 'Divide imagen ancha en posts',
    badge: 'Smart',
    targetWidth: 1080,
    targetHeight: 1350,
    cols: 'auto',
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 92,
    category: 'social',
    autoCols: true // Special flag: calculate cols based on image aspect ratio
  },
  {
    id: 'pinterest-pin',
    name: 'Pinterest Pin',
    description: 'Pin vertical optimizado',
    targetWidth: 1000,
    targetHeight: 1500,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'social'
  },
  {
    id: 'twitter-post',
    name: 'X / Twitter',
    description: 'Post horizontal',
    targetWidth: 1600,
    targetHeight: 900,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'social'
  },
  {
    id: 'youtube-thumb',
    name: 'YouTube Thumb',
    description: 'Miniatura de video',
    targetWidth: 1280,
    targetHeight: 720,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 92,
    category: 'social'
  },
  {
    id: 'facebook-cover',
    name: 'Facebook Cover',
    description: 'Portada de página',
    targetWidth: 820,
    targetHeight: 312,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'social'
  },
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post',
    description: 'Post profesional',
    targetWidth: 1200,
    targetHeight: 627,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'social'
  },
  {
    id: 'a4-print',
    name: 'A4 Print',
    description: 'Hoja A4 a 300dpi',
    targetWidth: 2480,
    targetHeight: 3508,
    cols: 1,
    rows: 1,
    scaleMode: 'fit',
    format: 'image/png',
    quality: 100,
    category: 'print'
  },
  {
    id: 'grid-2x2',
    name: 'Grid 2×2',
    description: '4 partes iguales',
    targetWidth: null,
    targetHeight: null,
    cols: 2,
    rows: 2,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'grid'
  },
  {
    id: 'grid-3x3',
    name: 'Grid 3×3',
    description: '9 partes iguales',
    targetWidth: null,
    targetHeight: null,
    cols: 3,
    rows: 3,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'grid'
  },
  {
    id: 'grid-4x4',
    name: 'Grid 4×4',
    description: '16 partes iguales',
    targetWidth: null,
    targetHeight: null,
    cols: 4,
    rows: 4,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'grid'
  },
  {
    id: 'custom',
    name: 'Personalizado',
    description: 'Define todo manualmente',
    targetWidth: 1080,
    targetHeight: 1350,
    cols: 1,
    rows: 1,
    scaleMode: 'crop',
    format: 'image/jpeg',
    quality: 90,
    category: 'custom'
  }
];

/**
 * Get preset by ID
 */
export function getPreset(id) {
  return PRESETS.find(p => p.id === id);
}

/**
 * Get all presets grouped by category
 */
export function getPresetsByCategory() {
  const groups = {};
  for (const preset of PRESETS) {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(preset);
  }
  return groups;
}
