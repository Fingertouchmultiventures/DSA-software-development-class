const { defineConfig, devices } = require('@playwright/test');

const port = Number(process.env.LCRM_TEST_PORT) || 8877;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }
  },
  webServer: {
    command: 'node relay/server.js',
    url: `http://127.0.0.1:${port}/relay-status`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: { PORT: String(port), HOST: '127.0.0.1' }
  }
});
