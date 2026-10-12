import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { FormError } from '@/components/FormError';
import { DetailScreen } from '@/components/DetailScreen';
import { PressableScale } from '@/components/PressableScale';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { SentConfirmation } from '@/components/SentConfirmation';
import { plex, TextSizes, Theme, withAlpha } from '@/constants/theme';
import { useSubmit } from '@/hooks/useSubmit';
import { useFamily } from '@/store/familyStore';
import { allTicketTopics, TicketKind, TicketTopic, TicketTopicTitle } from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

const MAX = 500;

export default function TicketComposerScreen() {
  const params = useLocalSearchParams<{ kind: string }>();
  const kind = params.kind === TicketKind.complaint ? TicketKind.complaint : TicketKind.feedback;
  const store = useFamily();
  const submit = useSubmit();
  const router = useRouter();
  const [topic, setTopic] = useState<TicketTopic>(TicketTopic.driver);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const isValid = text.trim().length >= 5;
  const complaint = kind === TicketKind.complaint;

  return (
    <DetailScreen
      title={complaint ? 'إرسال شكوى' : 'إرسال ملاحظة'}
      inSheet
      leading={<HeaderTextButton title="إغلاق" onPress={() => router.back()} />}
      gap={18}
    >
      {sent ? (
        <SentConfirmation
          title="تم الإرسال بنجاح"
          message={`شكراً لك. ستراجع الإدارة ${complaint ? 'شكواك' : 'ملاحظتك'} وتتواصل معك قريباً.`}
          onDone={() => router.back()}
        />
      ) : (
        <>
          <AppText size="subheadline" weight="bold">
            الموضوع
          </AppText>
          <View style={styles.topics}>
            {allTicketTopics.map((t) => {
              const selected = topic === t;
              return (
                <PressableScale
                  key={t}
                  accessibilityLabel={TicketTopicTitle[t]}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    Haptics.selection();
                    setTopic(t);
                  }}
                  style={[styles.topic, { backgroundColor: selected ? Theme.navy : Theme.card }]}
                >
                  <AppText size="footnote" weight="semibold" color={selected ? Theme.white : Theme.ink} align="center">
                    {TicketTopicTitle[t]}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
          <AppText size="subheadline" weight="bold">
            {complaint ? 'تفاصيل الشكوى' : 'ملاحظتك'}
          </AppText>
          <View style={styles.gap6}>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.slice(0, MAX))}
              maxLength={MAX}
              placeholder="اكتب هنا…"
              placeholderTextColor={withAlpha(Theme.muted, 0.8)}
              multiline
              style={styles.input}
              accessibilityLabel={complaint ? 'تفاصيل الشكوى' : 'ملاحظتك'}
            />
            <AppText size="caption" color={Theme.muted} align="end">
              {`${Fmt.digits(String(text.length))}/٥٠٠`}
            </AppText>
          </View>
          <FormError message={submit.error} />
          <PrimaryButton
            title="إرسال"
            icon={Send}
            fill={complaint ? Theme.red : Theme.navy}
            disabled={!isValid}
            loading={submit.busy}
            style={{ opacity: isValid ? 1 : 0.5 }}
            onPress={() => {
              void submit.run(() => store.submitTicket(kind, topic, text)).then((ok) => {
                if (ok) setSent(true);
              });
            }}
          />
        </>
      )}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: { flexGrow: 1, flexBasis: 96, minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  gap6: { gap: 6 },
  input: {
    ...plex(TextSizes.body),
    lineHeight: undefined,
    minHeight: 140,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Theme.card,
    color: Theme.ink,
    textAlignVertical: 'top',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'rtl',
  },
});
