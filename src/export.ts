import * as XLSX from 'xlsx';
import { EncodingType, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Template, TemplateItem } from './db';

export async function exportTemplate(t: Template, items: TemplateItem[]) {
  const spent = items.reduce((s, i) => s + (i.checked ? (i.amount ?? 0) : 0), 0);
  const aoa: (string | number)[][] = [
    ['Budget Cracker'],
    ['Template', t.name],
    ['Allotted budget', t.budget],
    [],
    ['Item', 'Amount'],
    ...items.map((i) => [i.name, i.amount ?? 'Unpriced']),
    [],
    ['Total', spent],
    ['Remaining', t.budget - spent],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 30 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  const sheet = t.name.replace(/[\[\]:?*/\\]/g, '').slice(0, 28) || 'Budget';
  XLSX.utils.book_append_sheet(wb, ws, sheet);

  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
  const safe = t.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'budget';
  const file = new File(Paths.cache, `${safe}.xlsx`);
  file.create({ overwrite: true });
  await file.write(b64, { encoding: EncodingType.Base64 });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Export "${t.name}" as Excel`,
  });
}
