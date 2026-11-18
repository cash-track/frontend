import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Node 25+ native localStorage is undefined without --localstorage-file and shadows jsdom's.
      execArgv: ['--no-experimental-webstorage'],
      exclude: [...configDefaults.exclude, 'e2e/**', 'old/**'],
      passWithNoTests: true,
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/**/__tests__/**',
          'src/**/*.d.ts',
          // Bootstrap and service-worker glue, not unit-testable
          'src/main.ts',
          'src/pwa.ts',
          // Translation dictionaries are data, not logic
          'src/lang/messages/**',
        ],
      },
    },
  }),
)
