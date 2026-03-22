import { ImportFieldKey } from './import-field.model';
import { CombinedImportFieldKey } from './import-combined-field.model';

export type ImportPreviewRow = {
  lastname: string;
  firstname: string;
  email: string;
  phone: string;
  address: string;
};

export type CombinedPreviewRow = ImportPreviewRow & {
  donationDate: string;
  donationAmount: string;
};

function donorBindingsFromCombined(bindings: CombinedImportFieldKey[]): ImportFieldKey[] {
  return bindings.map((b) =>
    b === 'donationDate' || b === 'donationAmount' ? 'skip' : b
  ) as ImportFieldKey[];
}

export function collectImportFieldBag(
  row: string[],
  bindings: ImportFieldKey[]
): Partial<Record<ImportFieldKey, string>> {
  const bag: Partial<Record<ImportFieldKey, string>> = {};
  const len = Math.min(row.length, bindings.length);
  for (let i = 0; i < len; i++) {
    const f = bindings[i];
    if (f === 'skip') {
      continue;
    }
    const v = String(row[i] ?? '').trim();
    if (!v) {
      continue;
    }
    bag[f] = v;
  }
  return bag;
}

export function mapDataRowToPreview(row: string[], bindings: ImportFieldKey[]): ImportPreviewRow {
  const bag = collectImportFieldBag(row, bindings);

  let address = '';
  if (bag.addressLine) {
    address = bag.addressLine;
  } else {
    address = [bag.street, bag.postalCode, bag.city, bag.country].filter(Boolean).join(', ');
  }

  return {
    lastname: bag.lastname ?? '',
    firstname: bag.firstname ?? '',
    email: bag.email ?? '',
    phone: bag.phone ?? '',
    address
  };
}

export function mapDataRowToCombinedPreview(
  row: string[],
  bindings: CombinedImportFieldKey[]
): CombinedPreviewRow {
  const base = mapDataRowToPreview(row, donorBindingsFromCombined(bindings));
  let donationDate = '';
  let donationAmount = '';
  const len = Math.min(row.length, bindings.length);
  for (let i = 0; i < len; i++) {
    if (bindings[i] === 'donationDate') {
      donationDate = String(row[i] ?? '').trim();
    }
    if (bindings[i] === 'donationAmount') {
      donationAmount = String(row[i] ?? '').trim();
    }
  }
  return { ...base, donationDate, donationAmount };
}
