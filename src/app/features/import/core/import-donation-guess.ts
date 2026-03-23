import { normalizeHeaderLabel } from './import-column-guess';
import { DonationImportFieldKey } from './model/import-donation-field.model';

type DRule = { field: DonationImportFieldKey; weight: number; test: (n: string) => boolean };

const DONATION_RULES: DRule[] = [
  {
    field: 'donationAmount',
    weight: 10,
    test: (n) =>
      /\bmontant\b/.test(n) ||
      /\bamount\b/.test(n) ||
      /\bsomme\b/.test(n) ||
      /\bcotisation\b/.test(n) ||
      /\bdon\b/.test(n) ||
      /€/.test(n) ||
      /\beur\b/.test(n)
  },
  {
    field: 'donationDate',
    weight: 10,
    test: (n) =>
      /\bdate\b/.test(n) ||
      /\bjour\b/.test(n) ||
      /\bwhen\b/.test(n) ||
      /\bannee\b/.test(n) ||
      /\bannee\b/.test(n)
  },
  {
    field: 'donorEmail',
    weight: 9,
    test: (n) =>
      /\bemail\b/.test(n) ||
      /\bmail\b/.test(n) ||
      /\bcourriel\b/.test(n) ||
      /\bdonateur\b.*\bmail\b/.test(n) ||
      /\bcontact\b.*\bmail\b/.test(n)
  }
];

export function guessDonationFieldForHeader(headerCell: string): DonationImportFieldKey {
  const n = normalizeHeaderLabel(headerCell);
  if (!n) {
    return 'skip';
  }
  let best: DonationImportFieldKey = 'skip';
  let bestW = 0;
  for (const r of DONATION_RULES) {
    if (r.test(n) && r.weight > bestW) {
      bestW = r.weight;
      best = r.field;
    }
  }
  return best;
}

export function guessDonationMappingForHeaders(headers: string[]): DonationImportFieldKey[] {
  const raw = headers.map((h) => guessDonationFieldForHeader(h));
  const used = new Set<DonationImportFieldKey>();
  used.add('skip');
  const out = [...raw];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < out.length; i++) {
      const f = out[i];
      if (f === 'skip') {
        continue;
      }
      if (used.has(f)) {
        out[i] = 'skip';
      } else {
        used.add(f);
      }
    }
  }
  return out;
}
