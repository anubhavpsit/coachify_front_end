/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, transformWithEsbuild, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const themeEngine = fileURLToPath(new URL('./src/theme/engine.ts', import.meta.url))

/**
 * Inlines src/theme/engine.ts into <head> and runs bootTheme() before first
 * paint, so the cached tenant colour / dark mode never flash in late.
 * Same file the app imports — one implementation.
 */
function themePreloadPlugin(): Plugin {
  return {
    name: 'coachify-theme-preload',
    async transformIndexHtml() {
      const { code } = await transformWithEsbuild(readFileSync(themeEngine, 'utf8'), themeEngine, {
        format: 'iife',
        globalName: '__coachifyTheme',
        minify: true,
        target: 'es2018',
      })
      return [
        {
          tag: 'script',
          children: `${code};__coachifyTheme.bootTheme();`,
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    allowedHosts: [
      'howk.coachify.local',
      'elite.coachify.local',
      'rrclasses.coachify.local',
      '*.coachify.local'     // optional wildcard
    ]
  },
  plugins: [react(), tailwindcss(), themePreloadPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
