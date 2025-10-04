import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  console.log('Starting build...');
  const result = await build({
    root: path.resolve(__dirname, 'client'),
    plugins: [react({ jsxRuntime: 'automatic' })],
    build: {
      outDir: path.resolve(__dirname, 'dist/test-public'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'client/index.html')
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
      },
    },
  });
  console.log('Build completed!');
  console.log('Result:', result);
} catch (error) {
  console.error('Build failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
