import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        executablePath: '/usr/bin/chromium',
        launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
      },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
      port: 8000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
});
