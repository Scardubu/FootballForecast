import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      // Use default React plugin configuration with automatic JSX runtime
      jsxRuntime: 'automatic'
    }),
    // Removed Replit-specific plugins for local development
    // @replit/vite-plugin-runtime-error-modal and cartographer
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true, // Force clean of the output directory on each build
    chunkSizeWarningLimit: 1000, // Increase warning limit
    sourcemap: process.env.NODE_ENV === 'development', // Source maps only in dev
    cssCodeSplit: true, // Split CSS into separate files for better caching
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    rollupOptions: {
      // Enable tree shaking
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
      },
      output: {
        // Let Vite/Rollup handle chunk splitting automatically for now
        // Improve chunk naming for better caching with stable content hashes
        chunkFileNames: `assets/[name]-[hash].js`,
        entryFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
    // Enable minification optimizations
    minify: 'esbuild',
    target: 'es2020',
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs'],
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    headers: {
      'Content-Security-Policy': process.env.NODE_ENV === 'development' 
        ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' ws: wss:;"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:;"
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
