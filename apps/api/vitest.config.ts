import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * NestJS resolves constructor dependencies from `emitDecoratorMetadata`, which
 * esbuild — Vitest's default transformer — does not implement. Without SWC here
 * every injected dependency arrives as `undefined`, and the failures then look
 * like logic bugs rather than a missing transform.
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
