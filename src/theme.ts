export type Palette = {
  name: string;
  paper: string;
  white: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  envelopes: string[];
};

export const PALETTES: Palette[] = [
  {
    name: 'Envelope',
    paper: '#FAF6EE',
    white: '#FFFDF8',
    ink: '#2B2723',
    inkSoft: '#7A7065',
    line: '#E5DCC9',
    accent: '#1E6B4A',
    onAccent: '#FFFDF8',
    accentSoft: '#E2EFE7',
    danger: '#C4482F',
    dangerSoft: '#F8E4DC',
    envelopes: ['#CFE8D6', '#F7E4B0', '#CBE0F2', '#F3D5D0'],
  },
  {
    name: 'Berry',
    paper: '#F9F5FB',
    white: '#FFFCFF',
    ink: '#302735',
    inkSoft: '#776B7D',
    line: '#E5D9EA',
    accent: '#8651A8',
    onAccent: '#FFFCFF',
    accentSoft: '#EEE3F4',
    danger: '#C54D62',
    dangerSoft: '#F8E1E6',
    envelopes: ['#E9D8F2', '#F7E3B3', '#D8E7F5', '#F4D4DF'],
  },
  {
    name: 'Ocean',
    paper: '#F2F8FA',
    white: '#FCFFFF',
    ink: '#203139',
    inkSoft: '#687B82',
    line: '#D6E5E9',
    accent: '#167C8C',
    onAccent: '#FCFFFF',
    accentSoft: '#DDF0F1',
    danger: '#C45B4E',
    dangerSoft: '#F7E3DF',
    envelopes: ['#CBE9E5', '#F5E5B7', '#CFE1F2', '#F2D6D3'],
  },
  {
    name: 'Apricot',
    paper: '#FFF7EF',
    white: '#FFFDFC',
    ink: '#382A25',
    inkSoft: '#806D62',
    line: '#EEDDCF',
    accent: '#C76734',
    onAccent: '#FFFDFC',
    accentSoft: '#F8E6D8',
    danger: '#B84848',
    dangerSoft: '#F8DFDB',
    envelopes: ['#D9E9D2', '#F8DFAC', '#D4E4F0', '#F5D0C4'],
  },
  {
    name: 'Rose',
    paper: '#FFF5F7',
    white: '#FFFCFD',
    ink: '#3B272E',
    inkSoft: '#806B73',
    line: '#EEDBE1',
    accent: '#C14B70',
    onAccent: '#FFFCFD',
    accentSoft: '#F7E1E8',
    danger: '#B74747',
    dangerSoft: '#F8DFDF',
    envelopes: ['#D8E9D7', '#F8E3B3', '#D8E6F2', '#F4CFDA'],
  },
  {
    name: 'Lemon',
    paper: '#FFFCF0',
    white: '#FFFFFB',
    ink: '#393321',
    inkSoft: '#81785B',
    line: '#EAE1B8',
    accent: '#947315',
    onAccent: '#FFFFFB',
    accentSoft: '#F5EDC9',
    danger: '#B74C3C',
    dangerSoft: '#F8E0DA',
    envelopes: ['#D9EAD0', '#F8E4A5', '#D3E4EF', '#F3D4D0'],
  },
  {
    name: 'Indigo',
    paper: '#F5F6FF',
    white: '#FDFDFF',
    ink: '#292A40',
    inkSoft: '#70728C',
    line: '#DDE0F2',
    accent: '#4E5FB7',
    onAccent: '#FDFDFF',
    accentSoft: '#E7E9FA',
    danger: '#BD5360',
    dangerSoft: '#F7E0E5',
    envelopes: ['#D7E9E2', '#F7E5B5', '#D6E3F5', '#EAD7EE'],
  },
  {
    name: 'Forest',
    paper: '#F3F8F3',
    white: '#FCFFFC',
    ink: '#25372D',
    inkSoft: '#6B7C70',
    line: '#D8E7DA',
    accent: '#2E7651',
    onAccent: '#FCFFFC',
    accentSoft: '#DDEEE1',
    danger: '#BC5547',
    dangerSoft: '#F7E1DC',
    envelopes: ['#CFE7D1', '#F5E4B5', '#D2E3EF', '#F0D5D4'],
  },
];

export const CURRENCIES = [
  { name: 'Philippine Peso', code: 'PHP', symbol: '₱' },
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'Japanese Yen', code: 'JPY', symbol: '¥' },
];

export const C = { ...PALETTES[0], ...CURRENCIES[0] };

export function applyPalette(id: number) {
  const palette = PALETTES[id] ?? PALETTES[0];
  const { name: _name, ...colors } = palette;
  Object.assign(C, colors);
}

export function applyCurrency(id: number) {
  Object.assign(C, CURRENCIES[id] ?? CURRENCIES[0]);
}

export const envelopeOf = (id: number) => C.envelopes[id % C.envelopes.length];

export const F = {
  display: 'Baloo2_700Bold',
  displayMd: 'Baloo2_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
  bodyXBold: 'Nunito_800ExtraBold',
};

export const R = { card: 22, input: 14, pill: 999 };
export const SP = (n: number) => n * 4;

export const money = (n: number) =>
  C.symbol +
  Math.abs(n).toLocaleString(C.code === 'JPY' ? 'ja-JP' : 'en-PH', {
    minimumFractionDigits: C.code === 'JPY' ? 0 : 2,
    maximumFractionDigits: C.code === 'JPY' ? 0 : 2,
  });

export const relativeTime = (timestamp: number) => {
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const days = Math.floor(minutes / 1440);
  if (days < 1) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

export const parseAmount = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
