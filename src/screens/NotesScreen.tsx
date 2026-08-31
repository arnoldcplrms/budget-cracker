import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, type KeyboardEvent, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, SP, relativeTime } from '../theme';
import * as db from '../db';

// ponytail: formatting is per block (line), not per text span — covers B/I/U, size and
// checkboxes without a rich-text engine. Span-level styling would need a real editor lib.
type Block = {
  text: string;
  check: boolean;
  checked: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  size: 0 | 1 | 2;
};

const SIZES = [14, 17, 22];

const blank = (): Block => ({ text: '', check: false, checked: false, bold: false, italic: false, underline: false, size: 1 });

function parseDoc(content: string): Block[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length && parsed.every((b) => b && typeof b.text === 'string')) {
      return parsed.map((b: Partial<Block>) => ({ ...blank(), ...b }));
    }
  } catch {
    // fall through to a fresh doc
  }
  return [blank()];
}

const docTitle = (content: string) => parseDoc(content).map((b) => b.text.trim()).find(Boolean) || 'Untitled note';

const docPreview = (content: string) => {
  const lines = parseDoc(content).map((b) => b.text.trim()).filter(Boolean);
  return lines.slice(1).join('  ') || 'No extra text';
};

const blockFont = (b: Block) =>
  b.italic ? (b.bold ? 'Nunito_700Bold_Italic' : 'Nunito_400Regular_Italic') : b.bold ? F.bodyBold : F.body;

const blockDeco = (b: Block): 'none' | 'underline' | 'line-through' | 'underline line-through' =>
  b.check && b.checked
    ? b.underline
      ? 'underline line-through'
      : 'line-through'
    : b.underline
      ? 'underline'
      : 'none';

function ToolBtn({ label, active, onPress, accessibilityLabel }: { label: React.ReactNode; active: boolean; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.accentSoft : 'transparent' },
        pressed && { opacity: 0.6 },
      ]}
    >
      {label}
    </Pressable>
  );
}

function NoteEditor({ noteId, onBack }: { noteId: number | null; onBack: () => void }) {
  const [blocks, setBlocks] = useState<Block[]>([blank()]);
  const [focus, setFocus] = useState(0);
  const [ready, setReady] = useState(noteId == null);
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);
  // Edge-to-edge Android doesn't resize the window for the keyboard, so track where its top
  // edge actually is (endCoordinates.height over-reports on some devices) and measure our own
  // bottom edge — overlap = how much of the editor the keyboard covers. No fixed numbers.
  const [kbOverlap, setKbOverlap] = useState(0);
  const insets = useSafeAreaInsets();
  const rootRef = useRef<View | null>(null);
  const idRef = useRef<number | null>(noteId);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const root = rootRef.current;
      const kbTop = e.endCoordinates.screenY;
      if (!root) return setKbOverlap(e.endCoordinates.height);
      root.measureInWindow((_x, y, _w, h) => setKbOverlap(Math.max(0, y + h - kbTop)));
    };
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (noteId == null) return;
    db.getNote(noteId).then((note) => {
      if (note) setBlocks(parseDoc(note.content));
      setReady(true);
    });
  }, [noteId]);

  const save = () => {
    // ponytail: don't create empty notes; a saved note emptied by hand is deleted via the trash icon
    if (!ready || (idRef.current == null && blocks.length === 1 && !blocks[0].text.trim())) return;
    void db.saveNote(idRef.current, JSON.stringify(blocks)).then((newId) => {
      idRef.current = newId;
    });
  };

  // Debounced autosave while typing.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(save, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, ready]);

  useEffect(() => {
    if (pendingFocus == null) return;
    const t = setTimeout(() => {
      refs.current[pendingFocus]?.focus();
      setPendingFocus(null);
    }, 60);
    return () => clearTimeout(t);
  }, [pendingFocus]);

  const patch = (i: number, changes: Partial<Block>) =>
    setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...changes } : b)));

  const onText = (i: number, t: string) => {
    if (t.includes('\n')) {
      // Enter key or pasted newlines: split into blocks that inherit the current formatting.
      const parts = t.split('\n').map((p) => ({ ...blocks[i], text: p }));
      setBlocks((bs) => [...bs.slice(0, i), ...parts, ...bs.slice(i + 1)]);
      setPendingFocus(i + parts.length - 1);
    } else {
      patch(i, { text: t });
    }
  };

  const removeLine = (i: number) => {
    setBlocks((bs) => bs.filter((_, j) => j !== i));
    setPendingFocus(Math.max(0, i - 1));
  };

  const confirmDelete = () => {
    if (idRef.current == null) return onBack();
    Alert.alert('Delete note', 'This note will be gone for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void db.deleteNote(idRef.current!).then(onBack) },
    ]);
  };

  const cur = blocks[Math.min(focus, blocks.length - 1)] ?? blank();

  return (
    <View ref={rootRef} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP(4), paddingVertical: SP(2) }}>
        <Pressable accessibilityLabel="Back to notes" onPress={() => { save(); onBack(); }} hitSlop={10} style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
          <Ionicons name="chevron-back" size={27} color={C.ink} />
        </Pressable>
        <TextInput
          value={blocks[0].text}
          onChangeText={(t) => {
            if (!t.includes('\n')) patch(0, { text: t });
          }}
          onFocus={() => setFocus(0)}
          placeholder="Title"
          placeholderTextColor={C.inkSoft + '99'}
          multiline
          style={{ flex: 1, fontFamily: F.displayMd, fontSize: 20, color: C.ink, textAlign: 'center', marginHorizontal: SP(2), paddingVertical: 0 }}
        />
        <Pressable accessibilityLabel="Delete note" onPress={confirmDelete} hitSlop={10} style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
          <Ionicons name="trash-outline" size={22} color={C.danger} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SP(5), paddingBottom: SP(6) }} keyboardShouldPersistTaps="handled">
        {blocks.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
            {b.check ? (
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: b.checked }} accessibilityLabel="Toggle done" onPress={() => patch(i, { checked: !b.checked })} hitSlop={8}>
                <Ionicons name={b.checked ? 'checkbox' : 'square-outline'} size={22} color={b.checked ? C.accent : C.inkSoft} />
              </Pressable>
            ) : null}
            <TextInput
              ref={(r) => {
                refs.current[i] = r;
              }}
              value={b.text}
              onChangeText={(t) => onText(i, t)}
              onFocus={() => setFocus(i)}
              multiline
              blurOnSubmit={false}
              placeholder={i === 0 ? 'Start writing…' : undefined}
              placeholderTextColor={C.inkSoft + '99'}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && b.text === '' && blocks.length > 1) removeLine(i);
              }}
              style={{
                flex: 1,
                fontFamily: blockFont(b),
                fontSize: SIZES[b.size],
                color: b.check && b.checked ? C.inkSoft : C.ink,
                textDecorationLine: blockDeco(b),
                paddingTop: 2,
                paddingBottom: 2,
                paddingHorizontal: b.check ? SP(2.5) : 0,
              }}
            />
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP(1), paddingHorizontal: SP(3), paddingVertical: SP(2), backgroundColor: C.white, borderTopWidth: 1.5, borderTopColor: C.line, marginBottom: kbOverlap || insets.bottom }}>
        <ToolBtn accessibilityLabel="Bold" active={cur.bold} onPress={() => patch(focus, { bold: !cur.bold })} label={<Text style={{ fontFamily: F.display, fontSize: 18, color: cur.bold ? C.accent : C.inkSoft }}>B</Text>} />
        <ToolBtn accessibilityLabel="Italic" active={cur.italic} onPress={() => patch(focus, { italic: !cur.italic })} label={<Text style={{ fontFamily: 'Nunito_400Regular_Italic', fontSize: 18, color: cur.italic ? C.accent : C.inkSoft }}>I</Text>} />
        <ToolBtn accessibilityLabel="Underline" active={cur.underline} onPress={() => patch(focus, { underline: !cur.underline })} label={<Text style={{ fontFamily: F.body, fontSize: 18, color: cur.underline ? C.accent : C.inkSoft, textDecorationLine: 'underline' }}>U</Text>} />
        <ToolBtn
          accessibilityLabel="Text size"
          active={cur.size !== 1}
          onPress={() => patch(focus, { size: ((cur.size + 1) % 3) as Block['size'] })}
          label={<Text style={{ fontFamily: F.bodyXBold, fontSize: 14, color: cur.size !== 1 ? C.accent : C.inkSoft }}>Aa</Text>}
        />
        <ToolBtn accessibilityLabel="Checkbox line" active={cur.check} onPress={() => patch(focus, { check: !cur.check, checked: false })} label={<Ionicons name={cur.check ? 'checkbox' : 'square-outline'} size={22} color={cur.check ? C.accent : C.inkSoft} />} />
        <View style={{ flex: 1 }} />
        <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft }}>{['S', 'M', 'L'][cur.size]}</Text>
      </View>
    </View>
  );
}

const confirmDeleteNote = (note: db.Note, onDeleted: () => void) =>
  Alert.alert('Delete note', `Delete "${docTitle(note.content)}"? This can't be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => void db.deleteNote(note.id).then(onDeleted) },
  ]);

export default function NotesScreen() {
  const [notes, setNotes] = useState<db.Note[]>([]);
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const load = () => db.listNotes().then(setNotes);
  useEffect(() => {
    load();
  }, []);

  if (editing !== null) {
    return <NoteEditor noteId={editing === 'new' ? null : editing} onBack={() => { setEditing(null); load(); }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: SP(5) }}>
        <Text style={{ fontFamily: F.display, fontSize: 27, color: C.ink, marginBottom: SP(4) }}>Notes</Text>
        {notes.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: SP(12) }}>
            <Text style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>No notes yet</Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginTop: SP(1) }}>Tap + to jot down a note or checklist.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: SP(20) }} showsVerticalScrollIndicator={false}>
            {notes.map((note) => (
              <View
                key={note.id}
                style={{ backgroundColor: C.white, borderRadius: R.card, borderWidth: 1.5, borderColor: C.line, padding: SP(4), marginBottom: SP(3), flexDirection: 'row', alignItems: 'center' }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open note ${docTitle(note.content)}`}
                  onPress={() => setEditing(note.id)}
                  style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}
                >
                  <Text numberOfLines={1} style={{ fontFamily: F.displayMd, fontSize: 18, color: C.ink }}>
                    {docTitle(note.content)}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft, marginTop: SP(1) }}>
                    {docPreview(note.content)}
                  </Text>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.inkSoft, marginTop: SP(2) }}>{relativeTime(note.updated_at)}</Text>
                </Pressable>
                <Pressable accessibilityLabel={`Delete note ${docTitle(note.content)}`} onPress={() => confirmDeleteNote(note, load)} hitSlop={8} style={({ pressed }) => [{ marginLeft: SP(2) }, pressed && { opacity: 0.6 }]}>
                  <Ionicons name="trash-outline" size={20} color={C.danger} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create new note"
        onPress={() => setEditing('new')}
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
        <Ionicons name="add" size={29} color={C.onAccent} />
      </Pressable>
    </View>
  );
}
