import { defineConfig } from '@playwright/test';

/** E2E gegen das Windows-Programm (Spec D5). Kein Webserver: Electron lädt die App von der Platte. */
export default defineConfig({
  testDir: 'e2e-desktop',
  workers: 1,
  timeout: 60_000,
});
