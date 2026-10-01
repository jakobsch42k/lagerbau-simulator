import { defineConfig, devices } from '@playwright/test';

const BASIS = 'http://localhost:4173/lagerbau-simulator/';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: BASIS },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: BASIS,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
