import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PolarisIconProps {
    size?: number;
    color?: string;
}

export function PolarisIcon({ size = 32, color = '#EDBA01' }: PolarisIconProps) {
    return (
          <Svg width={size} height={size} viewBox="0 0 100 100">
                <Path
                          d="M50 5 L54 44 L93 50 L54 56 L50 95 L46 56 L7 50 L46 44 Z"
                          fill={color}
                        />
                <Path
                          d="M50 20 L52 44 L76 50 L52 56 L50 80 L48 56 L24 50 L48 44 Z"
                          fill={color}
                          opacity={0.35}
                        />
          </Svg>Svg>
        );
}</Svg>
