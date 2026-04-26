import React from 'react';
import { View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface TacticalGridProps {
  children?: React.ReactNode;
}

export const TacticalGrid: React.FC<TacticalGridProps> = ({ children }) => {
  const gridSize = Layout.tacticalGrid.gridSize;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Grid Background */}
      <View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          },
        ]}
      >
        {/* Grid Lines Horizontales */}
        {Array.from({ length: Math.ceil(10000 / gridSize) }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 1,
              top: i * gridSize,
              backgroundColor: Colors.mint,
              opacity: Layout.tacticalGrid.gridOpacity,
            }}
          />
        ))}

        {/* Grid Lines Verticales */}
        {Array.from({ length: Math.ceil(10000 / gridSize) }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 1,
              left: i * gridSize,
              backgroundColor: Colors.mint,
              opacity: Layout.tacticalGrid.gridOpacity,
            }}
          />
        ))}
      </View>

      {/* Contenido */}
      <View style={{ flex: 1, zIndex: 1 }}>
        {children}
      </View>
    </View>
  );
};
