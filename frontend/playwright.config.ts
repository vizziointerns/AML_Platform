import { defineConfig } from '@playwright/test'

export default defineConfig({
	webServer: {
		command: 'pnpm exec vite dev --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		env: {
			...process.env,
			DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test',
			BETTER_AUTH_SECRET:
				process.env.BETTER_AUTH_SECRET ??
				'dev-test-secret-please-change-in-production-64-chars-min',
			ORIGIN: process.env.ORIGIN ?? 'http://localhost:4173'
		}
	},
	testMatch: '**/*.e2e.{ts,js}',
	use: {
		baseURL: 'http://localhost:4173'
	}
})
