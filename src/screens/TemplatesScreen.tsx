import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, SP, envelopeOf, money, parseAmount, relativeTime } from '../theme';
import * as db from '../db';
import { Btn, ErrorText, Field } from '../ui';

type Form = { name: string; budget: string };
const EMPTY: Form = { name: '', budget: '' };

const formatDate = (date: Date) => date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

function EnvelopeCard({ row, onOpen, onEdit, onDeleted }: { row: db.TemplateRow; onOpen: () => void; onEdit: () => void; onDeleted: () => void }) {
  const left = row.budget - row.spent;
  const over = left < 0;
  return (
    <View style={{ marginBottom: SP(5) }}>
      {left > 0 && <View style={{ position: 'absolute', top: -SP(3), alignSelf: 'center', width: '55%', height: SP(6), backgroundColor: C.accent, borderRadius: 6 }} />}
      <Pressable onPress={onOpen} style={({ pressed }) => [{ backgroundColor: envelopeOf(row.id), borderRadius: R.card, borderWidth: 1.5, borderColor: C.ink + '22', padding: SP(4) }, pressed && { transform: [{ translateY: 2 }] }]}>
        <View style={{ borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink + '33', paddingBottom: SP(2.5), marginBottom: SP(3) }}>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: C.ink, flexShrink: 1 }}>{row.name}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft, marginTop: 1 }}>Updated {relativeTime(row.updated_at)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: SP(2) }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>Budget</Text>
            <Text style={{ fontFamily: F.bodyXBold, fontSize: 15, color: C.ink, flexShrink: 1 }}>{money(row.budget)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>Spent</Text>
            <Text style={{ fontFamily: F.bodyXBold, fontSize: 15, color: C.ink, flexShrink: 1 }}>{money(row.spent)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>{over ? 'Over by' : 'Left'}</Text>
            <Text style={{ fontFamily: F.displayMd, fontSize: 16, color: over ? C.danger : C.accent, flexShrink: 1 }}>{money(left)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: SP(3), marginTop: SP(3) }}>
          <Btn label="Delete" kind="danger" onPress={() => Alert.alert('Delete envelope', `Delete "${row.name}"? Budget items in your library stay.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => db.deleteTemplate(row.id).then(onDeleted) }])} style={{ minWidth: 82, paddingVertical: SP(1.25) }} small />
          <Btn label="Edit" kind="ghost" onPress={onEdit} style={{ minWidth: 82, paddingVertical: SP(1.25) }} small />
        </View>
      </Pressable>
    </View>
  );
}

export default function TemplatesScreen({ onOpen }: { onOpen: (id: number) => void }) {
  const [rows, setRows] = useState<db.TemplateRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [nameMode, setNameMode] = useState<'custom' | 'dateRange'>('custom');
  const [rangeStart, setRangeStart] = useState(() => new Date());
  const [rangeEnd, setRangeEnd] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  const load = () => db.listTemplates().then(setRows);
  useEffect(() => { load(); }, []);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setNameMode('custom');
    setError(null);
    setDatePickerTarget(null);
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm(EMPTY);
    setNameMode('custom');
    setRangeStart(new Date());
    setRangeEnd(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setError(null);
    setShowForm(true);
  };

  const submit = async () => {
    const budget = parseAmount(form.budget);
    const name = nameMode === 'dateRange' ? `${formatDate(rangeStart)} – ${formatDate(rangeEnd)}` : form.name.trim();
    if (!name) return setError('Give the envelope a name.');
    if (nameMode === 'dateRange' && rangeEnd < rangeStart) return setError('End date must be after the start date.');
    if (!budget) return setError('Budget must be a number above zero.');
    if (editingId != null) await db.updateTemplate(editingId, name, budget);
    else await db.createTemplate(name, budget);
    closeForm();
    load();
  };

  const startEdit = (row: db.TemplateRow) => {
    setEditingId(row.id);
    setForm({ name: row.name, budget: String(row.budget) });
    setNameMode('custom');
    setShowForm(true);
    setError(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: SP(5) }}>
        <Text style={{ fontFamily: F.display, fontSize: 27, color: C.ink, marginBottom: SP(2) }}>Budget List</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search budget lists…" placeholderTextColor={C.inkSoft + '99'} style={{ fontFamily: F.body, fontSize: 15, color: C.ink, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, borderRadius: R.input, paddingHorizontal: SP(3), paddingVertical: SP(2.5), marginBottom: SP(4) }} />
        {rows.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: SP(12) }}>
            <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>No envelopes yet</Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginTop: SP(1) }}>Create an envelope, allot a budget, then stuff budget items into it.</Text>
          </View>
        ) : rows.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase())).length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: SP(10) }}>
            <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>No matches</Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginTop: SP(1) }}>Try a different search.</Text>
          </View>
        ) : (
          <FlatList data={rows.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase()))} keyExtractor={(r) => String(r.id)} contentContainerStyle={{ paddingBottom: SP(20) }} renderItem={({ item }) => <EnvelopeCard row={item} onOpen={() => onOpen(item.id)} onEdit={() => startEdit(item)} onDeleted={load} />} />
        )}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={showForm ? 'Close envelope form' : 'Create new envelope'} onPress={() => showForm ? closeForm() : openNewForm()} style={({ pressed }) => [{ position: 'absolute', right: SP(5), bottom: SP(4), width: SP(14), height: SP(14), borderRadius: SP(7), backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: C.ink, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, pressed && { transform: [{ scale: 0.94 }], opacity: 0.86 }]}>
        <Ionicons name={showForm ? 'close' : 'add'} size={29} color={C.onAccent} />
      </Pressable>

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SP(5) }}>
          <Pressable accessibilityLabel="Close envelope form" onPress={closeForm} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000055' }} />
          <View style={{ backgroundColor: C.paper, borderRadius: 28, padding: SP(5), width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SP(3) }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: C.ink, flex: 1 }}>{editingId != null ? 'Edit envelope' : 'New envelope'}</Text>
              <Pressable accessibilityLabel="Close envelope form" onPress={closeForm} hitSlop={12}><Ionicons name="close-circle-outline" size={28} color={C.inkSoft} /></Pressable>
            </View>

            {editingId == null && (
              <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: R.input, borderWidth: 1.5, borderColor: C.line, padding: SP(1), marginBottom: SP(3) }}>
                <Pressable onPress={() => setNameMode('custom')} accessibilityRole="radio" accessibilityState={{ selected: nameMode === 'custom' }} style={{ flex: 1, alignItems: 'center', paddingVertical: SP(2), borderRadius: R.input, backgroundColor: nameMode === 'custom' ? C.accentSoft : 'transparent' }}>
                  <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: nameMode === 'custom' ? C.accent : C.inkSoft }}>Custom name</Text>
                </Pressable>
                <Pressable onPress={() => setNameMode('dateRange')} accessibilityRole="radio" accessibilityState={{ selected: nameMode === 'dateRange' }} style={{ flex: 1, alignItems: 'center', paddingVertical: SP(2), borderRadius: R.input, backgroundColor: nameMode === 'dateRange' ? C.accentSoft : 'transparent' }}>
                  <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: nameMode === 'dateRange' ? C.accent : C.inkSoft }}>Date range</Text>
                </Pressable>
              </View>
            )}

            {nameMode === 'custom' ? (
              <View style={{ flexDirection: 'row', gap: SP(2) }}>
                <Field label="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Christmas fund" autoFocus={editingId == null} />
                <Field label="Allotted budget" value={form.budget} onChangeText={(t) => setForm({ ...form, budget: t })} placeholder="0.00" keyboardType="decimal-pad" />
              </View>
            ) : (
              <View>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft, marginBottom: SP(1) }}>Envelope name</Text>
                <View style={{ backgroundColor: C.accentSoft, borderRadius: R.input, paddingHorizontal: SP(3), paddingVertical: SP(2.5), marginBottom: SP(3) }}>
                  <Text style={{ fontFamily: F.bodyXBold, fontSize: 16, color: C.accent }}>{formatDate(rangeStart)} – {formatDate(rangeEnd)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: SP(2) }}>
                  <Pressable onPress={() => setDatePickerTarget('start')} style={{ flex: 1, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, borderRadius: R.input, padding: SP(3) }}>
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft }}>Starts</Text>
                    <Text style={{ fontFamily: F.bodyXBold, fontSize: 14, color: C.ink, marginTop: 3 }}>{formatDate(rangeStart)}</Text>
                  </Pressable>
                  <Pressable onPress={() => setDatePickerTarget('end')} style={{ flex: 1, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, borderRadius: R.input, padding: SP(3) }}>
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft }}>Ends</Text>
                    <Text style={{ fontFamily: F.bodyXBold, fontSize: 14, color: C.ink, marginTop: 3 }}>{formatDate(rangeEnd)}</Text>
                  </Pressable>
                </View>
                {datePickerTarget && <DateTimePicker value={datePickerTarget === 'start' ? rangeStart : rangeEnd} mode="date" onChange={(event, date) => { setDatePickerTarget(null); if (!date) return; if (datePickerTarget === 'start') setRangeStart(date); else setRangeEnd(date); }} />}
                <View style={{ marginTop: SP(3) }}>
                  <Field label="Allotted budget" value={form.budget} onChangeText={(t) => setForm({ ...form, budget: t })} placeholder="0.00" keyboardType="decimal-pad" fullWidth />
                </View>
              </View>
            )}
            <ErrorText msg={error} />
            <Btn label={editingId != null ? 'Save changes' : 'Create envelope'} onPress={submit} style={{ marginTop: SP(4), alignSelf: 'center' }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
