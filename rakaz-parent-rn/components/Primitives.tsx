import * as Clipboard from 'expo-clipboard';
import { Check, ChevronLeft, CircleCheck, Copy, type LucideIcon } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Theme } from '@/constants/theme';
import { Gender, type Student, studentInitials } from '@/types/models';
import { Haptics } from '@/utils/haptics';

import rakazLogo from '@/assets/images/rakaz_logo.png';

export { rakazLogo };

export interface StatusPillProps {
  title: string;
  tint: string;
  soft: string;
  icon?: LucideIcon;
  pulsing?: boolean;
  dot?: boolean;
}

export function StatusPill({ title, tint, soft, icon: Icon, pulsing = false, dot = false }: StatusPillProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulsing) return;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [pulsing, pulse]);

  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      {pulsing || dot ? (
        <View style={[styles.pillDot, { backgroundColor: tint }]}>
          {pulsing ? (
            <Animated.View
              style={[
                styles.pillRing,
                {
                  borderColor: tint,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
                },
              ]}
            />
          ) : null}
        </View>
      ) : Icon ? (
        <Icon size={11} color={tint} strokeWidth={2.8} />
      ) : null}
      <AppText size="caption" weight="bold" color={tint} numberOfLines={1}>
        {title}
      </AppText>
    </View>
  );
}

export interface IconBadgeProps {
  icon: LucideIcon;
  tint?: string;
  soft?: string;
  size?: number;
}

export function IconBadge({ icon: Icon, tint = Theme.navy, soft = Theme.blueSoft, size = 44 }: IconBadgeProps) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.42} color={tint} strokeWidth={1.9} />
    </View>
  );
}

export interface AvatarProps {
  initials: string;
  size?: number;
  tint?: string;
}

/** Initials on a tinted tile. */
export function Avatar({ initials, size = 52, tint = Theme.gold }: AvatarProps) {
  const frame = { width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden' as const };
  return (
    <View style={[frame, { backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }]}>
      <AppText size={size * 0.34} weight="bold" color={Theme.white} align="center">
        {initials}
      </AppText>
    </View>
  );
}

export interface StudentAvatarProps {
  student: Student;
  size?: number;
  filled?: boolean;
  verified?: boolean;
  round?: boolean;
}

/** Initial-letter tile used for children throughout the design (soft tint, ink/gold letter). */
export function StudentAvatar({ student, size = 52, filled = false, verified = false, round = false }: StudentAvatarProps) {
  const female = student.gender === Gender.female;
  const bg = filled ? (female ? Theme.goldLight : Theme.sage) : female ? Theme.blueSoft : '#F4E8D0';
  const fg = filled ? Theme.white : female ? Theme.ink : Theme.gold;
  const text = filled ? studentInitials(student).replace(/ /g, '') : student.firstName.charAt(0);
  return (
    <View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: round ? size / 2 : size * 0.3,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText size={size * (filled ? 0.3 : 0.36)} weight="bold" color={fg} align="center">
          {text}
        </AppText>
      </View>
      {verified ? (
        <View style={[styles.verified, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]}>
          <CircleCheck size={size * 0.3} color={Theme.white} fill={Theme.green} strokeWidth={2.4} />
        </View>
      ) : null}
    </View>
  );
}

export interface SectionTitleProps {
  title: string;
  action?: string;
  /** Icon shown before the action; without it a trailing chevron is used. */
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export function SectionTitle({ title, action, actionIcon: ActionIcon, onAction }: SectionTitleProps) {
  return (
    <View style={styles.sectionTitle}>
      <AppText size="title3" weight="bold">
        {title}
      </AppText>
      {action != null && onAction != null ? (
        <PressableScale
          onPress={() => {
            Haptics.tap();
            onAction();
          }}
          accessibilityLabel={action}
          style={styles.sectionAction}
        >
          {ActionIcon ? <ActionIcon size={12} color={Theme.gold} strokeWidth={2.8} /> : null}
          <AppText size="footnote" weight="semibold" color={Theme.gold}>
            {action}
          </AppText>
          {ActionIcon ? null : <ChevronLeft size={12} color={Theme.gold} strokeWidth={2.8} />}
        </PressableScale>
      ) : null}
    </View>
  );
}

export interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}

/** Label/value row used in profile-style detail screens. */
export function InfoRow({ icon: Icon, label, value, mono = false, copyable = false }: InfoRowProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon size={15} color={Theme.gold} strokeWidth={2} />
      </View>
      <View style={styles.infoText}>
        <AppText size="caption" color={Theme.muted}>
          {label}
        </AppText>
        <AppText size="subheadline" weight="semibold" style={mono ? styles.mono : null}>
          {value.length === 0 ? '—' : value}
        </AppText>
      </View>
      {copyable ? (
        <PressableScale
          accessibilityLabel={`نسخ ${label}`}
          onPress={() => {
            void Clipboard.setStringAsync(value);
            Haptics.tap();
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1500);
          }}
          style={styles.copy}
        >
          {copied ? <Check size={15} color={Theme.green} strokeWidth={2.6} /> : <Copy size={15} color={Theme.muted} strokeWidth={2.2} />}
        </PressableScale>
      ) : null}
    </View>
  );
}

export function RowDivider({ inset = 48 }: { inset?: number }) {
  return <View style={[styles.divider, { marginStart: inset }]} />;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function LogoBadge({ height = 40 }: { height?: number }) {
  return (
    <View style={styles.logo} accessibilityLabel="ركاز">
      <Image source={rakazLogo} style={{ height, width: height * (1237 / 827) }} resizeMode="contain" />
    </View>
  );
}

/** Rounded content group for rows (card with inner padding). */
export function Group({ children, padding = 12 }: { children: ReactNode; padding?: number }) {
  return <View style={[styles.group, { padding }]}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  pillRing: { position: 'absolute', width: 6, height: 6, borderRadius: 3, borderWidth: 2 },
  verified: {
    position: 'absolute',
    bottom: -4,
    end: -4,
    backgroundColor: Theme.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 6,
    alignSelf: 'stretch',
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: Theme.goldSoft, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, gap: 1 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), writingDirection: 'ltr' },
  copy: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: Theme.line },
  logo: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Theme.white, borderRadius: 6 },
  group: {
    alignSelf: 'stretch',
    backgroundColor: Theme.card,
    borderRadius: 24,
    boxShadow: '0px 6px 16px rgba(7,29,54,0.06)',
  },
});
