import {
  Bell,
  ChevronDown,
  CircleHelp,
  CircleX,
  Clock,
  Headphones,
  type LucideIcon,
  MessageCircle,
  MessageCircleWarning,
  MessageSquare,
  MessageSquareText,
  Phone,
  Search,
  SearchX,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BrandScreen, HeaderBar } from '@/components/Brand';
import { PressableScale } from '@/components/PressableScale';
import { IconBadge, SectionTitle } from '@/components/Primitives';
import { FAQS } from '@/constants/faqs';
import { card, heroShadow, plex, TextSizes, Theme, withAlpha } from '@/constants/theme';
import { useAppNav } from '@/hooks/useAppNav';
import { useFamily } from '@/store/familyStore';
import { TicketKind, TicketKindTitle, TicketTopicTitle } from '@/types/models';
import { Fmt } from '@/utils/fmt';
import { Haptics } from '@/utils/haptics';

const WHATSAPP_TEXT = encodeURIComponent('مرحباً، أحتاج مساعدة بخصوص النقل المدرسي');

/** "مركز المساعدة" (design 83): urgent call card, search, popular topics, recent questions and quick answers. */
export default function SupportScreen() {
  const store = useFamily();
  const nav = useAppNav();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const q = query.trim();
  const tickets = store.state.tickets;
  const { adminPhone, whatsappNumber } = store.state.support;

  const faqs = (() => {
    if (q.length === 0) return showAll ? FAQS : FAQS.slice(0, 4);
    const needle = q.toLocaleLowerCase();
    return FAQS.filter((f) => f.question.toLocaleLowerCase().includes(needle) || f.answer.toLocaleLowerCase().includes(needle));
  })();

  const header = (
    <View style={styles.header}>
      <HeaderBar trailing={{ icon: Bell, label: 'الإشعارات', badge: store.unreadCount > 0, onPress: nav.showNotifications }}>
        <View>
          <AppText size={10} weight="semibold" color={Theme.goldLight} align="center" style={styles.tracking}>
            RAKAZ / CARE
          </AppText>
          <AppText size="headline" weight="bold" color={Theme.white} align="center">
            مركز المساعدة
          </AppText>
        </View>
      </HeaderBar>
      <View style={styles.gap2}>
        <AppText size="subheadline" color={withAlpha(Theme.white, 0.7)}>
          نحن هنا عندما تحتاجنا
        </AppText>
        <AppText size={26} weight="bold" color={Theme.white}>
          كيف يمكننا مساعدتك اليوم؟
        </AppText>
      </View>
    </View>
  );

  return (
    <BrandScreen overlap={54} header={header}>
      <View style={[card(16, 26), heroShadow, styles.row12]}>
        <IconBadge icon={Headphones} tint={Theme.gold} soft="#F4E8D0" size={50} />
        <View style={styles.flexGap2}>
          <AppText size="headline" weight="bold">
            مكالمة عاجلة؟
          </AppText>
          <AppText size="caption" color={Theme.muted}>
            تواصل مباشرة مع إدارة النقل
          </AppText>
        </View>
        {adminPhone ? (
          <PressableScale accessibilityLabel="اتصل بنا" onPress={() => void Linking.openURL(`tel:${adminPhone}`)} style={styles.callButton}>
            <Phone size={14} color={Theme.white} />
            <AppText size="footnote" weight="bold" color={Theme.white}>
              اتصل بنا
            </AppText>
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.search}>
        <Search size={17} color={Theme.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن إجابة…"
          placeholderTextColor={Theme.muted}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="ابحث عن إجابة"
        />
        {query.length > 0 ? (
          <PressableScale accessibilityLabel="مسح" onPress={() => setQuery('')} hitSlop={8}>
            <CircleX size={18} color={Theme.white} fill={Theme.muted} />
          </PressableScale>
        ) : null}
      </View>

      {q.length === 0 ? (
        <>
          <SectionTitle title="المواضيع الشائعة" action="عرض الكل" onAction={() => setShowAll(true)} />
          <View style={styles.grid}>
            <Topic icon={Clock} title="الرحلات والمواعيد" subtitle="تتبّع ووصول" onPress={() => setQuery('رحلة')} />
            <Topic icon={ShieldCheck} title="سلامة الطفل" subtitle="إجراءات الحماية" onPress={() => setQuery('السائق')} />
            <Topic icon={User} title="الحساب والعائلة" subtitle="بياناتك" onPress={() => nav.openTab('family')} />
            <Topic icon={MessageSquare} title="التواصل" subtitle="مع فريق ركاز" onPress={() => nav.composeTicket(TicketKind.feedback)} />
          </View>
          <SectionTitle title="تواصل معنا" />
          <View style={styles.row10}>
            {whatsappNumber ? (
              <ContactTile
                icon={MessageCircle}
                title="WhatsApp"
                tint={Theme.whatsapp}
                onPress={() => void Linking.openURL(`https://wa.me/${whatsappNumber}?text=${WHATSAPP_TEXT}`)}
              />
            ) : null}
            <ContactTile
              icon={MessageCircleWarning}
              title="شكوى"
              tint={Theme.red}
              onPress={() => {
                Haptics.tap();
                nav.composeTicket(TicketKind.complaint);
              }}
            />
            <ContactTile
              icon={MessageSquareText}
              title="ملاحظة"
              tint={Theme.gold}
              onPress={() => {
                Haptics.tap();
                nav.composeTicket(TicketKind.feedback);
              }}
            />
          </View>
          {tickets.length > 0 ? (
            <>
              <SectionTitle title="أسئلتك الأخيرة" action="كل المحادثات" onAction={() => setShowAll(true)} />
              <View style={styles.gap10}>
                {tickets.slice(0, showAll ? 20 : 2).map((t) => (
                  <View key={t.id} style={[card(14, 20), styles.row12]}>
                    <View style={styles.ticketAvatar}>
                      <AppText size="headline" weight="bold" align="center">
                        س
                      </AppText>
                      <View style={styles.ticketDot} />
                    </View>
                    <View style={styles.flexGap1}>
                      <View style={styles.between}>
                        <AppText size="subheadline" weight="bold" style={styles.shrink} numberOfLines={1}>
                          {`${TicketKindTitle[t.kind]} · ${TicketTopicTitle[t.topic]}`}
                        </AppText>
                        <AppText size="caption2" color={Theme.muted}>
                          {Fmt.relative(t.createdAt)}
                        </AppText>
                      </View>
                      <AppText size="caption" color={Theme.muted} numberOfLines={1}>
                        {`${Fmt.digits(t.id)} · ${t.status}`}
                      </AppText>
                      {t.reply ? (
                        <AppText size="caption" color={Theme.ink}>
                          {`رد الإدارة: ${t.reply}`}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <View style={styles.gap10}>
        <View style={[styles.row8, styles.faqTitle]}>
          <CircleHelp size={18} color={Theme.gold} />
          <AppText size="title3" weight="bold">
            {query.length === 0 ? 'إجابات سريعة' : 'نتائج البحث'}
          </AppText>
        </View>
        <View style={styles.faqBox}>
          {faqs.map((item, index) => {
            const open = expandedFAQ === item.id;
            return (
              <View key={item.id}>
                <PressableScale
                  scale={0.99}
                  accessibilityLabel={item.question}
                  onPress={() => {
                    Haptics.selection();
                    setExpandedFAQ(open ? null : item.id);
                  }}
                  style={styles.faqItem}
                >
                  <View style={styles.faqHead}>
                    <AppText size="footnote" weight="bold" style={styles.flex}>
                      {item.question}
                    </AppText>
                    <ChevronDown size={14} color={Theme.muted} strokeWidth={2.6} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                  </View>
                  {open ? (
                    <AppText size="footnote" color={Theme.muted}>
                      {item.answer}
                    </AppText>
                  ) : null}
                </PressableScale>
                {index < faqs.length - 1 ? <View style={styles.hairline} /> : null}
              </View>
            );
          })}
          {faqs.length === 0 ? (
            <View style={styles.empty}>
              <SearchX size={40} color={Theme.muted} />
              <AppText size="headline" weight="bold" align="center">
                {`لا توجد نتائج لـ «${q}»`}
              </AppText>
              <AppText size="footnote" color={Theme.muted} align="center">
                تحقق من الإملاء أو جرّب بحثاً جديداً.
              </AppText>
            </View>
          ) : null}
        </View>
        {!showAll && query.length === 0 && FAQS.length > 4 ? (
          <PressableScale accessibilityLabel="عرض كل الأسئلة" onPress={() => setShowAll(true)} style={styles.showAll}>
            <AppText size="footnote" weight="bold" color={Theme.gold} align="center">
              عرض كل الأسئلة
            </AppText>
          </PressableScale>
        ) : null}
      </View>
    </BrandScreen>
  );
}

function Topic({ icon, title, subtitle, onPress }: { icon: LucideIcon; title: string; subtitle: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel={title}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={styles.topic}
    >
      <IconBadge icon={icon} tint={Theme.ink} soft={Theme.blueSoft} size={38} />
      <View style={styles.flex}>
        <AppText size="footnote" weight="bold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {title}
        </AppText>
        <AppText size="caption2" color={Theme.muted} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </PressableScale>
  );
}

function ContactTile({ icon: Icon, title, tint, onPress }: { icon: LucideIcon; title: string; tint: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={title} onPress={onPress} style={styles.contactTile}>
      <View style={[styles.contactIcon, { backgroundColor: withAlpha(tint, 0.1) }]}>
        <Icon size={18} color={tint} />
      </View>
      <AppText size="caption" weight="bold" align="center">
        {title}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { gap: 18 },
  tracking: { letterSpacing: 2.5 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  flexGap1: { flex: 1, gap: 1 },
  flexGap2: { flex: 1, gap: 2 },
  gap2: { gap: 2 },
  gap10: { gap: 10 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row10: { flexDirection: 'row', gap: 10 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hairline: { height: 1, backgroundColor: Theme.line },
  callButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Theme.navy },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.line,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Theme.ink,
    ...plex(TextSizes.subheadline),
    lineHeight: undefined,
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topic: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.line,
  },
  contactTile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.line,
  },
  contactIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ticketAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.blueSoft, alignItems: 'center', justifyContent: 'center' },
  ticketDot: { position: 'absolute', bottom: 0, start: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Theme.green, borderWidth: 2, borderColor: Theme.white },
  faqTitle: { paddingHorizontal: 4, paddingTop: 6 },
  faqBox: { backgroundColor: Theme.card, borderRadius: 20, borderWidth: 1, borderColor: Theme.line, overflow: 'hidden' },
  faqItem: { padding: 16, gap: 8 },
  faqHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 32, paddingHorizontal: 20 },
  showAll: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
