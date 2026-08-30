import * as SQLite from 'expo-sqlite';

export type Item = { id: number; name: string; amount: number; updated_at: number };
export type Template = { id: number; name: string; budget: number; updated_at: number };
export type TemplateRow = Template & { spent: number };
export type LibraryItem = Item & { added: number };

const db = SQLite.openDatabaseSync('budget-cracker.db');
let initPromise: Promise<void> | null = null;

export function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await db.execAsync(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  amount REAL NOT NULL CHECK(amount > 0),
  is_global INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS templates(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  budget REAL NOT NULL CHECK(budget > 0),
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS template_items(
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY(template_id, item_id)
);
CREATE TABLE IF NOT EXISTS settings(
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);`);

  // Existing installs predate envelope-only items; old rows are global by default.
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(items)');
  if (!columns.some((column) => column.name === 'is_global')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN is_global INTEGER NOT NULL DEFAULT 1');
  }
  if (!columns.some((column) => column.name === 'updated_at')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0');
  }
  await db.runAsync('UPDATE items SET updated_at = ? WHERE updated_at = 0', Date.now());

  const templateColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(templates)');
  if (!templateColumns.some((column) => column.name === 'updated_at')) {
    await db.execAsync('ALTER TABLE templates ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0');
  }
  await db.runAsync('UPDATE templates SET updated_at = ? WHERE updated_at = 0', Date.now());
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

// --- Library items (live amounts: templates always SUM from items) ---
export const listItems = () =>
  db.getAllAsync<Item>('SELECT * FROM items WHERE is_global = 1 ORDER BY name COLLATE NOCASE');

export async function createItem(name: string, amount: number, isGlobal = true) {
  try {
    return await db.runAsync('INSERT INTO items(name, amount, is_global, updated_at) VALUES(?, ?, ?, ?)', name.trim(), amount, isGlobal ? 1 : 0, Date.now());
  } catch {
    throw new Error(`"${name.trim()}" already exists in your library.`);
  }
}

export async function updateItem(id: number, name: string, amount: number) {
  try {
    const result = await db.runAsync(
      'UPDATE items SET name = ?, amount = ?, updated_at = ? WHERE id = ?',
      name.trim(),
      amount,
      Date.now(),
      id
    );
    await db.runAsync(
      'UPDATE templates SET updated_at = ? WHERE id IN (SELECT template_id FROM template_items WHERE item_id = ?)',
      Date.now(),
      id
    );
    return result;
  } catch {
    throw new Error(`"${name.trim()}" already exists in your library.`);
  }
}

export async function deleteItem(id: number) {
  await db.runAsync(
    'UPDATE templates SET updated_at = ? WHERE id IN (SELECT template_id FROM template_items WHERE item_id = ?)',
    Date.now(),
    id
  );
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

export const itemUsage = async (id: number) =>
  (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM template_items WHERE item_id = ?', id))!.n;

// --- Templates ---
export const listTemplates = () =>
  db.getAllAsync<TemplateRow>(`
    SELECT t.*, COALESCE(SUM(i.amount), 0) spent
    FROM templates t
    LEFT JOIN template_items ti ON ti.template_id = t.id
    LEFT JOIN items i ON i.id = ti.item_id
    GROUP BY t.id
    ORDER BY t.updated_at DESC, t.id DESC`);

export const createTemplate = (name: string, budget: number) =>
  db.runAsync('INSERT INTO templates(name, budget, updated_at) VALUES(?, ?, ?)', name.trim(), budget, Date.now());

export const updateTemplate = (id: number, name: string, budget: number) =>
  db.runAsync('UPDATE templates SET name = ?, budget = ?, updated_at = ? WHERE id = ?', name.trim(), budget, Date.now(), id);

// Cascade removes links; orphaned envelope-only items are not part of the library and can go too.
export async function deleteTemplate(id: number) {
  await db.runAsync('DELETE FROM templates WHERE id = ?', id);
  await db.runAsync('DELETE FROM items WHERE is_global = 0 AND NOT EXISTS (SELECT 1 FROM template_items WHERE item_id = items.id)');
}

export const getPaletteId = async () => {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'palette'");
  const id = Number(row?.value);
  return Number.isInteger(id) && id >= 0 ? id : 0;
};

export const savePaletteId = (id: number) =>
  db.runAsync("INSERT OR REPLACE INTO settings(key, value) VALUES('palette', ?)", String(id));

export const getCurrencyId = async () => {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'currency'");
  const id = Number(row?.value);
  return Number.isInteger(id) && id >= 0 ? id : 0;
};

export const saveCurrencyId = (id: number) =>
  db.runAsync("INSERT OR REPLACE INTO settings(key, value) VALUES('currency', ?)", String(id));

export const getTemplate = (id: number) =>
  db.getFirstAsync<Template>('SELECT * FROM templates WHERE id = ?', id);

// --- Template <-> item links ---
export const templateItems = (id: number) =>
  db.getAllAsync<Item>(
    `SELECT i.* FROM items i
     JOIN template_items ti ON ti.item_id = i.id
     WHERE ti.template_id = ?
     ORDER BY i.name COLLATE NOCASE`,
    id
  );

export const templateSpent = async (id: number) =>
  (
    await db.getFirstAsync<{ s: number }>(
      `SELECT COALESCE(SUM(i.amount), 0) s
       FROM template_items ti JOIN items i ON i.id = ti.item_id
       WHERE ti.template_id = ?`,
      id
    )
  )!.s;

export const libraryForTemplate = (id: number) =>
  db.getAllAsync<LibraryItem>(
    `SELECT i.*, EXISTS(SELECT 1 FROM template_items ti
                        WHERE ti.item_id = i.id AND ti.template_id = ?) added
     FROM items i WHERE i.is_global = 1 ORDER BY i.name COLLATE NOCASE`,
    id
  );

export async function linkItem(templateId: number, itemId: number) {
  await db.runAsync('INSERT OR IGNORE INTO template_items(template_id, item_id) VALUES(?, ?)', templateId, itemId);
  await db.runAsync('UPDATE templates SET updated_at = ? WHERE id = ?', Date.now(), templateId);
}

export async function unlinkItem(templateId: number, itemId: number) {
  await db.runAsync('DELETE FROM template_items WHERE template_id = ? AND item_id = ?', templateId, itemId);
  await db.runAsync('UPDATE templates SET updated_at = ? WHERE id = ?', Date.now(), templateId);
  await db.runAsync('DELETE FROM items WHERE id = ? AND is_global = 0 AND NOT EXISTS (SELECT 1 FROM template_items WHERE item_id = items.id)', itemId);
}
