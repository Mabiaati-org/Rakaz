import type { LucideIcon } from 'lucide-react-native';
import { Platform, StyleSheet, TextInput, View, type KeyboardTypeOptions, useWindowDimensions } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Fonts, Rakaz, withAlpha } from '@/constants/theme';

export interface AuthFieldProps {
  icon: LucideIcon;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  maxLength: number;
  secure?: boolean;
  onSubmit?: () => void;
  autoComplete?: 'tel' | 'current-password' | 'new-password';
}

/** Text field used on the navy sign-in and password screens. */
export function AuthField({
  icon: Icon,
  placeholder,
  value,
  onChange,
  keyboardType = 'default',
  maxLength,
  secure = false,
  onSubmit,
  autoComplete,
}: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <Icon color={Rakaz.Gold} size={20} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={withAlpha(Rakaz.White, 0.4)}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secure}
        selectionColor={Rakaz.Gold}
        cursorColor={Rakaz.Gold}
        returnKeyType={onSubmit ? 'go' : 'next'}
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete={autoComplete}
        textContentType={autoComplete === 'tel' ? 'telephoneNumber' : autoComplete === 'new-password' ? 'newPassword' : autoComplete === 'current-password' ? 'password' : undefined}
        style={styles.input}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

/** Decorative navy backdrop: gold glow, deep-blue glow and faint gold arcs. */
export function AuthBackdrop() {
  const { width, height } = useWindowDimensions();
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <RadialGradient id="gold" cx={width * 0.9} cy={height * 0.1} r={width * 0.8} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={Rakaz.Gold} stopOpacity={0.22} />
          <Stop offset="1" stopColor={Rakaz.Gold} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blue" cx={0} cy={height * 0.85} r={width} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#1D3A63" stopOpacity={0.8} />
          <Stop offset="1" stopColor="#1D3A63" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={Rakaz.Navy} />
      <Rect x={0} y={0} width={width} height={height} fill="url(#gold)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#blue)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const rx = (width * 1.6 + i * 80) / 2;
        const ry = (height * 0.5) / 2;
        const cx = -width * 0.3 - i * 40 + rx;
        const cy = height * 0.62 + i * 30 + ry;
        const start = (200 * Math.PI) / 180;
        const end = (320 * Math.PI) / 180;
        const x1 = cx + rx * Math.cos(start);
        const y1 = cy + ry * Math.sin(start);
        const x2 = cx + rx * Math.cos(end);
        const y2 = cy + ry * Math.sin(end);
        return (
          <Path
            key={i}
            d={`M${x1},${y1} A${rx},${ry} 0 0 1 ${x2},${y2}`}
            stroke={Rakaz.Gold}
            strokeOpacity={0.07 - i * 0.01}
            strokeWidth={1.5}
            fill="none"
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  field: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    backgroundColor: withAlpha(Rakaz.White, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(Rakaz.White, 0.12),
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Rakaz.White,
    fontFamily: Fonts.medium,
    fontSize: 17,
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
  },
});
