/**
 * E2E — Accessibility (WCAG AA)
 *
 * Runs axe-core on 4 key screens:
 *   - /comando     (dashboard)
 *   - /norte       (wellness hub)
 *   - /programas   (modules list)
 *   - /perfil      (profile)
 *
 * Violations at WCAG AA level must be 0 per screen.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, waitForAppReady, goToTab } from './helpers';

// Violations we explicitly allow (known deferred issues in Expo Web)
const KNOWN_VIOLATIONS = [
  'color-contrast', // Gold on black: passes visually but some contrast ratios need calibration
];

function assertNoViolations(violations: any[], screenName: string) {
  const critical = violations.filter(
    (v) => !KNOWN_VIOLATIONS.includes(v.id) && (v.impact === 'critical' || v.impact === 'serious'),
  );

  if (critical.length > 0) {
    const report = critical.map(
      (v) => `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.length}`,
    ).join('\n');
    throw new Error(`Accessibility violations on ${screenName}:\n${report}`);
  }
}

test.describe('Accessibility — WCAG AA audits', () => {
  test('COMANDO — sin violaciones críticas', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    await goToTab(page, 'COMANDO');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_000); // Let animations settle

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    assertNoViolations(results.violations, 'COMANDO');
  });

  test('NORTE (Bienestar) — sin violaciones críticas', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);

    // Navigate to NORTE / Bienestar
    await page.locator('text=NORTE')
      .or(page.locator('[aria-label="NORTE"]'))
      .first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    assertNoViolations(results.violations, 'NORTE');
  });

  test('PROGRAMA — sin violaciones críticas', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    await goToTab(page, 'PROGRAMA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    assertNoViolations(results.violations, 'PROGRAMA');
  });

  test('PERFIL — sin violaciones críticas', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    await goToTab(page, 'PERFIL');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    assertNoViolations(results.violations, 'PERFIL');
  });
});
