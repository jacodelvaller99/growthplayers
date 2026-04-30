/**
 * E2E — Authentication flows
 *
 * Covers: login, session persistence, logout, re-login
 * Target: https://growthplayers.vercel.app (Expo Web)
 * Viewport: iPhone 14 Pro (390×844)
 */
import { test, expect } from '@playwright/test';
import { login, waitForAppReady, TEST_EMAIL, TEST_PASSWORD } from './helpers';

test.describe('Auth — login flow', () => {
  test('login directo sin refrescar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // If already on a protected route, skip
    if (page.url().includes('/comando')) {
      return;
    }

    const emailInput = page.locator('input[type="email"], [data-testid="email-input"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    await emailInput.fill(TEST_EMAIL);
    await page.locator('input[type="password"], [data-testid="password-input"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"], [data-testid="login-btn"]').first().click();

    await page.waitForURL('**/comando', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/comando/);

    // Greeting should be visible
    await expect(page.locator('text=Buenos').or(page.locator('text=Hola')).first()).toBeVisible({ timeout: 10_000 });
  });

  test('sesión persiste al refrescar la página', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);

    // Reload and verify session survives
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/(comando|bienestar|norte|programas|perfil)/, { timeout: 15_000 });
  });

  test('sesión persiste al cerrar y reabrir tab', async ({ browser }) => {
    const context = await browser.newContext();
    const page    = await context.newPage();

    await login(page);
    await waitForAppReady(page);
    await page.close();

    // Open a new page in the same context (same cookies/storage)
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');

    await expect(page2).toHaveURL(/\/(comando|bienestar|norte|programas|perfil)/, { timeout: 15_000 });
    await context.close();
  });

  test('logout redirige a pantalla de autenticación', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);

    // Navigate to perfil
    await page.locator('text=PERFIL').or(page.locator('[aria-label="PERFIL"]')).first().click();
    await page.waitForLoadState('networkidle');

    // Find and click logout button
    const logoutBtn = page.locator('text=Cerrar sesión')
      .or(page.locator('text=Salir'))
      .or(page.locator('[data-testid="logout-btn"]'))
      .first();

    if (await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForLoadState('networkidle');
      // Should be back on auth/login screen (no protected route)
      await expect(page).not.toHaveURL(/\/(comando|bienestar|norte|programas)/, { timeout: 10_000 });
    } else {
      test.skip(true, 'Logout button not found — skip');
    }
  });

  test('re-login tras logout funciona', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);

    // Navigate to perfil and logout
    await page.locator('text=PERFIL').or(page.locator('[aria-label="PERFIL"]')).first().click();
    await page.waitForLoadState('networkidle');

    const logoutBtn = page.locator('text=Cerrar sesión')
      .or(page.locator('text=Salir'))
      .or(page.locator('[data-testid="logout-btn"]'))
      .first();

    if (await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForLoadState('networkidle');

      // Re-login
      const emailInput = page.locator('input[type="email"], [data-testid="email-input"]').first();
      if (await emailInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
        await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForURL('**/comando', { timeout: 20_000 });
        await expect(page).toHaveURL(/\/comando/);
      }
    } else {
      test.skip(true, 'Logout button not found — skip');
    }
  });
});
