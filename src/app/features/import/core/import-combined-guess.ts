import { guessFieldForHeader } from './import-column-guess';
import { guessDonationFieldForHeader } from './import-donation-guess';
import { CombinedImportFieldKey } from './model/import-combined-field.model';

export function guessCombinedMappingForHeaders(headers: string[]): CombinedImportFieldKey[] {
  const raw = headers.map((h): CombinedImportFieldKey => {
    const donor = guessFieldForHeader(h);
    if (donor !== 'skip') {
      return donor;
    }
    const d = guessDonationFieldForHeader(h);
    if (d === 'donationAmount' || d === 'donationDate') {
      return d;
    }
    return 'skip';
  });
  const used = new Set<string>();
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
