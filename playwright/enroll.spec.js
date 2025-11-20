const { test, expect } = require('@playwright/test');

test('enrollment page', async ({ page }) => {
  await page.goto('http://localhost:8080/enroll.html');
  await page.screenshot({ path: 'enrollment.png' });
});
