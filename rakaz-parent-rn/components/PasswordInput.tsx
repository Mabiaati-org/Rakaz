import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Theme, withAlpha } from '@/constants/theme';

export interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `new` lets the system offer to save or suggest a password. */
  kind?: 'current' | 'new';
  onSubmit?: () => void;
}

/** Labelled password field with a show/hide toggle. */
export function PasswordInput({ label, value, onChange, kind = 'current', onSubmit }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText size="subheadline" weight="semibold">
        {label}
      </AppText>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="••••••••"
          placeholderTextColor={withAlpha(Theme.muted, 0.7)}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={128}
          textContentType={kind === 'new' ? 'newPassword' : 'password'}
          autoComplete={kind === 'new' ? 'new-password' : 'current-password'}
          returnKeyType={onSubmit ? 'go' : 'next'}
          onSubmitEditing={onSubmit}
          style={styles.input}
          accessibilityLabel={label}
        />
        <PressableScale
          accessibilityLabel={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
        >
          {visible ? <EyeOff size={18} color={Theme.muted} /> : <Eye size={18} color={Theme.muted} />}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  field: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14, paddingHorizontal: 14, backgroundColor: Theme.canvas, gap: 8 },
  input: {
    flex: 1,
    height: 52,
    color: Theme.ink,
    fontFamily: Fonts.semibold,
    fontSize: 17,
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'ltr',
  },
  eye: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
