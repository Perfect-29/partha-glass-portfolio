import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/WhatsApp Video 2026-11-19 at 3.14.20 PM.mp4'],
    },
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/@emailjs')) return 'emailjs';
          if (id.includes('node_modules/framer-motion')) return 'motion';
          if (id.includes('node_modules/react')) return 'react-vendor';
        },
      },
    },
  },
});
