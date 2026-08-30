import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { C, CURRENCIES, F, PALETTES, R, SP } from '../theme';

function ChoiceRow({ label, detail, active, onPress, preview }: { label: string; detail?: string; active: boolean; onPress: () => void; preview?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: R.input, borderWidth: active ? 2 : 1.5, borderColor: active ? C.accent : C.line, padding: SP(3), marginBottom: SP(2) }, pressed && { opacity: 0.75 }]}>
      {preview}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodyXBold, fontSize: 16, color: C.ink }}>{label}</Text>
        {detail ? <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{detail}</Text> : null}
      </View>
      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={active ? C.accent : C.line} />
    </Pressable>
  );
}

function SettingsSection({ title, summary, expanded, onPress, children }: { title: string; summary: string; expanded: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: SP(3) }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: expanded ? R.input : R.card, borderWidth: 1.5, borderColor: expanded ? C.accent : C.line, padding: SP(4) }, pressed && { opacity: 0.75 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.displayMd, fontSize: 19, color: C.ink }}>{title}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft, marginTop: 2 }}>{summary}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={C.inkSoft} />
      </Pressable>
      {expanded ? <View style={{ marginTop: SP(2) }}>{children}</View> : null}
    </View>
  );
}

export default function SettingsScreen({ paletteId, currencyId, onPaletteChange, onCurrencyChange }: { paletteId: number; currencyId: number; onPaletteChange: (id: number) => void; onCurrencyChange: (id: number) => void }) {
  const [expanded, setExpanded] = useState<'theme' | 'currency' | null>(null);
  const palette = PALETTES[paletteId] ?? PALETTES[0];
  const currency = CURRENCIES[currencyId] ?? CURRENCIES[0];
  const toggle = (section: 'theme' | 'currency') => setExpanded(expanded === section ? null : section);

  return (
    <View style={{ flex: 1, paddingHorizontal: SP(5) }}>
      <ScrollView contentContainerStyle={{ paddingBottom: SP(8) }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: F.display, fontSize: 27, color: C.ink, marginBottom: SP(1) }}>Settings</Text>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: SP(5) }}>Set the look and money format for Budget Cracker.</Text>

        <SettingsSection title="Theme" summary={palette.name} expanded={expanded === 'theme'} onPress={() => toggle('theme')}>
          {PALETTES.map((item, id) => <ChoiceRow key={item.name} label={item.name} active={paletteId === id} onPress={() => onPaletteChange(id)} preview={<View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: item.paper, borderWidth: 1, borderColor: item.line, alignItems: 'center', justifyContent: 'center', marginRight: SP(3) }}><View style={{ width: 22, height: 12, borderRadius: 5, backgroundColor: item.accent }} /></View>} />)}
        </SettingsSection>

        <SettingsSection title="Currency" summary={`${currency.symbol} ${currency.name} (${currency.code})`} expanded={expanded === 'currency'} onPress={() => toggle('currency')}>
          {CURRENCIES.map((item, id) => <ChoiceRow key={item.code} label={`${item.symbol}  ${item.name}`} detail={item.code} active={currencyId === id} onPress={() => onCurrencyChange(id)} preview={<View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: SP(3) }}><Text style={{ fontFamily: F.displayMd, fontSize: 20, color: C.accent }}>{item.symbol}</Text></View>} />)}
        </SettingsSection>
      </ScrollView>
    </View>
  );
}
