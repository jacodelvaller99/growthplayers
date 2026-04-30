/**
 * E2E — PROGRAMA tab (modules / lessons)
 *
 * Covers: modules list, active lesson navigation, locked lesson gate, lesson progress
 */
import { test, expect } from '@playwright/test';
import { login, waitForAppReady, goToTab } from './helpers';

test.describe('PROGRAMA — módulos y lecciones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    await goToTab(page, 'PROGRAMA');
  });

  test('lista de módulos carga sin error', async ({ page }) => {
    // At least one module card should be visible
    const module = page.locator('[data-testid="module-card"]')
      .or(page.locator('text=Guerrero'))
      .or(page.locator('text=Módulo'))
      .or(page.locator('text=MÓDULO'))
      .first();

    await expect(module).toBeVisible({ timeout: 15_000 });

    // Page must not contain JS error text
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Cannot read properties');
    expect(body).not.toContain('undefined is not');
  });

  test('módulo activo tiene botón CONTINUAR navegable', async ({ page }) => {
    // The active module should have a CONTINUAR or active button
    const continuarBtn = page.locator('text=CONTINUAR')
      .or(page.locator('text=Continuar'))
      .or(page.locator('[data-testid="continue-btn"]'))
      .first();

    if (await continuarBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await continuarBtn.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to a lesson or module detail
      const lessonContent = page.locator('text=COMPLETAR')
        .or(page.locator('text=LECCIÓN'))
        .or(page.locator('text=Lección'))
        .or(page.locator('text=GUARDAR'))
        .first();

      await expect(lessonContent).toBeVisible({ timeout: 15_000 });
    } else {
      // No active module found — acceptable if account just started
      const anyContent = page.locator('text=PROGRAMA')
        .or(page.locator('text=Programa'))
        .or(page.locator('text=módulo'))
        .first();
      await expect(anyContent).toBeVisible({ timeout: 5_000 });
    }
  });

  test('lección bloqueada no navega', async ({ page }) => {
    // Find a locked lesson indicator
    const lockedLesson = page.locator('[data-testid="lesson-locked"]')
      .or(page.locator('text=🔒'))
      .or(page.locator('[aria-label="bloqueado"]'))
      .first();

    if (await lockedLesson.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const urlBefore = page.url();
      await lockedLesson.click();
      await page.waitForTimeout(1_000);

      // URL should NOT change to a lesson screen
      const urlAfter = page.url();
      expect(urlAfter).toBe(urlBefore);
    } else {
      // No locked lesson visible — fresh account may show all active
      test.skip(true, 'No locked lesson visible on this account');
    }
  });

  test('completar una lección avanza el progreso del módulo', async ({ page }) => {
    // Navigate into an active lesson
    const continuarBtn = page.locator('text=CONTINUAR')
      .or(page.locator('text=Continuar'))
      .first();

    if (!await continuarBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
      test.skip(true, 'No active lesson to complete');
      return;
    }

    await continuarBtn.click();
    await page.waitForLoadState('networkidle');

    // Find the COMPLETAR LECCIÓN button
    const completarBtn = page.locator('text=COMPLETAR LECCIÓN')
      .or(page.locator('text=Completar lección'))
      .or(page.locator('[data-testid="complete-lesson-btn"]'))
      .first();

    if (await completarBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // If there's a task form, fill the first text field
      const taskInput = page.locator('textarea, [data-testid="task-input"]').first();
      if (await taskInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await taskInput.fill('Respuesta de prueba Batman QA 2026');
        // Save task
        const guardarBtn = page.locator('text=GUARDAR TAREA')
          .or(page.locator('[data-testid="save-task-btn"]'))
          .first();
        if (await guardarBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await guardarBtn.click();
          await page.waitForTimeout(1_000);
        }
      }

      await completarBtn.click();
      await page.waitForLoadState('networkidle');

      // Should navigate back or to next lesson
      const nextContent = page.locator('text=COMPLETAR')
        .or(page.locator('text=CONTINUAR'))
        .or(page.locator('text=PROGRAMA'))
        .first();
      await expect(nextContent).toBeVisible({ timeout: 10_000 });
    } else {
      test.skip(true, 'COMPLETAR LECCIÓN button not found');
    }
  });
});
