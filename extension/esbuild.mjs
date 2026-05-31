/**
 * Bundles the extension and the shared core into a single CommonJS file that the
 * VS Code / Windsurf extension host loads (`dist/extension.cjs`). `vscode` is
 * provided by the host and `js-tiktoken` is an optional runtime dependency, so
 * both are kept external.
 */

import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(dir, 'src', 'extension.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: path.join(dir, 'dist', 'extension.cjs'),
  external: ['vscode', 'js-tiktoken'],
  loader: { '.json': 'json' },
  sourcemap: false,
  logLevel: 'info',
});

console.log('Built extension/dist/extension.cjs');
