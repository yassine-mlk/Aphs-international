import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
      events: "events",
      stream: "stream-browserify",
      util: path.resolve(__dirname, "./src/lib/util-polyfill.ts"),
      crypto: "crypto-browserify",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
          ],
          'vendor-livekit': ['livekit-client', '@livekit/components-react'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    process: { 
      env: { NODE_DEBUG: false },
      nextTick: (fn: any) => setTimeout(fn, 0),
      browser: true
    },
  },
  optimizeDeps: {
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
