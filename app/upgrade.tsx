import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BRAND = {
  bg: '#01191D',
  surface: '#0D2B30',
  mint: '#AEFEF0',
  border: 'rgba(174, 254, 240, 0.15)',
  textPrimary: '#AEFEF0',
  textMuted: 'rgba(174, 254, 240, 0.5)',
};

export default function UpgradeScreen() {
  const router = useRouter();
  const [billingType, setBillingType] = useState<'monthly' | 'yearly'>('monthly');

  const handleActivate = () => {
    Alert.alert(
      'Pagos disponibles',
      'Los pagos estarán disponibles en la próxima versión. Por ahora, la funcionalidad premium está en desarrollo.'
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      {/* Header */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: BRAND.border,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontFamily: 'Outfit_400Regular',
              fontSize: 13,
              color: BRAND.textMuted,
            }}
          >
            ← Volver
          </Text>
        </Pressable>

        <Text
          style={{
            fontFamily: 'Outfit_700Bold',
            fontSize: 28,
            color: BRAND.mint,
            fontWeight: '700',
          }}
        >
          Protocolo Soberano
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 32,
        }}
      >
        {/* Billing Toggle */}
        <Animated.View entering={FadeIn.delay(100).duration(500)} style={{ marginBottom: 32 }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: BRAND.surface,
              borderWidth: 1,
              borderColor: BRAND.border,
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Pressable
              onPress={() => setBillingType('monthly')}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: billingType === 'monthly' ? BRAND.mint : 'transparent',
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit_600SemiBold',
                  fontSize: 12,
                  color: billingType === 'monthly' ? BRAND.bg : BRAND.textMuted,
                  fontWeight: '600',
                }}
              >
                Mensual
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBillingType('yearly')}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: billingType === 'yearly' ? BRAND.mint : 'transparent',
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit_600SemiBold',
                  fontSize: 12,
                  color: billingType === 'yearly' ? BRAND.bg : BRAND.textMuted,
                  fontWeight: '600',
                }}
              >
                Anual (3 meses gratis)
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Features List */}
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: 'Outfit_600SemiBold',
              fontSize: 10,
              color: BRAND.textMuted,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Incluye
          </Text>

          {[
            { icon: 'robot', title: 'Mentor IA ilimitado', desc: 'Acceso sin límites al mentor Polaris' },
            { icon: 'pulse', title: 'Biometría + Suplementación', desc: 'Integración con Apple Health y recomendaciones personalizadas' },
            { icon: 'map', title: 'Ingeniería Inversa y Roadmap', desc: 'Planes detallados basados en tu perfil' },
            { icon: 'people', title: 'Comunidades de élite', desc: 'Acceso a grupos privados de crecimiento' },
            { icon: 'meditation', title: 'Versículos + Meditación', desc: 'Sesiones guiadas con retroalimentación IA' },
          ].map((feature, i) => (
            <Animated.View
              key={i}
              entering={FadeIn.delay(300 + i * 100).duration(500)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 16,
                paddingBottom: 16,
                borderBottomWidth: i < 4 ? 1 : 0,
                borderBottomColor: BRAND.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: BRAND.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                  flexShrink: 0,
                }}
              >
                <MaterialCommunityIcons name={feature.icon as any} size={18} color={BRAND.mint} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'Outfit_600SemiBold',
                    fontSize: 14,
                    color: BRAND.textPrimary,
                    fontWeight: '600',
                    marginBottom: 4,
                  }}
                >
                  {feature.title}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 12,
                    color: BRAND.textMuted,
                    lineHeight: 18,
                  }}
                >
                  {feature.desc}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Pricing */}
        <Animated.View entering={FadeIn.delay(800).duration(500)} style={{ marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderWidth: 1,
              borderColor: BRAND.border,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 40,
                color: BRAND.mint,
                fontWeight: '700',
                marginBottom: 4,
              }}
            >
              {billingType === 'monthly' ? '$29' : '$258'}
            </Text>

            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 12,
                color: BRAND.textMuted,
                marginBottom: 24,
              }}
            >
              {billingType === 'monthly' ? 'por mes' : 'por año (ahorras $90)'}
            </Text>

            {billingType === 'yearly' && (
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 11,
                  color: '#4ade80',
                  marginBottom: 16,
                  backgroundColor: 'rgba(74, 222, 128, 0.1)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                ✓ 3 meses gratis
              </Text>
            )}

            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 11,
                color: BRAND.textMuted,
              }}
            >
              Cancela cuando quieras. Sin compromisos.
            </Text>
          </View>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeIn.delay(900).duration(500)} style={{ marginBottom: 24 }}>
          <Pressable
            onPress={handleActivate}
            style={{
              backgroundColor: BRAND.mint,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 15,
                color: BRAND.bg,
                fontWeight: '700',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Activar Ahora →
            </Text>
          </Pressable>
        </Animated.View>

        {/* FAQ */}
        <Animated.View entering={FadeIn.delay(1000).duration(500)}>
          <Text
            style={{
              fontFamily: 'Outfit_600SemiBold',
              fontSize: 10,
              color: BRAND.textMuted,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Preguntas
          </Text>

          {[
            {
              q: '¿Puedo cambiar de plan?',
              a: 'Sí, puedes cambiar entre mensual y anual en cualquier momento.',
            },
            {
              q: '¿Hay período de prueba?',
              a: 'Obtienes 5 mensajes gratuitos en la versión free para probar.',
            },
            {
              q: '¿Cómo cancelo?',
              a: 'Sin problemas. Cancela en cualquier momento desde tu perfil.',
            },
          ].map((faq, i) => (
            <View
              key={i}
              style={{
                marginBottom: 12,
                paddingBottom: 12,
                borderBottomWidth: i < 2 ? 1 : 0,
                borderBottomColor: BRAND.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit_600SemiBold',
                  fontSize: 13,
                  color: BRAND.textPrimary,
                  marginBottom: 6,
                  fontWeight: '600',
                }}
              >
                {faq.q}
              </Text>
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 12,
                  color: BRAND.textMuted,
                  lineHeight: 18,
                }}
              >
                {faq.a}
              </Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
