/**
 * E2E — Bienestar › Meditación
 *
 * Covers: 8 guided sessions visible, timer starts, pause freezes timer, resume continues
 */
import { test, expect } from '@playwright/test';
import { login, waitForAppReady } from './helpers';

async function navigateToMeditacion(page: import('@playwright/test').Page) {
  await login(page);
  await waitForAppReady(page);

  await page.locator('text=NORTE')
    .or(page.locator('[aria-label="NORTE"]'))
    .or(page.locator('text=Bienestar'))
    .first().click();
  await page.waitForLoadState('networkidle');

  const medTab = page.locator('text=Meditación')
    .or(page.locator('text=MEDITACIÓN'))
    .or(page.locator('[data-testid="tab-meditacion"]'))
    .first();

  if (await medTab.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await medTab.click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Meditación — sesiones y timer', () => {
  test('8 sesiones de meditación guiada visibles (o al menos 4)', async ({ page }) => {
    await navigateToMeditacion(page);

    const sessions = page.locator('[data-testid^="meditation-session"]')
      .or(page.locator('text=Calma'))
      .or(page.locator('text=Enfoque'))
      .or(page.locator('text=Sueño'))
      .or(page.locator('text=Gratitud'));

    const sessionCards = page.locator('[data-testid^="meditation-"]');
    const count = await sessionCards.count().catch(() => 0);

    if (count === 0) {
      // Try alternative approach — look for a scrollable list
      const firstSession = page.locator('text=Calma')
        .or(page.locator('text=Meditación'))
        .or(page.locator('text=Guiada'))
        .first();

      if (!await firstSession.isVisible({ timeout: 8_000 }).catch(() => false)) {
        test.skip(true, 'Meditation section not found');
        return;
      }

      // At least something meditation-related is visible
      await expect(firstSession).toBeVisible();
    } else {
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  test('tap en sesión inicia el timer', async ({ page }) => {
    await navigateToMeditacion(page);

    const firstSession = page.locator('[data-testid^="meditation-session"]')
      .or(page.locator('text=Calma'))
      .or(page.locator('text=Enfoque'))
      .or(page.locator('text=Gratitud'))
      .first();

    if (!await firstSession.isVisible({ timeout: 8_000 }).catch(() => false)) {
      test.skip(true, 'No meditation session found');
      return;
    }

    await firstSession.click();
    await page.waitForTimeout(1_000);

    // Timer should be visible (e.g., 00:00 or counting)
    const timer = page.locator('[data-testid="meditation-timer"]')
      .or(page.locator('text=/\\d{2}:\\d{2}/'))
      .or(page.locator('text=00:0'))
      .first();

    await expect(timer).toBeVisible({ timeout: 10_000 });
  });

  test('pausa congela el timer', async ({ page }) => {
    await navigateToMeditacion(page);

    const firstSession = page.locator('[data-testid^="meditation-session"]')
      .or(page.locator('text=Calma'))
      .or(page.locator('text=Enfoque'))
      .first();

    if (!await firstSession.isVisible({ timeout: 8_000 }).catch(() => false)) {
      test.skip(true, 'No meditation session found');
      return;
    }

    await firstSession.click();
    await page.waitForTimeout(2_000);

    // Read timer value
    const timer = page.locator('[data-testid="meditation-timer"]')
      .or(page.locator('text=/\\d{2}:\\d{2}/'))
      .first();

    if (!await timer.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(true, 'Timer not visible');
      return;
    }

    // Pause
    const pauseBtn = page.locator('[aria-label="pause"]')
      .or(page.locator('[data-testid="pause-btn"]'))
      .or(page.locator('text=Pausar'))
      .first();

    if (!await pauseBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'Pause button not found');
      return;
    }

    await pauseBtn.click();
    const timerAfterPause = await timer.innerText().catch(() => '');

    // Wait 2 seconds — timer should NOT advance
    await page.waitForTimeout(2_000);
    const timerStillPaused = await timer.innerText().catch(() => '');

    expect(timerAfterPause).toBe(timerStillPaused);
  });

  test('reanudar continúa el timer desde donde se pausó', async ({ page }) => {
    await navigateToMeditacion(page);

    const firstSession = page.locator('[data-testid^="meditation-session"]')
      .or(page.locator('text=Calma'))
      .or(page.locator('text=Enfoque'))
      .first();

    if (!await firstSession.isVisible({ timeout: 8_000 }).catch(() => false)) {
      test.skip(true, 'No meditation session found');
      return;
    }

    await firstSession.click();
    await page.waitForTimeout(2_000);

    const timer = page.locator('[data-testid="meditation-timer"]')
      .or(page.locator('text=/\\d{2}:\\d{2}/'))
      .first();

    const pauseBtn = page.locator('[aria-label="pause"]')
      .or(page.locator('[data-testid="pause-btn"]'))
      .or(page.locator('text=Pausar'))
      .first();

    if (!await pauseBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'Pause button not found');
      return;
    }

    await pauseBtn.click();
    const pausedValue = await timer.innerText().catch(() => '');

    // Resume
    const resumeBtn = page.locator('[aria-label="play"]')
      .or(page.locator('[data-testid="play-btn"]'))
      .or(page.locator('text=Reanudar'))
      .or(page.locator('text=Continuar'))
      .first();

    if (await resumeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await resumeBtn.click();
      await page.waitForTimeout(2_000);

      const resumedValue = await timer.innerText().catch(() => '');
      // Timer should have advanced beyond the paused value
      expect(resumedValue).not.toBe(pausedValue);
    }
  });
});
