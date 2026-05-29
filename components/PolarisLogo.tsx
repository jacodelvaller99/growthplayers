/**
 * PolarisLogo — Official brand logo from Manual de Marca Polaris (Orgánico Studio 2024)
 *
 * Variants:
 *   - "star"       → Just the 8-pointed compass star (responsive/icon use)
 *   - "horizontal" → Star + POLARIS GROWTH INSTITUTE text side by side
 *   - "principal"  → Star above POLARIS text (full lockup)
 *
 * Color is always controlled via the `color` prop (defaults to gold #FFC804).
 */

import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { palette } from '@/constants/theme';

// ─── Compass Star (from RESPONSIVEPOLARIS.svg) ────────────────────────────────
function StarIcon({ color, size }: { color: string; size: number }) {
  // Normalized viewBox: 535.02 × 535.02
  const scale = size / 535.02;
  return (
    <Svg width={size} height={size} viewBox="0 0 535.02 535.02">
      <Path
        fill={color}
        d="M401.72,396.51c-33.47-40.96-69.36-79.64-106.3-117.42,79.99-.63,159.86-3.19,239.6-11.59-79.74-8.4-159.62-10.95-239.61-11.59,36.93-37.81,72.84-76.5,106.33-117.46l-29.69,93.44c12.62-23.71,66.92-125.72,78.45-147.37-22.22,11.83-123.06,65.5-147.37,78.45l93.43-29.69c-40.96,33.5-79.66,69.41-117.47,106.34-.66-80-3.22-159.88-11.58-239.63-8.36,79.74-10.91,159.63-11.58,239.63-37.81-36.94-76.51-72.85-117.47-106.34l93.43,29.69c-23.71-12.62-125.72-66.92-147.37-78.45,11.83,22.22,65.5,123.05,78.45,147.37l-29.69-93.44c33.5,40.96,69.41,79.66,106.34,117.47-80,.66-159.88,3.22-239.63,11.58,79.74,8.35,159.61,10.91,239.61,11.58-36.94,37.78-72.84,76.47-106.31,117.43l29.67-93.39c-12.62,23.71-66.92,125.72-78.45,147.37,22.22-11.83,123.05-65.5,147.37-78.45l-93.39,29.67c40.96-33.47,79.64-69.36,117.42-106.3,.63,79.99,3.19,159.87,11.59,239.6,8.4-79.73,10.95-159.61,11.59-239.6,37.78,36.94,76.46,72.83,117.42,106.3l-93.39-29.67c23.71,12.62,125.72,66.92,147.37,78.45-11.83-22.22-65.5-123.05-78.45-147.37l29.67,93.39Z"
      />
    </Svg>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────
interface PolarisLogoProps {
  variant?: 'star' | 'horizontal' | 'principal';
  color?: string;
  size?: number;
  /** Width for horizontal variant (height is derived from aspect ratio) */
  width?: number;
}

export function PolarisLogo({
  variant = 'star',
  color = palette.gold,
  size = 32,
  width,
}: PolarisLogoProps) {
  if (variant === 'star') {
    return <StarIcon color={color} size={size} />;
  }

  // For other variants, just render the star for now
  // (full horizontal/principal lockup would need SVG text paths)
  return <StarIcon color={color} size={size} />;
}

export default PolarisLogo;
