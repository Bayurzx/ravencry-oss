import { spawnSync } from 'node:child_process'
import { createSerwistRoute } from '@serwist/turbopack'

// A revision versions the precached /~offline page so a stale copy
// is never served after a deploy. Falls back to a random UUID when
// git metadata is unavailable (e.g. some CI/build environments).
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: '/~offline', revision }],
    swSrc: 'app/sw.ts',
    // Uses the native esbuild binary (approved via pnpm rebuild).
    // Set to false to fall back to esbuild-wasm if the binary is missing.
    useNativeEsbuild: true,
  })
