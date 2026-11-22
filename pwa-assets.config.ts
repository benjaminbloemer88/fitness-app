import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Erzeugt aus public/logo.svg alle Icon-Größen (npm run icons).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0f1115' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0f1115' } },
  },
  images: ['public/logo.svg'],
});
