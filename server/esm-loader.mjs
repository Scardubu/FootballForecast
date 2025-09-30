import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

/**
 * ESM loader to resolve path aliases at runtime for compiled code.
 * Currently maps '@shared/*' to 'dist/shared/*.js'.
 */
export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@shared/')) {
    const sub = specifier.slice(9);
    const base = path.join(process.cwd(), 'dist', 'shared', sub);
    const candidates = [
      `${base}.js`,
      path.join(base, 'index.js'),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        return { url: pathToFileURL(file).href, shortCircuit: true };
      }
    }
    // Fall through if not found; default loader will throw useful error
  }
  return defaultResolve(specifier, context, defaultResolve);
}
