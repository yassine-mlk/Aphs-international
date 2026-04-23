import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Polyfills pour Node.js modules dans le navigateur
      buffer: "buffer",
      events: "events",
      stream: "stream-browserify",
      util: path.resolve(__dirname, "./src/lib/util-polyfill.ts"),
      crypto: "crypto-browserify",
    },
  },
  define: {
    // Polyfills pour SimplePeer et les modules Node.js
    global: 'globalThis',
    'process.env': {},
    process: { 
      env: { NODE_DEBUG: false },
      nextTick: (fn: any) => setTimeout(fn, 0),
      browser: true
    },
  },
  optimizeDeps: {
    // Forcer la pré-compilation de ces dépendances
    include: [
      'simple-peer', 
      'socket.io-client', 
      'buffer',
      'events',
      'stream-browserify',
      'crypto-browserify'
    ]
  }
}));
