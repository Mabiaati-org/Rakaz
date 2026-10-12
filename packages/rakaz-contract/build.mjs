import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import * as esbuild from 'esbuild';

rmSync('dist', { recursive: true, force: true });

const shared = { entryPoints: ['src/index.ts'], bundle: true, target: 'es2022' };

await Promise.all([
  esbuild.build({ ...shared, outfile: 'dist/index.mjs', platform: 'neutral', format: 'esm' }),
  esbuild.build({ ...shared, outfile: 'dist/index.cjs', platform: 'node', format: 'cjs' }),
]);

// Type declarations for consumers that resolve the package through `exports` (rakaz-api).
execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });

console.log('built dist/index.mjs, dist/index.cjs and dist/*.d.ts');
