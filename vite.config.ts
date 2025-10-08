import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "client/index.html"),
      output: {
        // Critical fix: Bundle ALL React-dependent code together
        // to prevent load order issues and circular dependency errors
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // CRITICAL: Bundle recharts WITH React to avoid circular dependency errors
            // Recharts has internal circular dependencies that break when code-split separately
            // "Cannot access 'A' before initialization" error occurs when recharts is isolated
            if (id.includes('react') || 
                id.includes('scheduler') ||
                id.includes('recharts') ||
                id.includes('react-smooth') ||
                id.includes('recharts-scale') ||
                id.includes('victory-vendor') ||
                id.includes('@tanstack/react-query') ||
                id.includes('wouter') ||
                id.includes('zustand') ||
                id.includes('@radix-ui') ||
                id.includes('lucide-react') ||
                id.includes('framer-motion') ||
                id.includes('cmdk') ||
                id.includes('vaul') ||
                id.includes('embla-carousel') ||
                id.includes('react-hook-form') ||
                id.includes('react-day-picker') ||
                id.includes('axios') ||
                id.includes('@hookform/') ||
                id.includes('react-resizable-panels')) {
              return 'vendor-react';
            }
            
            // Only pure utilities that NEVER import React
            if (id.includes('date-fns') ||
                id.includes('clsx') ||
                id.includes('tailwind-merge') ||
                id.includes('class-variance-authority') ||
                id.includes('zod')) {
              return 'vendor-utils';
            }
            
            // Let Vite handle remaining dependencies automatically
          }
        },
        // Optimize asset file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Enable minification optimizations
    minify: 'esbuild',
    target: 'es2020',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs'],
      transformMixedEsModules: true
    },
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    exclude: [],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        path.resolve(__dirname, "client"),
        path.resolve(__dirname, "node_modules"),
        path.resolve(__dirname)
      ],
    },
    headers: {
      // CSP for development server - permissive to allow HMR and third-party libraries
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' ws: wss:; base-uri 'self'; form-action 'self';"
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
