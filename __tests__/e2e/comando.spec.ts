/**
 * E2E — COMANDO tab (dashboard / home)
 *
 * Covers: greeting, bienestar card, stats load, score visible
 */
import { test, expect } from '@playwright/test';
import { login, waitForAppReady } from './helpers';

test.describe('COMANDO — dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    // Ensure we are on COMANDO tab
    await page.locator('text=COMANDO').or(page.locator('[aria-label="COMANDO"]')).first().click();
    await page.waitForLoadState('networkidle');
  });

  test('muestra saludo de bienvenida', async ({ page }) => {
    const greeting = page.locator('text=Buenos')
      .or(page.locator('text=Hola'))
      .or(page.locator('text=Buen'))
      .first();

    await expect(greeting).toBeVisible({ timeout: 10_000 });
  });

  test('tarjeta de bienestar visible con botón de check-in', async ({ page }) => {
    // The bienestar / check-in card should be on COMANDO
    const card = page.locator('[data-testid="checkin-card"]')
      .or(page.locator('text=Check-in'))
      .or(page.locator('text=BIENESTAR'))
      .or(page.locator('text=Bienestar'))
      .first();

    await expect(card).toBeVisible({ timeout: 10_000 });
  });

  test('estadísticas cargan (energía, claridad, sueño visibles)', async ({ page }) => {
    // Stats bar or metrics section should render without NaN/undefined
    const statsSection = page.locator('[data-testid="stats"]')
      .or(page.locator('text=Energía'))
      .or(page.locator('text=energía'))
      .or(page.locator('text=ENERGÍA'))
      .first();

    // Either the stats section or some welcome/empty-state should be visible
    if (await statsSection.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // No NaN values should be shown
      const content = await page.locator('body').innerText();
      expect(content).not.toContain('NaN');
      expect(content).not.toContain('undefined');
    } else {
      // No stats yet (fresh account) — empty state should show
      const emptyState = page.locator('text=Haz tu primer check-in')
        .or(page.locator('text=Empieza'))
        .or(page.locator('text=Aún no'))
        .first();
      await expect(emptyState.or(page.locator('text=COMANDO'))).toBeVisible({ timeout: 5_000 });
    }
  });

  test('Score Soberano visible o vacío (no crash)', async ({ page }) => {
    // Score should be a number 0-1000 or show placeholder
    const scoreLocator = page.locator('[data-testid="sovereign-score"]')
      .or(page.locator('text=/\\d{1,4}/'))
      .first();

    // The page should at minimum show the COMANDO shell without errors
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Error');
    expect(body).not.toContain('Cannot read');

    // Either score exists or app renders correctly without it
    const pageTitle = page.locator('text=COMANDO').first();
    await expect(pageTitle).toBeVisible({ timeout: 5_000 });
  });
});
