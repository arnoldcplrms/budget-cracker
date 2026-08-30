import { Pressable, Text, TextInput, View, ViewStyle } from 'react-native';
import { C, F, R, SP } from './theme';

// Chunky press-down button. Kind picks the fill.
export function Btn({
  label,
  onPress,
  kind = 'primary',
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  small?: boolean;
  style?: ViewStyle;
}) {
  const fills = { primary: [C.accent, C.onAccent], ghost: [C.accentSoft, C.accent], danger: [C.dangerSoft, C.danger] };
  const [bg, fg] = fills[kind];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: R.pill,
          paddingHorizontal: small ? SP(3.5) : SP(5),
          paddingVertical: small ? SP(1.5) : SP(2.5),
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { transform: [{ translateY: 2 }], opacity: 0.9 },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.bodyXBold, color: fg, fontSize: small ? 13 : 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoFocus,
  fullWidth = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  autoFocus?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <View style={fullWidth ? { width: '100%' } : { flex: 1 }}>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft, marginBottom: SP(1) }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.inkSoft + '99'}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        style={{
          fontFamily: F.body,
          fontSize: 15,
          color: C.ink,
          backgroundColor: C.white,
          borderWidth: 1.5,
          borderColor: C.line,
          borderRadius: R.input,
          paddingHorizontal: SP(3),
          paddingVertical: SP(2),
        }}
      />
    </View>
  );
}

export function ErrorText({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.danger, marginTop: SP(1.5) }}>{msg}</Text>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: F.display, fontSize: 20, color: C.ink, marginBottom: SP(2) }}>{children}</Text>
  );
}
