import { test, expect } from '@playwright/test';

test('article images, theme toggle, copy button and narrow layouts', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/blog/tmux-sessionizer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('From a Folder Picker to a tmux Workspace Switcher');
  const copyButton = page.getByRole('button', { name: 'Copy code to clipboard' }).first();
  await expect(copyButton).toBeVisible();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await copyButton.click();
  await expect(copyButton).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.locator('.prose pre code').first().textContent());
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', theme!);
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', theme!);
  await expect(page.locator('.prose img')).toBeVisible();
  expect(await page.locator('.prose img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('search finds both tmux articles under the production CSP', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/search/');
  await page.getByRole('textbox', { name: /search/i }).fill('tmux');
  await expect(page.locator('#search a[href="/blog/tmux-sessionizer/"]').first()).toBeVisible();
  await expect(page.locator('#search a[href="/blog/tmux-not-a-terminal/"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('content and navigation work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Tags', exact: true }).click();
  await page.getByRole('link', { name: 'tmux', exact: true }).click();
  await page.getByRole('heading', { name: 'From a Folder Picker to a tmux Workspace Switcher' }).getByRole('link').click();
  await expect(page.locator('.prose')).toContainText('canonical_path()');
  await expect(page.locator('#theme-toggle')).toBeHidden();
  await context.close();
});
