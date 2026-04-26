import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, ChatBubble, PolarisMark, PremiumCard, PremiumInput, StatusPill, screen } from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

const prompts = ['Analiza mi estado', 'Dame una practica', 'Ayudame a ordenar mi dia', 'Recuerdame mi norte'];

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

        <PremiumCard style={styles.contextCard}>
          <StatusPill label={`MODULO ${ACTIVE_MODULE.number} -- ${ACTIVE_MODULE.title}`} />
          <Text style={styles.contextTitle}>CONTEXTO OPERATIVO</Text>
          <Text style={styles.contextBody}>
            {todayCheckIn
              ? `Energia ${todayCheckIn.energy}/10 · claridad ${todayCheckIn.clarity}/10 · estres ${todayCheckIn.stress}/10.`
              : 'Sin check-in hoy. El mentor puede orientar, pero falta lectura del sistema.'}
          </Text>
          <Text style={styles.contextNorth}>{state.northStar.dailyReminder}</Text>
        </PremiumCard>

        <View style={styles.promptGrid}>
          {prompts.map((prompt) => (
            <Pressable key={prompt} style={styles.prompt} onPress={() => submit(prompt)}>
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.thread}>
          {state.mentorMessages.map((message) => (
            <ChatBubble key={message.id} role={message.role}>
              {message.text}
            </ChatBubble>
          ))}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <PremiumInput value={input} onChangeText={setInput} placeholder="CONSULTA AL MENTOR..." style={styles.input} />
        <Pressable style={styles.sendButton} onPress={() => submit()}>
          <MaterialIcons name="arrow-upward" size={22} color={palette.black} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 142,
  },
  onlineBlock: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  contextCard: {
    gap: spacing.md,
  },
  contextTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  contextBody: {
    ...typography.mono,
    color: palette.gold,
  },
  contextNorth: {
    ...typography.body,
    color: palette.ash,
  },
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prompt: {
    borderColor: 'rgba(237, 186, 1, 0.28)',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '48%',
  },
  promptText: {
    ...typography.label,
    color: palette.gold,
  },
  thread: {
    gap: spacing.md,
  },
  inputBar: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: palette.blackDeep,
    borderTopColor: 'rgba(237, 186, 1, 0.22)',
    borderTopWidth: 1,
    bottom: 76,
    flexDirection: 'row',
    gap: spacing.md,
    maxWidth: 390,
    padding: spacing.lg,
    position: 'absolute',
    width: '100%',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 12,
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
