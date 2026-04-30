import { NewContactInput } from '../../contact/contact.store';
import { EnterpriseSupportKind, IContact } from '../../../core/models/contact.model';
import { ImportFieldKey } from './model/import-field.model';
import { collectImportFieldBag } from './import-map-preview';
import { parseDateFromCell } from './import-parse-cells';

function normalizeCell(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ');
}

function parseOptionalGender(value: string | undefined): IContact['gender'] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = normalizeCell(value);
  if (!n) {
    return undefined;
  }
  if (/\b(homme|male|m)\b/.test(n)) {
    return 'male';
  }
  if (/\b(femme|female|f)\b/.test(n)) {
    return 'female';
  }
  if (/\b(autre|other|o)\b/.test(n)) {
    return 'other';
  }
  return undefined;
}

function parseOptionalOut(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = normalizeCell(value);
  if (!n) {
    return undefined;
  }
  if (/\b(oui|yes|true|1|y|decede|deces|mort|sorti|out)\b/.test(n)) {
    return true;
  }
  if (/\b(non|no|false|0|n)\b/.test(n)) {
    return false;
  }
  return undefined;
}

function parseOptionalPreferredFrequency(
  value: string | undefined
): IContact['preferredFrequencySendingReceipt'] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = normalizeCell(value);
  if (!n) {
    return undefined;
  }
  if (/\b(instantly|instant|immediat|immediatement|immediat|tout de suite)\b/.test(n)) {
    return 'instantly';
  }
  if (/\b(monthly|mensuel|mensuelle)\b/.test(n)) {
    return 'monthly';
  }
  if (/\b(quarterly|trimestriel|trimestrielle|trimestre)\b/.test(n)) {
    return 'quarterly';
  }
  if (/\b(semesterly|semestriel|semestrielle|semestre)\b/.test(n)) {
    return 'semesterly';
  }
  if (/\b(yearly|annuel|annuelle|annee|anne)\b/.test(n)) {
    return 'yearly';
  }
  return undefined;
}

function parseSupportKind(value: string): EnterpriseSupportKind {
  const n = normalizeCell(value);
  if (/\b(mecenat|patronage)\b/.test(n)) {
    return 'patronage';
  }
  if (/\b(sponsoring|sponsor)\b/.test(n)) {
    return 'sponsoring';
  }
  if (/\b(don|donation)\b/.test(n)) {
    return 'donation';
  }
  return 'other';
}

export function mapRowToNewContactInput(
  row: string[],
  bindings: ImportFieldKey[],
  overrides?: Partial<Record<ImportFieldKey, string>>
): NewContactInput | null {
  const bag = collectImportFieldBag(row, bindings);
  if (overrides) {
    for (const [k, v] of Object.entries(overrides) as [ImportFieldKey, string][]) {
      bag[k] = v;
    }
  }
  const email = (bag.email ?? '').trim();
  const firstname = (bag.firstname ?? '').trim();
  const lastname = (bag.lastname ?? '').trim();

  const jobTitle = (bag.jobTitle ?? '').trim() || undefined;
  const birthDate = bag.birthDate ? parseDateFromCell(bag.birthDate) ?? undefined : undefined;
  const gender = parseOptionalGender(bag.gender);
  const out = parseOptionalOut(bag.out);
  const preferredFrequencySendingReceipt = parseOptionalPreferredFrequency(
    bag.preferredFrequencySendingReceipt
  );

  const enterpriseName = (bag.enterpriseName ?? '').trim();
  const siret = (bag.siret ?? '').trim();
  const legalForm = (bag.legalForm ?? '').trim().toUpperCase();
  const supportKind = parseSupportKind((bag.supportKind ?? '').trim());
  const contactFirstname = (bag.contactFirstname ?? '').trim();
  const contactLastname = (bag.contactLastname ?? '').trim();

  if (!email) {
    return null;
  }

  const intendedKind = enterpriseName || siret ? 'company' : 'donor';

  let street = (bag.street ?? '').trim();
  if (bag.addressLine?.trim() && !street) {
    street = bag.addressLine.trim();
  }
  const postalCode = (bag.postalCode ?? '').trim() || '—';
  const city = (bag.city ?? '').trim() || '—';
  const country = (bag.country ?? '').trim() || 'France';
  if (!street) {
    street = '—';
  }

  if (intendedKind === 'company') {
    if (!enterpriseName) {
      return null;
    }
    if (!siret) {
      return null;
    }
    if (!contactFirstname && !contactLastname) {
      return null;
    }

    return {
      kind: 'company',
      email,
      phone: (bag.phone ?? '').trim() || undefined,
      enterprise: {
        name: enterpriseName,
        siret,
        legalForm,
        supportKind,
        address: {
          street,
          postalCode,
          city,
          country,
          phone: (bag.phone ?? '').trim() || undefined
        },
        contactFirstname: contactFirstname || undefined,
        contactLastname: contactLastname || undefined
      },
      out,
      preferredFrequencySendingReceipt
    };
  }

  if (!firstname && !lastname) {
    return null;
  }

  return {
    kind: 'donor',
    firstname: firstname || '—',
    lastname: lastname || '—',
    email,
    phone: (bag.phone ?? '').trim() || undefined,
    jobTitle,
    birthDate,
    gender,
    address: {
      street,
      postalCode,
      city,
      country
    },
    out,
    preferredFrequencySendingReceipt
  };
}
