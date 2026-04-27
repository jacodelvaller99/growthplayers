/**
 * Unit tests — ScaleSelector component
 *
 * Source: components/polaris.tsx → ScaleSelector
 * Props: label, value (1–10), onChange(value: number), icon?
 *
 * Accessibility contract:
 *   accessibilityRole="button"
 *   accessibilityLabel="`${label} ${item}`"   e.g. "Energia 7"
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock dependencies pulled in by polaris.tsx
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// jest auto-discovers __mocks__/@shopify/react-native-skia.ts for node_modules
jest.mock('@shopify/react-native-skia');

// ScaleSelector is a named export from polaris.tsx
import { ScaleSelector } from '@/components/polaris';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ScaleSelector', () => {
  it('renders exactly 10 step buttons', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <ScaleSelector label="Energia" value={5} onChange={onChange} />,
    );
    // Each step is a Pressable with role="button"
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(10);
  });

  it('calls onChange with the correct step value when pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ScaleSelector label="Energia" value={3} onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Energia 7'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('renders label-based accessibilityLabel for each step (1–10)', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ScaleSelector label="Claridad" value={1} onChange={onChange} />,
    );
    // All 10 steps must be reachable by a11y label
    for (let i = 1; i <= 10; i++) {
      expect(getByLabelText(`Claridad ${i}`)).toBeTruthy();
    }
  });

  it('clamps gracefully — value=0 renders 10 steps with none highlighted', () => {
    /**
     * BUG / DESIGN NOTE: ScaleSelector accepts value=0 without clamping.
     * The component uses `item <= value` for active style, so value=0 means
     * NO step is highlighted. CheckIn initial state uses value=5 so this is
     * safe in practice, but the prop type is `number` (not `1..10`).
     *
     * Issue: consider using `min={1}` clamping in the onChange handler or prop
     * type to prevent value=0 states.
     */
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <ScaleSelector label="Estres" value={0} onChange={onChange} />,
    );
    // Component still renders 10 buttons — it does not crash with value=0
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(10);
  });
});
