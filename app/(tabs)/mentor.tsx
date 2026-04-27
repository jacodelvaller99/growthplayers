import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  ChatBubble,
  GoldDivider,
  PolarisMark,
  PremiumCard,
  PremiumInput,
  StatusPill,
  screen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

const prompts = [
  { label: 'Analiza mi estado', icon: 'psychology' as const },
  { label: 'Dame una practica', icon: 'fitness-center' as const },
  { label: 'Ordena mi dia', icon: 'calendar-today' as const },
  { label: 'Recuerdame mi norte', icon: 'explore' as const },
];

export default function MentorScreen() {
  const { state, todayCheckIn, sendMentorMessage } = useLifeFlow();
  const [input, setInput] = useState('');

  const submit = async (text = input) => {
    const clean = text.trim();
    if (!clean) return;
    setInput('');
    await sendMentorMessage(clean);
  };

  return (
    <View style={screen.root}>
      <ScrollView contentContainerStyle={[screen.content, styles.content]}>
        <AppHeader
          title="MENTOR POLARIS"
          right={
            <View style={styles.onlineBlock}>
              <PolarisMark size={36} />
              <StatusPill label="EN LINEA" tone="success" dot />
            </View>
          }
        />

        {/* ── Operative Context ── */}
        <PremiumCard style={styles.contextCard}>
          <StatusPill label={`MODULO ${ACTIVE_MODULE.number} · ${ACTIVE_MODULE.title}`} />
          <Text style={styles.contextTitle}>CONTEXTO OPERATIVO</Text>
          {todayCheckIn ? (
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <MaterialIcons name="bolt" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>ENERGIA {todayCheckIn.energy}/10</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialIcons name="center-focus-strong" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>CLARIDAD {todayCheckIn.clarity}/10</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialIcons name="device-thermostat" size={12} color={palette.gold} />
                <Text style={styles.metricPillText}>ESTRES {todayCheckIn.stress}/10</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noCheckin}>
              Sin check-in hoy. El mentor puede orientar, pero falta lectura del sistema.
            </Text>
          )}
          {state.northStar.dailyReminder ? (
            <Text style={styles.contextNorth}>{state.northStar.dailyReminder}</Text>
          ) : null}
        </PremiumCard>

        {/* ── Quick Prompts ── */}
        <GoldDivider label="CONSULTAS RAPIDAS" />
        <View style={styles.promptGrid}>
          {prompts.map((p) => (
            <Pressable
              key={p.label}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              onPress={() => submit(p.label)}
              style={({ pressed }) => [
                styles.prompt,
                pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
              ]}>
              <MaterialIcons name={p.icon} size={16} color={palette.gold} />
              <Text style={styles.promptText}>{p.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Message Thread ── */}
        {state.mentorMessages.length > 0 && (
          <>
            <GoldDivider label="CONVERSACION" />
            <View style={styles.thread}>
              {state.mentorMessages.map((message) => (
                <ChatBubble key={message.id} role={message.role}>
                  {message.text}
                </ChatBubble>
              ))}
            </View>
          </>
        )}

        {state.mentorMessages.length === 0 && (
          <PremiumCard style={styles.emptyCard}>
            <MaterialIcons name="chat-bubble-outline" size={28} color={palette.smoke} />
            <Text style={styles.emptyTitle}>LISTO PARA OPERAR</Text>
            <Text style={styles.emptyBody}>
              Escribe tu consulta o usa las opciones rapidas para activar al mentor.
            </Text>
          </PremiumCard>
        )}
      </ScrollView>

      {/* ── Input Bar ── */}
      <View style={styles.inputBar}>
        <PremiumInput
          value={input}
          onChangeText={setInput}
          placeholder="CONSULTA AL MENTOR..."
          style={styles.input}
          onSubmitEditing={() => submit()}
          returnKeyType="send"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          style={({ pressed }) => [
            styles.sendButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          onPress={() => submit()}>
          <MaterialIcons name="arrow-upward" size={22} color={palette.black} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 148,
  },
  onlineBlock: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },

  // Context card
  contextCard: {
    gap: spacing.md,
  },
  contextTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricPill: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metricPillText: {
    ...typography.label,
    color: palette.gold,
    fontSize: 8,
  },
  noCheckin: {
    ...typography.mono,
    color: palette.smoke,
  },
  contextNorth: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Quick prompts
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prompt: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '48%',
    minHeight: 44,
  },
  promptText: {
    ...typography.label,
    color: palette.gold,
    flex: 1,
    fontSize: 8,
  },

  // Thread
  thread: {
    gap: spacing.md,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.section,
    color: palette.ash,
  },
  emptyBody: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 13,
    textAlign: 'center',
  },

  // Input bar
  inputBar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.blackDeep,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    bottom: 76,
    flexDirection: 'row',
    gap: spacing.md,
    maxWidth: 430,
    padding: spacing.lg,
    position: 'absolute',
    width: '100%',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
});
