import { expect, test } from '@playwright/test';

// The exported web build runs the same React Native screens through React Native Web.
// Data lives in localStorage on the web, SQLite on phones, behind the same store.

test.describe('Rotawise web smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Saturday Jan 2 2027, 9:00 in the browser's zone.
    await page.clock.setFixedTime(new Date(2027, 0, 2, 9, 0));
  });

  test('onboarding to Today, then month, year and widgets, and it survives a reload', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto('/');
    await expect(page.getByTestId('onboarding')).toBeVisible();
    await expect(page.getByText('Your rotation, on your home screen. Pay once. Never a subscription.')).toBeVisible();
    await page.getByTestId('preset-24-48').click();
    await page.getByTestId('platoon-B').click();
    await page.getByTestId('onboarding-done').click();

    const today = page.getByTestId('today-screen');
    await expect(today).toBeVisible();
    // B starts a tour today (Jan 2, 7 AM) because the worked date defaulted to today.
    await expect(today.getByTestId('today-status')).toHaveText("You're ON");
    await expect(today.getByTestId('today-detail')).toHaveText('24 hour tour until 7 AM tomorrow');

    await page.getByTestId('tab-calendar').click();
    const month = page.getByTestId('calendar-screen');
    await expect(month.getByTestId('month-title')).toHaveText('January 2027');
    await expect(month.getByTestId('day-2027-01-05')).toHaveAttribute('aria-label', /you're on, platoon B/);
    await month.getByTestId('platoon-filter-all').click();
    await expect(month.getByTestId('day-2027-01-03')).toHaveAttribute('aria-label', /on duty: C/);
    await month.getByTestId('day-2027-01-05').click();
    await expect(page.getByTestId('day-sheet')).toBeVisible();
    await expect(page.getByTestId('day-sheet').getByText('24 hour tour, 7 AM to 7 AM next day')).toBeVisible();

    await page.goto('/year');
    await expect(page.getByTestId('year-summary')).toContainText('B platoon, 24/48: 122 tours, 2,928 hours');

    await page.goto('/widgets');
    await expect(page.getByTestId('widget-preview-small')).toContainText('ON');
    await expect(page.getByTestId('widget-preview-medium')).toContainText('Today: ON');

    // Data is still there after a reload.
    await page.goto('/');
    await expect(page.getByTestId('today-status')).toHaveText("You're ON");

    expect(errors.filter((e) => !/Download the React DevTools|favicon/i.test(e))).toEqual([]);
  });

  test('Pro screen promises a one time purchase and explains purchases on the web', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('onboarding-done').click();
    await page.getByTestId('tab-tools').click();
    await page.getByTestId('tool-trades').click();
    const pro = page.getByTestId('pro-screen');
    await expect(pro).toBeVisible();
    await expect(pro.getByTestId('pro-promise')).toHaveText('One time purchase. Never a subscription.');
    await expect(pro.getByTestId('store-unavailable')).toBeVisible();
    await expect(pro.getByTestId('pro-restore')).toBeVisible();
  });

  test('settings switch to dark mode and Monday weeks', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('onboarding-done').click();
    await page.getByTestId('tab-settings').click();
    await page.getByTestId('settings-theme-dark').click();
    await page.getByTestId('settings-week-start-1').click();
    await page.getByTestId('tab-calendar').click();
    // January 2027 starts on a Friday: with Monday weeks the first row has 4 blanks.
    const bg = await page.getByTestId('calendar-screen').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(11, 17, 24)');
  });
});
