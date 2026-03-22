import { ImportFieldKey } from './import-field.model';

export type ImportPreviewRow = {
  lastname: string;
  firstname: string;
  email: string;
  phone: string;
  address: string;
};

export function mapDataRowToPreview(row: string[], bindings: ImportFieldKey[]): ImportPreviewRow {
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
