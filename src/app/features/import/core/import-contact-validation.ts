import { ImportFieldKey } from './model/import-field.model';
import { collectImportFieldBag } from './import-map-preview';
import {
  normalizeAddressKey,
  normalizeIdentityPart
} from '../../../core/utils/contact-match.util';

export type FullNameOrder = 'firstname-lastname' | 'lastname-firstname';

export type ContactImportParseOptions = {
  fullNameOrder?: FullNameOrder;
};

const DEFAULT_FULL_NAME_ORDER: FullNameOrder = 'firstname-lastname';

export type ImportDatasetIssueSeverity = 'error' | 'warning';

export type ImportDatasetIssue = {
  severity: ImportDatasetIssueSeverity;
  code: string;
  message: string;
  columnIndex?: number;
  fieldKey?: ImportFieldKey;
};

export type InFileContactDuplicateGroup = {
  key: string;
  label: string;
  rowNumbers: number[];
};

export type ContactImportDatasetAnalysis = {
  issues: ImportDatasetIssue[];
  duplicateEmails: InFileContactDuplicateGroup[];
  duplicateNames: InFileContactDuplicateGroup[];
  invalidRowCount: number;
  validRowCount: number;
};

export function isValidEmail(value: string | undefined): boolean {
  const email = String(value ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function splitFullNameCell(
  value: string,
  order: FullNameOrder = DEFAULT_FULL_NAME_ORDER
): { firstname: string; lastname: string } {
  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!raw) {
    return { firstname: '', lastname: '' };
  }
  const parts = raw.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return { firstname: '', lastname: parts[0] };
  }
  if (order === 'lastname-firstname') {
    return {
      firstname: parts.slice(1).join(' '),
      lastname: parts[0] ?? ''
    };
  }
  return {
    firstname: parts.slice(0, -1).join(' '),
    lastname: parts[parts.length - 1] ?? ''
  };
}

function applySplitToField(
  bag: Partial<Record<ImportFieldKey, string>>,
  sourceKey: ImportFieldKey,
  order: FullNameOrder
): void {
  const raw = String(bag[sourceKey] ?? '').trim();
  if (!raw || raw.split(/\s+/).filter(Boolean).length < 2) {
    return;
  }
  const split = splitFullNameCell(raw, order);
  if (!bag.firstname?.trim() && split.firstname) {
    bag.firstname = split.firstname;
  }
  if (!bag.lastname?.trim() && split.lastname) {
    bag.lastname = split.lastname;
  }
}

export function enrichContactBagFromDerivedFields(
  bag: Partial<Record<ImportFieldKey, string>>,
  options?: ContactImportParseOptions
): Partial<Record<ImportFieldKey, string>> {
  const next = { ...bag };
  const order = options?.fullNameOrder ?? DEFAULT_FULL_NAME_ORDER;

  if (next.fullName?.trim()) {
    applySplitToField(next, 'fullName', order);
  } else if (next.firstname?.trim() && !next.lastname?.trim()) {
    applySplitToField(next, 'firstname', order);
  } else if (next.lastname?.trim() && !next.firstname?.trim()) {
    applySplitToField(next, 'lastname', order);
  }

  return next;
}

export function resolveAddressFromBag(
  bag: Partial<Record<ImportFieldKey, string>>
): { street: string; postalCode: string; city: string; country: string } {
  let street = String(bag.street ?? '').trim();
  if (bag.addressLine?.trim() && !street) {
    street = bag.addressLine.trim();
  }
  return {
    street: street || '-',
    postalCode: String(bag.postalCode ?? '').trim() || '-',
    city: String(bag.city ?? '').trim() || '-',
    country: String(bag.country ?? '').trim() || 'France'
  };
}

export function buildIdentityAddressDuplicateKey(
  bag: Partial<Record<ImportFieldKey, string>>
): string {
  const enterpriseName = String(bag.enterpriseName ?? '').trim();
  if (enterpriseName) {
    return normalizeNameKey('company', enterpriseName, bag.siret);
  }
  const fn = normalizeIdentityPart(bag.firstname);
  const ln = normalizeIdentityPart(bag.lastname);
  const addrKey = normalizeAddressKey(resolveAddressFromBag(bag));
  return [fn, ln, addrKey].filter(Boolean).join('|');
}

export function needsCombinedNameOrderChoice(
  bindings: ImportFieldKey[],
  issues: ImportDatasetIssue[] = []
): boolean {
  if (bindings.includes('fullName')) {
    return true;
  }
  return issues.some((issue) => issue.code === 'combined_name_column');
}

export function hasPostalAddressInBag(bag: Partial<Record<ImportFieldKey, string>>): boolean {
  const line = String(bag.addressLine ?? '').trim();
  if (line.length >= 8) {
    return true;
  }
  const street = String(bag.street ?? '').trim();
  const postalCode = String(bag.postalCode ?? '').trim();
  const city = String(bag.city ?? '').trim();
  if (!street || street === '-') {
    return false;
  }
  return Boolean(postalCode || city);
}

export function hasReachableChannel(bag: Partial<Record<ImportFieldKey, string>>): boolean {
  return isValidEmail(bag.email) || hasPostalAddressInBag(bag);
}

export function contactsImportMappingReady(bindings: ImportFieldKey[]): boolean {
  const hasChannel =
    bindings.includes('email') ||
    bindings.includes('addressLine') ||
    bindings.includes('street') ||
    bindings.includes('postalCode');
  const hasIdentity =
    bindings.includes('fullName') ||
    bindings.includes('firstname') ||
    bindings.includes('lastname') ||
    bindings.includes('enterpriseName');
  return hasChannel && hasIdentity;
}

export function columnNonEmptyRate(rows: string[][], columnIndex: number): number {
  if (columnIndex < 0 || !rows.length) {
    return 0;
  }
  let filled = 0;
  for (const row of rows) {
    if (String(row[columnIndex] ?? '').trim()) {
      filled++;
    }
  }
  return filled / rows.length;
}

function normalizeNameKey(...parts: Array<string | undefined>): string {
  return parts
    .map((part) =>
      String(part ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
    )
    .filter(Boolean)
    .join('|');
}

function looksLikeCombinedNameColumn(rows: string[][], columnIndex: number): boolean {
  const samples = rows
    .map((row) => String(row[columnIndex] ?? '').trim())
    .filter(Boolean)
    .slice(0, 40);
  if (samples.length < 3) {
    return false;
  }
  const multiWord = samples.filter((value) => value.split(/\s+/).filter(Boolean).length >= 2);
  return multiWord.length / samples.length >= 0.6;
}

function looksLikeCombinedAddressColumn(rows: string[][], columnIndex: number): boolean {
  const samples = rows
    .map((row) => String(row[columnIndex] ?? '').trim())
    .filter(Boolean)
    .slice(0, 40);
  if (samples.length < 3) {
    return false;
  }
  const addressLike = samples.filter((value) => /\d/.test(value) && /[A-Za-zÀ-ÿ]/.test(value));
  return addressLike.length / samples.length >= 0.5;
}

export function buildContactImportBag(
  row: string[],
  bindings: ImportFieldKey[],
  overrides?: Partial<Record<ImportFieldKey, string>>,
  options?: ContactImportParseOptions
): Partial<Record<ImportFieldKey, string>> {
  const bag = collectImportFieldBag(row, bindings);
  if (overrides) {
    for (const [key, value] of Object.entries(overrides) as [ImportFieldKey, string][]) {
      bag[key] = value;
    }
  }
  return enrichContactBagFromDerivedFields(bag, options);
}

export function assessContactImportRowSkipReason(
  bag: Partial<Record<ImportFieldKey, string>>,
  options?: ContactImportParseOptions
): string | null {
  const enriched = enrichContactBagFromDerivedFields(bag, options);
  const enterpriseName = String(enriched.enterpriseName ?? '').trim();
  const siret = String(enriched.siret ?? '').trim();
  const intendedKind = enterpriseName || siret ? 'company' : 'individual';

  if (!hasReachableChannel(enriched)) {
    return 'Email ou adresse postale manquant';
  }

  if (intendedKind === 'company') {
    if (!enterpriseName) {
      return 'Nom entreprise manquant';
    }
    if (!siret) {
      return 'SIRET manquant';
    }
    const contactFirstname = String(enriched.contactFirstname ?? '').trim();
    const contactLastname = String(enriched.contactLastname ?? '').trim();
    if (!contactFirstname && !contactLastname) {
      return 'Nom ou prénom contact manquant';
    }
    return null;
  }

  const firstname = String(enriched.firstname ?? '').trim();
  const lastname = String(enriched.lastname ?? '').trim();
  if (!firstname && !lastname) {
    return 'Nom ou prénom manquant';
  }
  return null;
}

export function analyzeContactImportDataset(
  headers: string[],
  bindings: ImportFieldKey[],
  rows: string[][],
  options?: ContactImportParseOptions
): ContactImportDatasetAnalysis {
  const issues: ImportDatasetIssue[] = [];
  const emailMap = new Map<string, number[]>();
  const nameMap = new Map<string, number[]>();
  let invalidRowCount = 0;
  let validRowCount = 0;

  for (let columnIndex = 0; columnIndex < bindings.length; columnIndex++) {
    const fieldKey = bindings[columnIndex];
    if (fieldKey === 'skip') {
      continue;
    }
    const fillRate = columnNonEmptyRate(rows, columnIndex);
    const header = headers[columnIndex]?.trim() || `Colonne ${columnIndex + 1}`;
    if (fillRate === 0) {
      issues.push({
        severity: 'error',
        code: 'empty_mapped_column',
        message: `La colonne « ${header} » est vide alors qu’elle est reliée à « ${fieldKey} ».`,
        columnIndex,
        fieldKey
      });
    } else if (fillRate < 0.15) {
      issues.push({
        severity: 'warning',
        code: 'sparse_mapped_column',
        message: `La colonne « ${header} » est presque vide (${Math.round(fillRate * 100)} % de lignes remplies).`,
        columnIndex,
        fieldKey
      });
    }

    if (
      (fieldKey === 'firstname' || fieldKey === 'lastname') &&
      looksLikeCombinedNameColumn(rows, columnIndex)
    ) {
      issues.push({
        severity: 'warning',
        code: 'combined_name_column',
        message: `La colonne « ${header} » semble contenir nom et prénom ensemble. Reliez-la à « Nom et prénom » ou choisissez l’ordre ci-dessous.`,
        columnIndex,
        fieldKey
      });
    }

    if (
      fieldKey === 'street' &&
      !bindings.includes('addressLine') &&
      looksLikeCombinedAddressColumn(rows, columnIndex)
    ) {
      issues.push({
        severity: 'warning',
        code: 'combined_address_column',
        message: `La colonne « ${header} » ressemble à une adresse complète. Reliez-la plutôt à « Adresse (tout en une colonne) ».`,
        columnIndex,
        fieldKey
      });
    }
  }

  if (!contactsImportMappingReady(bindings)) {
    issues.push({
      severity: 'error',
      code: 'mapping_incomplete',
      message:
        'Reliez au minimum un moyen de contact (email ou adresse) et une identité (nom/prénom ou nom complet).'
    });
  }

  rows.forEach((row, index) => {
    const bag = buildContactImportBag(row, bindings, undefined, options);
    const skipReason = assessContactImportRowSkipReason(bag, options);
    if (skipReason) {
      invalidRowCount++;
      return;
    }
    validRowCount++;

    const email = String(bag.email ?? '')
      .trim()
      .toLowerCase();
    if (email) {
      const list = emailMap.get(email) ?? [];
      list.push(index + 1);
      emailMap.set(email, list);
    }

    const nameKey = buildIdentityAddressDuplicateKey(bag);
    if (nameKey) {
      const list = nameMap.get(nameKey) ?? [];
      list.push(index + 1);
      nameMap.set(nameKey, list);
    }
  });

  const duplicateEmails = [...emailMap.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({
      key,
      label: key,
      rowNumbers
    }));

  const duplicateNames = [...nameMap.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({
      key,
      label: key,
      rowNumbers
    }));

  if (duplicateEmails.length) {
    issues.push({
      severity: 'warning',
      code: 'duplicate_emails_in_file',
      message: `${duplicateEmails.length} email(s) apparaissent plusieurs fois dans le fichier. La dernière ligne l’emportera à l’import.`
    });
  }

  if (duplicateNames.length) {
    issues.push({
      severity: 'warning',
      code: 'duplicate_names_in_file',
      message: `${duplicateNames.length} profil(s) semblent dupliqués (nom/adresse). Vérifiez avant d’importer.`
    });
  }

  return {
    issues,
    duplicateEmails,
    duplicateNames,
    invalidRowCount,
    validRowCount
  };
}
