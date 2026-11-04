import { test, expect } from '@playwright/test';

test('article images, theme toggle, copy button and narrow layouts', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/blog/tmux-sessionizer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('From a Folder Picker to a tmux Workspace Switcher');
  const firstBlock = page.locator('.expressive-code').first();
  const copyButton = firstBlock.getByRole('button', { name: 'Copy to clipboard', exact: true });
  await firstBlock.hover();
  await expect(copyButton).toBeVisible();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await copyButton.click();
  await expect(firstBlock.locator('.feedback')).toHaveText('Copied!');
  const codeLines = await firstBlock.locator('.ec-line .code').allTextContents();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(codeLines.join('\n'));
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
    if (width === 390) {
      await expect(page.locator('.post-rail')).toBeHidden();
      await page.locator('.toc-inline summary').click();
      await expect(page.locator('.toc-inline a').first()).toBeVisible();
    } else {
      await expect(page.locator('.post-rail')).toBeVisible();
      await expect(page.locator('.post-toc-inline')).toBeHidden();
    }
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

test('homepage discovery and article endings work with keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  const selected = page.getByRole('region', { name: 'Start here: selected writing' });
  const article = selected.getByRole('heading', { level: 3 }).first().getByRole('link');
  // Tab through the real document order, rather than programmatically focusing.
  for (let attempts = 0; attempts < 20 && !await article.evaluate(element => element === document.activeElement); attempts++) {
    await page.keyboard.press('Tab');
  }
  await expect(article).toBeFocused();
  await page.keyboard.press('Enter');
  const related = page.getByRole('region', { name: 'Keep reading' });
  await expect(related.getByRole('heading', { level: 3 })).toHaveCount(2);
  await expect(page.locator('.post-footer').getByRole('link', { name: 'Subscribe via Atom' })).toHaveAttribute('href', '/atom.xml');
  const next = related.getByRole('heading', { level: 3 }).first().getByRole('link');
  const destination = await next.getAttribute('href');
  await next.focus();
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(destination!);
});

test('homepage and article footer fit narrow screens in both themes', async ({ page }) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/blog/tmux-sessionizer/']) {
      await page.goto(route);
      for (let theme = 0; theme < 2; theme++) {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (route === '/') {
          const selectedSize = await page.locator('#selected-heading').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
          const latestSize = await page.locator('#latest-heading').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
          expect(selectedSize).toBe(latestSize);
          for (const heading of ['#selected-heading', '#latest-heading']) {
            await expect(page.locator(heading)).toHaveCSS('border-inline-start-width', '3px');
          }
        }
        await page.locator('#theme-toggle').click();
      }
    }
  }
});

test('content and navigation work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.getByRole('region', { name: 'Start here: selected writing' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Tags', exact: true }).click();
  await page.getByRole('link', { name: 'tmux', exact: true }).click();
  await page.getByRole('heading', { name: 'From a Folder Picker to a tmux Workspace Switcher' }).getByRole('link').click();
  await expect(page.locator('.prose')).toContainText('canonical_path()');
  await expect(page.getByRole('region', { name: 'Keep reading' })).toBeVisible();
  await expect(page.locator('.post-footer').getByRole('link', { name: 'Subscribe via Atom' })).toHaveAttribute('href', '/atom.xml');
  await expect(page.locator('#theme-toggle')).toBeHidden();
  await context.close();
});
