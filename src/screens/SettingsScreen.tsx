import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, CURRENCIES, F, PALETTES, R, SP } from '../theme';
import { Btn } from '../ui';

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
  const [showAbout, setShowAbout] = useState(false);
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

        <Pressable accessibilityRole="button" onPress={() => setShowAbout(true)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: R.card, borderWidth: 1.5, borderColor: C.line, padding: SP(4) }, pressed && { opacity: 0.75 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.displayMd, fontSize: 19, color: C.ink }}>About</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft, marginTop: 2 }}>Version 1.0.0</Text>
          </View>
          <Ionicons name="information-circle-outline" size={22} color={C.inkSoft} />
        </Pressable>
      </ScrollView>

      <Modal visible={showAbout} transparent animationType="fade" onRequestClose={() => setShowAbout(false)}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SP(5) }}>
          <Pressable accessibilityLabel="Close About dialog" onPress={() => setShowAbout(false)} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000055' }} />
          <View style={{ backgroundColor: C.paper, borderRadius: 28, padding: SP(5), width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SP(3) }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: C.ink, flex: 1 }}>About</Text>
              <Pressable accessibilityLabel="Close About dialog" onPress={() => setShowAbout(false)} hitSlop={12}><Ionicons name="close-circle-outline" size={28} color={C.inkSoft} /></Pressable>
            </View>

            <View style={{ alignItems: 'center', marginBottom: SP(4) }}>
              <Image source={require('../../assets/budget-cracker-logo.png')} accessibilityLabel="Budget Cracker logo" resizeMode="contain" style={{ width: 96, height: 96 }} />
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.displayMd, fontSize: 15, color: C.ink, marginBottom: SP(2) }}>Budget Cracker</Text>
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, textAlign: 'center', marginBottom: SP(1) }}>Created by arnoldcplrms</Text>
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, textAlign: 'center', marginBottom: SP(4) }}>Version 1.0.0</Text>
            </View>

            <View style={{ height: 1.5, backgroundColor: C.line, marginBottom: SP(4) }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.ink, textAlign: 'center' }}>Made with love for my wife, Cha</Text>
            </View>

            <Btn label="Close" onPress={() => setShowAbout(false)} style={{ marginTop: SP(4), alignSelf: 'center' }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
