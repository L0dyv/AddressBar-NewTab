import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
          transform: (content) => {
            const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
            const manifest = JSON.parse(content.toString());
            manifest.version = pkg.version;
            return JSON.stringify(manifest, null, 2);
          }
        },
        { src: 'public/favicon.ico', dest: '.' },
        { src: 'background.js', dest: '.' }
      ]
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        popup: path.resolve(__dirname, 'popup.html')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'popup' ? 'popup.js' : '[name]-[hash].js';
        }
      }
    }
  }
}));
