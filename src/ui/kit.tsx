import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { c, font, radius, space } from "./theme";

// The admin app's building blocks. Screens compose these instead of styling
// from scratch, so every screen looks and behaves the same.

export type IconName = ComponentProps<typeof Feather>["name"];

export function Icon({ name, size = 20, color = c.paper }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean };

export const T = {
  Display: ({ children, style }: TextProps) => <Text style={[s.display, style]}>{children}</Text>,
  H2: ({ children, style }: TextProps) => <Text style={[s.h2, style]}>{children}</Text>,
  Body: ({ children, style, numberOfLines, selectable }: TextProps) => (
    <Text style={[s.body, style]} numberOfLines={numberOfLines} selectable={selectable}>
      {children}
    </Text>
  ),
  Mute: ({ children, style, numberOfLines }: TextProps) => (
    <Text style={[s.mute, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  ),
  Num: ({ children, style }: TextProps) => <Text style={[s.num, style]}>{children}</Text>,
};

/** A scrolling screen with pull to refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
  edges = [],
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  edges?: ("top" | "bottom")[];
}) {
  return (
    <SafeAreaView style={s.screen} edges={edges}>
      <ScrollView
        contentContainerStyle={[padded && s.pad, { paddingBottom: 48 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.lemon} colors={[c.ink]} progressBackgroundColor={c.lemon} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed, style]} android_ripple={{ color: c.line }}>
      {children}
    </Pressable>
  );
}

export function Row({ children, style, gap = space.s }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function Gap({ h = space.l }: { h?: number }) {
  return <View style={{ height: h }} />;
}

type ButtonKind = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  kind = "primary",
  icon,
  busy,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const fg = kind === "primary" ? c.ink : kind === "danger" ? c.coralSoft : c.paper;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, small && s.btnSmall, s[`btn_${kind}`], (disabled || busy) && { opacity: 0.5 }, pressed && s.pressed, style]}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, tone }: { label: string; on?: boolean; onPress?: () => void; tone?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.chip, on && { backgroundColor: c.lemon, borderColor: c.lemon }, tone && !on ? { backgroundColor: tone, borderColor: tone } : null, pressed && s.pressed]}
    >
      <Text style={[s.chipText, (on || tone) && { color: c.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** Pick one of a few values. */
export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} on={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={c.mute} selectionColor={c.lemon} {...input} style={[s.input, input.multiline && { minHeight: 96, textAlignVertical: "top" }, input.style]} />
      {error ? <Text style={[s.mute, { color: c.coralSoft }]}>{error}</Text> : hint ? <Text style={s.mute}>{hint}</Text> : null}
    </View>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.body}>{label}</Text>
        {hint ? <Text style={s.mute}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.lemonDeep, false: c.line }} thumbColor={value ? c.lemon : c.mute} />
    </Pressable>
  );
}

/** A tappable list row. */
export function ListRow({
  title,
  sub,
  right,
  icon,
  onPress,
  left,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  left?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && s.pressed]} android_ripple={{ color: c.line }}>
      {left ?? (icon ? <Icon name={icon} color={c.lemon} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.body} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={s.mute} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {typeof right === "string" ? <Text style={s.num}>{right}</Text> : right}
      {onPress ? <Icon name="chevron-right" color={c.mute} size={18} /> : null}
    </Pressable>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <View style={[s.card, { flex: 1, minWidth: 140, gap: 4 }]}>
      <Text style={s.mute}>{label}</Text>
      <Text style={[s.statValue, accent && { color: c.lemon }]}>{value}</Text>
      {hint ? <Text style={[s.mute, { fontSize: 12 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ gap: space.m, marginTop: space.xl }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={s.h2}>{title}</Text>
        {action}
      </Row>
      {children}
    </View>
  );
}

export function Notice({ text, tone = "warn" }: { text: string; tone?: "warn" | "error" | "ok" | "info" }) {
  const color = { warn: c.amber, error: c.coral, ok: c.lemon, info: c.sky }[tone];
  return (
    <View style={[s.notice, { borderColor: `${color}66`, backgroundColor: `${color}1a` }]}>
      <Text style={s.body}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={c.lemon} size="large" />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={[s.center, { gap: space.l, padding: space.xl }]}>
      <Icon name="wifi-off" size={32} color={c.mute} />
      <Text style={[s.body, { textAlign: "center" }]}>{(error as Error)?.message ?? "Something went wrong."}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} kind="secondary" icon="refresh-cw" /> : null}
    </View>
  );
}

export function Empty({ text, icon = "inbox" }: { text: string; icon?: IconName }) {
  return (
    <View style={[s.card, { alignItems: "center", gap: space.s, paddingVertical: space.xl }]}>
      <Icon name={icon} size={24} color={c.mute} />
      <Text style={[s.mute, { textAlign: "center" }]}>{text}</Text>
    </View>
  );
}

/** Simple bars, one per value. Good enough for a phone and no chart library. */
export function Bars({ values, height = 96, highlight }: { values: number[]; height?: number; highlight?: (i: number) => boolean }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: highlight?.(i) ? c.lemon : `${c.paper}33` }} />
      ))}
    </View>
  );
}

/** A labelled 0 to 1 bar. */
export function Meter({ value, color = c.lemon }: { value: number; color?: string }) {
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: c.line, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", backgroundColor: color }} />
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  pad: { padding: space.l },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.ink },
  display: { fontFamily: font.display, fontSize: 34, color: c.paper, letterSpacing: -0.5 },
  h2: { fontFamily: font.bold, fontSize: 20, color: c.paper },
  body: { fontSize: 16, color: c.paper, lineHeight: 22 },
  mute: { fontSize: 14, color: c.mute, lineHeight: 19 },
  num: { fontSize: 16, color: c.paper, fontVariant: ["tabular-nums"] },
  label: { fontSize: 14, color: c.mute, fontWeight: "600" },
  statValue: { fontFamily: font.bold, fontSize: 26, color: c.paper, fontVariant: ["tabular-nums"] },
  card: { backgroundColor: c.surface, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, padding: space.l },
  pressed: { opacity: 0.75 },
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 52, paddingHorizontal: space.xl, borderRadius: radius.pill },
  btnSmall: { minHeight: 40, paddingHorizontal: space.l },
  btn_primary: { backgroundColor: c.lemon },
  btn_secondary: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line },
  btn_danger: { backgroundColor: `${c.coral}22`, borderWidth: 1, borderColor: `${c.coral}55` },
  btn_ghost: { backgroundColor: "transparent" },
  btnText: { fontSize: 16, fontWeight: "700" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  chipText: { color: c.paper, fontSize: 14, fontWeight: "600" },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.s, paddingHorizontal: 14, paddingVertical: 12, color: c.paper, fontSize: 16 },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.m, paddingVertical: space.s },
  row: { flexDirection: "row", alignItems: "center", gap: space.m, paddingVertical: 14, paddingHorizontal: space.l, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line },
  notice: { borderWidth: 1, borderRadius: radius.s, padding: space.m },
});
