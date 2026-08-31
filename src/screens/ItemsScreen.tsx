import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, SP, money, parseAmount } from '../theme';
import * as db from '../db';
import { Btn, ErrorText, Field } from '../ui';

type Form = { name: string; amount: string };
type ItemKind = 'fixed' | 'needsPrice';
const EMPTY: Form = { name: '', amount: '' };

function NeedsPricePill() {
  return (
    <View style={{ alignSelf: 'center', backgroundColor: C.warningSoft, borderRadius: R.pill, paddingHorizontal: SP(1.5), paddingVertical: SP(0.5), marginLeft: SP(1) }}>
      <Text style={{ fontFamily: F.bodyXBold, fontSize: 10, color: C.warning }}>Unpriced</Text>
    </View>
  );
}

function ItemKindToggle({ value, onChange }: { value: ItemKind; onChange: (value: ItemKind) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: R.input, borderWidth: 1.5, borderColor: C.line, padding: SP(1), marginBottom: SP(3) }}>
      {(['fixed', 'needsPrice'] as const).map((kind) => (
        <Pressable key={kind} onPress={() => onChange(kind)} style={{ flex: 1, alignItems: 'center', paddingVertical: SP(2), borderRadius: R.input, backgroundColor: value === kind ? C.accentSoft : 'transparent' }}>
          <Text style={{ fontFamily: F.bodyXBold, fontSize: 13, color: value === kind ? C.accent : C.inkSoft }}>{kind === 'fixed' ? 'Fixed price' : 'Unpriced'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ItemsScreen() {
  const [items, setItems] = useState<db.Item[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [itemType, setItemType] = useState<ItemKind>('fixed');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Form>(EMPTY);
  const [editType, setEditType] = useState<ItemKind>('fixed');

  const load = () => db.listItems().then(setItems);
  useEffect(() => {
    load();
  }, []);

  const submitNew = async () => {
    const amount = itemType === 'needsPrice' ? null : parseAmount(form.amount);
    if (!form.name.trim()) return setError('Give the item a name.');
    if (itemType === 'fixed' && !amount) return setError('Amount must be a number above zero.');
    try {
      await db.createItem(form.name, amount);
      setForm(EMPTY);
      setItemType('fixed');
      setError(null);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const originalItem = items.find((item) => item.id === editingId);
    const amount = originalItem?.amount == null || editType === 'needsPrice' ? null : parseAmount(editForm.amount);
    if (!editForm.name.trim()) return setError('Give the item a name.');
    if (editType === 'fixed' && !amount) return setError('Amount must be a number above zero.');
    try {
      await db.updateItem(editingId, editForm.name, amount);
      setEditingId(null);
      setError(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const confirmDelete = (item: db.Item) => {
    db.itemUsage(item.id).then((used) => {
      const msg = used > 0
        ? `"${item.name}" is stuffed into ${used} envelope${used === 1 ? '' : 's'}. Deleting it pulls it out of all of them, and envelope totals update.`
        : `Delete "${item.name}" from your library?`;
      Alert.alert('Delete item', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await db.deleteItem(item.id);
            if (editingId === item.id) setEditingId(null);
            load();
          },
        },
      ]);
    });
  };

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: SP(5) }}>
        <Text style={{ fontFamily: F.display, fontSize: 27, color: C.ink, marginBottom: SP(2) }}>Budget Items</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search budget items…"
          placeholderTextColor={C.inkSoft + '99'}
          style={{
            fontFamily: F.body,
            fontSize: 15,
            color: C.ink,
            backgroundColor: C.white,
            borderWidth: 1.5,
            borderColor: C.line,
            borderRadius: R.input,
            paddingHorizontal: SP(3),
            paddingVertical: SP(2.5),
            marginBottom: SP(4),
          }}
        />

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: SP(12) }}>
            <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>Nothing here yet</Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginTop: SP(1), textAlign: 'center' }}>
              Add the things you spend on, then stuff them into envelopes.
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: SP(10) }}>
            <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>No matches</Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginTop: SP(1) }}>Try a different search.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(i) => String(i.id)}
            contentContainerStyle={{ paddingBottom: SP(20) }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setEditingId(item.id);
                  setEditForm({ name: item.name, amount: item.amount == null ? '' : String(item.amount) });
                  setEditType(item.amount == null ? 'needsPrice' : 'fixed');
                  setError(null);
                }}
                style={({ pressed }) => [
                  { backgroundColor: C.white, borderRadius: R.card, borderWidth: 1.5, borderColor: C.line, padding: SP(4), marginBottom: SP(2.5), flexDirection: 'row', alignItems: 'center' },
                  pressed && { transform: [{ translateY: 1 }], borderColor: C.accent },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: C.ink, flexShrink: 1 }}>{item.name}</Text>
                    {item.amount == null ? <NeedsPricePill /> : null}
                  </View>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>Tap to edit</Text>
                </View>
                {item.amount == null ? <View style={{ width: SP(1) }} /> : <Text style={{ fontFamily: F.displayMd, fontSize: 16, color: C.accent, marginRight: SP(3) }}>{money(item.amount)}</Text>}
                <Btn label="Delete" kind="danger" small onPress={() => confirmDelete(item)} />
              </Pressable>
            )}
          />
        )}

      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showForm ? 'Close new budget item form' : 'Create new budget item'}
        onPress={() => {
          setShowForm(!showForm);
          setForm(EMPTY);
          setItemType('fixed');
          setError(null);
        }}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: SP(5),
            bottom: SP(4),
            width: SP(14),
            height: SP(14),
            borderRadius: SP(7),
            backgroundColor: C.accent,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
            shadowColor: C.ink,
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
          pressed && { transform: [{ scale: 0.94 }], opacity: 0.86 },
        ]}
      >
        <Ionicons name={showForm ? 'close' : 'add'} size={29} color={C.onAccent} />
      </Pressable>

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SP(5) }}
        >
          <Pressable accessibilityLabel="Close new budget item form" onPress={() => setShowForm(false)} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000055' }} />
          <View style={{ backgroundColor: C.paper, borderRadius: 28, padding: SP(5), paddingBottom: SP(6), width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SP(3) }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: C.ink, flex: 1 }}>New budget item</Text>
              <Pressable accessibilityLabel="Close new budget item form" onPress={() => setShowForm(false)} hitSlop={12}>
                <Ionicons name="close-circle-outline" size={28} color={C.inkSoft} />
              </Pressable>
            </View>
            <ItemKindToggle value={itemType} onChange={setItemType} />
            {itemType === 'fixed' ? (
              <View style={{ flexDirection: 'row', gap: SP(2) }}>
                <Field label="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Groceries" autoFocus />
                <Field label="Amount" value={form.amount} onChangeText={(t) => setForm({ ...form, amount: t })} placeholder="0.00" keyboardType="decimal-pad" />
              </View>
            ) : (
              <Field label="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Rent" autoFocus fullWidth />
            )}
            <ErrorText msg={error} />
            <Btn label="Add to library" onPress={submitNew} style={{ marginTop: SP(3), alignSelf: 'center' }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={editingId !== null} transparent animationType="fade" onRequestClose={() => { setEditingId(null); setError(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SP(5) }}>
          <Pressable accessibilityLabel="Close edit budget item form" onPress={() => { setEditingId(null); setError(null); }} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000055' }} />
          <View style={{ backgroundColor: C.paper, borderRadius: 28, padding: SP(5), width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SP(3) }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: C.ink, flex: 1 }}>Edit budget item</Text>
              <Pressable accessibilityLabel="Close edit budget item form" onPress={() => { setEditingId(null); setError(null); }} hitSlop={12}>
                <Ionicons name="close-circle-outline" size={28} color={C.inkSoft} />
              </Pressable>
            </View>
            {items.find((item) => item.id === editingId)?.amount == null ? (
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.warning, backgroundColor: C.warningSoft, borderRadius: R.input, padding: SP(3), marginBottom: SP(3) }}>Unpriced items are filled per envelope.</Text>
            ) : (
              <ItemKindToggle value={editType} onChange={setEditType} />
            )}
            {editType === 'fixed' && items.find((item) => item.id === editingId)?.amount != null ? (
              <View style={{ flexDirection: 'row', gap: SP(2) }}>
                <Field label="Name" value={editForm.name} onChangeText={(t) => setEditForm({ ...editForm, name: t })} autoFocus />
                <Field label="Amount" value={editForm.amount} onChangeText={(t) => setEditForm({ ...editForm, amount: t })} keyboardType="decimal-pad" />
              </View>
            ) : (
              <Field label="Name" value={editForm.name} onChangeText={(t) => setEditForm({ ...editForm, name: t })} autoFocus fullWidth />
            )}
            <ErrorText msg={error} />
            <Btn label="Save changes" onPress={saveEdit} style={{ marginTop: SP(4), alignSelf: 'center' }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
