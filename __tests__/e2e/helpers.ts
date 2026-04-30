/**
 * Shared helpers for Playwright E2E tests
 */
import { Page, expect } from '@playwright/test';

export const TEST_EMAIL    = process.env.TEST_EMAIL    ?? 'test-batman@lifeflow.app';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'BatmanQA2026!';
export const BASE_URL      = process.env.BASE_URL      ?? 'https://growthplayers.vercel.app';

/**
 * Log in with the test user.
 * Handles the auth screen — if already logged in, does nothing.
 */
export async function login(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Already logged in → no auth screen
  if (page.url().includes('/comando') || page.url().includes('/bienestar') || page.url().includes('/norte')) {
    return;
  }

  // Fill auth form
  const emailInput = page.locator('input[type="email"], [data-testid="email-input"]').first();
  const passInput  = page.locator('input[type="password"], [data-testid="password-input"]').first();

  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill(TEST_EMAIL);
    await passInput.fill(TEST_PASSWORD);
    await page.locator('button[type="submit"], [data-testid="login-btn"]').first().click();
    await page.waitForURL('**/comando', { timeout: 20_000 });
  }
}

/** Wait for the app shell to be visible */
export async function waitForAppReady(page: Page) {
  // The nav bar is always visible once the app is loaded
  await page.waitForSelector('[aria-label="COMANDO"], text=COMANDO', { timeout: 15_000 });
}

/** Navigate to a tab using the bottom navigation */
export async function goToTab(page: Page, tab: 'COMANDO' | 'NORTE' | 'PROGRAMA' | 'MENTOR' | 'PERFIL') {
  await page.locator(`text=${tab}`).first().click();
  await page.waitForLoadState('networkidle');
}
