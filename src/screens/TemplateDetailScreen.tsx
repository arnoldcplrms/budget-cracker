import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, SP, envelopeOf, money, parseAmount } from '../theme';
import * as db from '../db';
import { exportTemplate } from '../export';
import { Btn, ErrorText, Field } from '../ui';

export default function TemplateDetailScreen({ id, onBack }: { id: number; onBack: () => void }) {
  const [tpl, setTpl] = useState<db.Template | null>(null);
  const [stuffed, setStuffed] = useState<db.Item[]>([]);
  const [library, setLibrary] = useState<db.LibraryItem[]>([]);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'stuffed' | 'add'>('stuffed');
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', amount: '' });
  const [itemScope, setItemScope] = useState<'envelope' | 'library'>('library');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [t, s, lib] = await Promise.all([db.getTemplate(id), db.templateItems(id), db.libraryForTemplate(id)]);
    setTpl(t);
    setStuffed(s);
    setLibrary(lib);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tpl) return null;
  const spent = stuffed.reduce((s, i) => s + i.amount, 0);
  const left = tpl.budget - spent;
  const over = left < 0;
  const spentPercent = (spent / tpl.budget) * 100;
  const progressPercent = Math.min(100, Math.max(0, spentPercent));
  const matches = library.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));

  const addExisting = async (itemId: number) => {
    await db.linkItem(id, itemId);
    setError(null);
    load();
  };

  const addNew = async () => {
    const amount = parseAmount(newItem.amount);
    if (!newItem.name.trim()) return setError('Give the item a name.');
    if (!amount) return setError('Amount must be a number above zero.');
    try {
      const r = await db.createItem(newItem.name, amount, itemScope === 'library');
      await db.linkItem(id, r.lastInsertRowId as number);
      setNewItem({ name: '', amount: '' });
      setItemScope('library');
      setShowNew(false);
      setError(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await exportTemplate(tpl, stuffed);
    } catch (e) {
      setError('Export failed: ' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={{ paddingHorizontal: SP(5), paddingTop: SP(2), paddingBottom: SP(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: SP(3), paddingVertical: SP(1.5) }, pressed && { opacity: 0.75, transform: [{ translateY: 1 }] }]}
          >
            <Ionicons name="arrow-back" size={20} color={C.accent} />
            <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: C.accent, marginLeft: SP(1) }}>Back</Text>
          </Pressable>
          <Btn label={exporting ? 'Exporting…' : 'Export .xlsx'} small onPress={doExport} style={{ minWidth: 110 }} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 25, lineHeight: 30, color: C.ink, marginTop: SP(3), flexShrink: 1 }}>{tpl.name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SP(5), paddingBottom: SP(10) }}>
        <View style={{ backgroundColor: envelopeOf(tpl.id), borderRadius: R.card, borderWidth: 1.5, borderColor: C.ink + '22', padding: SP(4), marginBottom: SP(4) }}>
          <View style={{ borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink + '33', paddingBottom: SP(2.5), marginBottom: SP(3), flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>Allotted</Text>
              <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>{money(tpl.budget)}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>Spent</Text>
              <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>{money(spent)}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>{over ? 'Over by' : 'Left'}</Text>
              <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: over ? C.danger : C.accent }}>{money(left)}</Text>
            </View>
          </View>
          <View style={{ marginTop: SP(1) }}>
            <View style={{ height: SP(3), backgroundColor: C.white + '99', borderRadius: R.pill, overflow: 'hidden' }}>
              <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: over ? C.danger : C.accent, borderRadius: R.pill }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP(1.5) }}>
              <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: over ? C.danger : C.accent }}>{spentPercent.toFixed(1)}% spent</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>{money(spent)} of {money(tpl.budget)}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: R.input, borderWidth: 1.5, borderColor: C.line, padding: SP(1), marginBottom: SP(4) }}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: section === 'stuffed' }} onPress={() => setSection('stuffed')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SP(1), paddingVertical: SP(2), borderRadius: R.input, backgroundColor: section === 'stuffed' ? C.accentSoft : 'transparent' }}>
            <Ionicons name="layers-outline" size={18} color={section === 'stuffed' ? C.accent : C.inkSoft} />
            <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: section === 'stuffed' ? C.accent : C.inkSoft }}>Stuffed ({stuffed.length})</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: section === 'add' }} onPress={() => setSection('add')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SP(1), paddingVertical: SP(2), borderRadius: R.input, backgroundColor: section === 'add' ? C.accentSoft : 'transparent' }}>
            <Ionicons name="add-circle-outline" size={18} color={section === 'add' ? C.accent : C.inkSoft} />
            <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: section === 'add' ? C.accent : C.inkSoft }}>Add items</Text>
          </Pressable>
        </View>

        {section === 'stuffed' ? (
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 19, color: C.ink, marginBottom: SP(2) }}>Stuffed items</Text>
            {stuffed.length === 0 ? <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: SP(4) }}>Nothing inside yet — add items below.</Text> : stuffed.map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: R.input, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: SP(4), paddingVertical: SP(3), marginBottom: SP(2) }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: C.ink, flex: 1 }}>{i.name}</Text>
                <Text style={{ fontFamily: F.bodyXBold, fontSize: 15, color: C.ink, marginRight: SP(3) }}>{money(i.amount)}</Text>
                <Btn label="✕" kind="danger" small onPress={() => db.unlinkItem(id, i.id).then(load)} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.accentSoft, borderRadius: R.input, paddingHorizontal: SP(4), paddingVertical: SP(3), marginTop: SP(1) }}>
              <Text style={{ fontFamily: F.bodyXBold, fontSize: 15, color: C.accent }}>Total added</Text>
              <Text style={{ fontFamily: F.displayMd, fontSize: 17, color: C.accent }}>{money(spent)}</Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 19, color: C.ink, marginBottom: SP(2) }}>Add items</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search your library…" placeholderTextColor={C.inkSoft + '99'} style={{ fontFamily: F.body, fontSize: 15, color: C.ink, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, borderRadius: R.input, paddingHorizontal: SP(3), paddingVertical: SP(2), marginBottom: SP(2) }} />
            {matches.filter((i) => !i.added).map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: R.input, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: SP(4), paddingVertical: SP(2), marginBottom: SP(2) }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.ink }}>{i.name}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>{money(i.amount)}</Text>
                </View>
                <Btn label="+ Add" kind="ghost" small onPress={() => addExisting(i.id)} />
              </View>
            ))}
            <Btn label="+ New budget item" onPress={() => { setShowNew(true); setError(null); }} style={{ alignSelf: 'center', marginTop: SP(2) }} />
          </View>
        )}
      </ScrollView>

      <Modal visible={showNew} transparent animationType="fade" onRequestClose={() => setShowNew(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SP(5) }}>
          <Pressable accessibilityLabel="Close new budget item form" onPress={() => setShowNew(false)} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000055' }} />
          <View style={{ backgroundColor: C.paper, borderRadius: 28, padding: SP(5), width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SP(3) }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: C.ink, flex: 1 }}>New budget item</Text>
              <Pressable accessibilityLabel="Close new budget item form" onPress={() => setShowNew(false)} hitSlop={12}><Ionicons name="close-circle-outline" size={28} color={C.inkSoft} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: SP(2) }}>
              <Field label="Name" value={newItem.name} onChangeText={(t) => setNewItem({ ...newItem, name: t })} placeholder="Petrol" autoFocus />
              <Field label="Amount" value={newItem.amount} onChangeText={(t) => setNewItem({ ...newItem, amount: t })} placeholder="0.00" keyboardType="decimal-pad" />
            </View>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.inkSoft, marginTop: SP(4), marginBottom: SP(2) }}>Add this item to</Text>
            <View style={{ flexDirection: 'row', gap: SP(2) }}>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: itemScope === 'envelope' }} onPress={() => setItemScope('envelope')} style={{ flex: 1, backgroundColor: itemScope === 'envelope' ? C.accentSoft : C.white, borderWidth: itemScope === 'envelope' ? 2 : 1.5, borderColor: itemScope === 'envelope' ? C.accent : C.line, borderRadius: R.input, padding: SP(3) }}>
                <Ionicons name="mail-outline" size={22} color={itemScope === 'envelope' ? C.accent : C.inkSoft} />
                <Text style={{ fontFamily: F.bodyXBold, fontSize: 14, color: C.ink, marginTop: SP(1) }}>This envelope</Text>
                <Text style={{ fontFamily: F.body, fontSize: 11, color: C.inkSoft, marginTop: 2 }}>Only here</Text>
              </Pressable>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: itemScope === 'library' }} onPress={() => setItemScope('library')} style={{ flex: 1, backgroundColor: itemScope === 'library' ? C.accentSoft : C.white, borderWidth: itemScope === 'library' ? 2 : 1.5, borderColor: itemScope === 'library' ? C.accent : C.line, borderRadius: R.input, padding: SP(3) }}>
                <Ionicons name="library-outline" size={22} color={itemScope === 'library' ? C.accent : C.inkSoft} />
                <Text style={{ fontFamily: F.bodyXBold, fontSize: 14, color: C.ink, marginTop: SP(1) }}>Library</Text>
                <Text style={{ fontFamily: F.body, fontSize: 11, color: C.inkSoft, marginTop: 2 }}>Reusable items</Text>
              </Pressable>
            </View>
            <ErrorText msg={error} />
            <Btn label={itemScope === 'library' ? 'Add to library' : 'Add to this envelope'} onPress={addNew} style={{ marginTop: SP(4), alignSelf: 'center' }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
