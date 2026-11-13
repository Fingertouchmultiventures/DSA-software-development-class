const { test, expect } = require('@playwright/test');
const { mockFirebase } = require('./firebase-mock');

test('main operator and viewer pages render in local mode', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const routes = [
    ['/control.html?local=1', 'LCRM Control Room'],
    ['/cam.html?local=1', 'LCRM Camera'],
    ['/tv.html?local=1', 'LCRM TV Screen'],
    ['/studio.html?local=1', 'LCRM Photo Studio'],
    ['/watch.html?local=1', 'Watch live - LOVE OF CHRIST ASSEMBLY']
  ];

  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
  }
  expect(errors).toEqual([]);
});

test('Firebase pages require sign-in and keep credentials out of app storage', async ({ page }) => {
  await mockFirebase(page);
  await page.goto('/control.html');
  const dialog = page.locator('#lcrmAuth');
  await expect(dialog).toBeVisible();
  await page.locator('#lcrmEmail').fill('operator@example.test');
  await page.locator('#lcrmPassword').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');

  await page.locator('#lcrmPassword').fill('church-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#lcrmAccount')).toBeVisible();
  await expect(page.locator('#netText')).toContainText('Online');

  const state = await page.evaluate(() => ({
    scripts: window.__firebaseMock.scripts,
    emails: window.__firebaseMock.signInEmails,
    storedCredential: Object.values(localStorage).some(value => String(value).includes('church-password'))
  }));
  expect(state.scripts).toContain('auth');
  expect(state.emails).toEqual(['operator@example.test']);
  expect(state.storedCredential).toBe(false);

  page.on('dialog', dialog => dialog.accept());
  await page.locator('#lcrmAccount').click();
  await expect(page).toHaveURL(/\/index\.html$/);
});

test('missing Firebase Web app config fails with setup guidance', async ({ page }) => {
  await page.route('**/config.js', async route => {
    const response = await route.fetch();
    return route.fulfill({ response, body: (await response.text()) + '\nwindow.LCRM_CONFIG.firebaseAuth.apiKey = "";' });
  });
  await page.goto('/control.html');
  await expect(page.locator('#toast')).toContainText('Add the Firebase Web app apiKey, authDomain, and projectId');
  await expect(page.locator('#lcrmAuth')).toHaveCount(0);
});

test('public watch reads public state without requiring a church account', async ({ page }) => {
  await mockFirebase(page);
  await page.goto('/watch.html');
  await expect(page.locator('#st')).toContainText('Welcome!');
  await expect(page.locator('#lcrmAuth')).toHaveCount(0);
  const state = await page.evaluate(() => window.__firebaseMock);
  expect(state.scripts).not.toContain('auth');
  expect(state.paths).toEqual(['rooms/lcrmchurch_public/hls', 'rooms/lcrmchurch_public/live']);
  expect(state.signInEmails).toEqual([]);
});
