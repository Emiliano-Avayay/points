import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Usa el Chromium de Playwright ya instalado. Si la versión exacta no está descargada,
 * busca otra revisión de Chromium en la caché local (sin descargas) o PW_CHROMIUM_PATH.
 */
function localChromium(): string | undefined {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH;
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!existsSync(cache)) return undefined;
  for (const dir of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    const mac = join(cache, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    if (existsSync(mac)) return mac;
  }
  return undefined;
}

const PORT = Number(process.env.E2E_PORT ?? 4188);
const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    trace: 'off',
    launchOptions: { executablePath: localChromium() },
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
        url: BASE,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
