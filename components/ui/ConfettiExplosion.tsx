import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface ConfettiParticle {
  id: number;
  angle: number;
  distance: number;
  duration: number;
  delay: number;
}

interface ConfettiExplosionProps {
  isActive: boolean;
  particleCount?: number;
  color?: string;
}

const ConfettiParticleComponent = ({
  particle,
  color,
}: {
  particle: ConfettiParticle;
  color: string;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const radians = particle.angle;
    const endX = Math.cos(radians) * particle.distance;
    const endY = Math.sin(radians) * particle.distance;

    translateX.value = withDelay(
      particle.delay,
      withTiming(endX, {
        duration: particle.duration,
        easing: Easing.out(Easing.quad),
      })
    );

    translateY.value = withDelay(
      particle.delay,
      withTiming(endY, {
        duration: particle.duration,
        easing: Easing.out(Easing.quad),
      })
    );

    opacity.value = withDelay(
      particle.delay + particle.duration - 200,
      withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.linear),
      })
    );
  }, [particle, translateX, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export function ConfettiExplosion({
  isActive,
  particleCount = 20,
  color = '#AEFEF0',
}: ConfettiExplosionProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (isActive) {
      const newParticles: ConfettiParticle[] = Array.from({
        length: particleCount,
      }).map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        const duration = 600 + Math.random() * 200;
        const delay = i * 20;

        return {
          id: i,
          angle,
          distance,
          duration,
          delay,
        };
      });

      setParticles(newParticles);
    }
  }, [isActive, particleCount]);

  if (!isActive || particles.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
      }}
    >
      {particles.map((particle) => (
        <ConfettiParticleComponent key={particle.id} particle={particle} color={color} />
      ))}
    </View>
  );
}
