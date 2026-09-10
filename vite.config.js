import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('three/examples') || id.includes('three/addons')) {
            return 'vendor-three';
          }
          if (id.includes('/space/engine/')) {
            return 'game-engine';
          }
          if (id.includes('/space/objects/')) {
            return 'game-objects';
          }
          if (id.includes('/space/ui/')) {
            return 'game-ui';
          }
          if (id.includes('/space/audio/')) {
            return 'game-audio';
          }
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
