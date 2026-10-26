import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const projectDirectory = fileURLToPath(new URL('.', import.meta.url));

export function buildApp() {
  return build({
    entryPoints: ['src/main.jsx'],
    bundle: true,
    outfile: 'app.js',
    jsx: 'automatic',
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    absWorkingDir: projectDirectory,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildApp();
}
