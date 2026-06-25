import { ImportFieldKey } from './model/import-field.model';
import { CombinedImportFieldKey } from './model/import-combined-field.model';
import { buildContactImportBag, ContactImportParseOptions } from './import-contact-validation';

export type ImportPreviewRow = {
  kind: 'individual' | 'company';
  lastname: string;
  firstname: string;
  contactLastname?: string;
  email: string;
  phone: string;
  address: string;
};

export type CombinedPreviewRow = ImportPreviewRow & {
  donationDate: string;
  donationAmount: string;
};

function contactBindingsFromCombined(bindings: CombinedImportFieldKey[]): ImportFieldKey[] {
  return bindings.map((b) =>
    b === 'donationDate' || b === 'donationAmount' || b === 'donationType' || b === 'paymentMethod' ? 'skip' : b
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

export function mapDataRowToPreview(
  row: string[],
  bindings: ImportFieldKey[],
  options?: ContactImportParseOptions
): ImportPreviewRow {
  const bag = buildContactImportBag(row, bindings, undefined, options);

  let address = '';
  if (bag.addressLine) {
    address = bag.addressLine;
  } else {
    address = [bag.street, bag.postalCode, bag.city, bag.country].filter(Boolean).join(', ');
  }

  const intendedKind = (bag.enterpriseName ?? '') || (bag.siret ?? '') ? 'company' : 'individual';

  if (intendedKind === 'company') {
    return {
      kind: 'company',
      lastname: bag.enterpriseName ?? '',
      firstname: bag.contactFirstname ?? '',
      contactLastname: bag.contactLastname ?? '',
      email: bag.email ?? '',
      phone: bag.phone ?? '',
      address
    };
  }

  return {
    kind: 'individual',
    lastname: bag.lastname ?? '',
    firstname: bag.firstname ?? '',
    email: bag.email ?? '',
    phone: bag.phone ?? '',
    address
  };
}

export function mapDataRowToCombinedPreview(
  row: string[],
  bindings: CombinedImportFieldKey[],
  options?: ContactImportParseOptions
): CombinedPreviewRow {
  const base = mapDataRowToPreview(row, contactBindingsFromCombined(bindings), options);
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
