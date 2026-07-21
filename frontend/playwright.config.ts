import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const backendRoot = path.resolve(__dirname, '../backend');
const backendPython = process.platform === 'win32'
  ? path.join(backendRoot, '.venv', 'Scripts', 'python.exe')
  : path.join(backendRoot, '.venv', 'bin', 'python');
const backendCommand = `"${backendPython}" -m scripts.reset_e2e_db && "${backendPython}" -m alembic upgrade head && "${backendPython}" -m scripts.seed && "${backendPython}" -m uvicorn app.main:app --host 127.0.0.1 --port 8000`;
const testDistDir = process.env.CI ? '.next' : '.next-release';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      testMatch: /accessibility/
    }
  ],
  webServer: [
    {
      command: backendCommand,
      cwd: backendRoot,
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: !process.env.CI,
      env: { DATABASE_URL: 'sqlite:///./.run/e2e.db', REMINDERS_SCHEDULER_ENABLED: 'false', DEMO_MODE: 'true', FRONTEND_URL: 'http://127.0.0.1:3000', CORS_ORIGINS: 'http://127.0.0.1:3000' }
    },
    {
      command: 'npm run start',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      env: { BACKEND_INTERNAL_URL: 'http://127.0.0.1:8000', NEXT_DIST_DIR: testDistDir }
    }
  ]
});
