import { DonationImportFieldKey } from './model/import-donation-field.model';
import { DonationPaymentMethod, DonationType } from '../../../core/models/donation.model';
import { parseAmountFromCell, parseDateFromCell } from './import-parse-cells';

export function collectDonationImportBag(
  row: string[],
  bindings: DonationImportFieldKey[]
): Partial<Record<DonationImportFieldKey, string>> {
  const bag: Partial<Record<DonationImportFieldKey, string>> = {};
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

export function mapRowToDonationImport(
  row: string[],
  bindings: DonationImportFieldKey[]
): {
  amount: number;
  date: Date;
  contactEmail: string;
  paymentMethod: DonationPaymentMethod | null;
  donationType: DonationType;
} | null {
  const bag = collectDonationImportBag(row, bindings);
  const email = (bag.contactEmail ?? '').trim();
  const donationType = bag.donationType ? parseDonationTypeFromCell(bag.donationType) : ('financial' as const);
  const amountRaw = bag.donationAmount ? parseAmountFromCell(bag.donationAmount) : null;
  const date = bag.donationDate ? parseDateFromCell(bag.donationDate) : null;
  const paymentMethod = bag.paymentMethod ? parsePaymentMethodFromCell(bag.paymentMethod) : null;

  if (!email || !date) {
    return null;
  }

  if (donationType === 'financial') {
    if (amountRaw === null || amountRaw <= 0) {
      return null;
    }
    return { amount: amountRaw, date, contactEmail: email, paymentMethod, donationType };
  }

  // For "in_kind" and "sponsoring", we accept missing / non-numeric amount.
  const amount = amountRaw && amountRaw > 0 ? amountRaw : 0;
  return { amount, date, contactEmail: email, paymentMethod, donationType };
}

export function parsePaymentMethodFromCell(value: string): DonationPaymentMethod {
  const raw = String(value ?? '').trim().toLowerCase();
  const n = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ');

  if (/\bvirement\b/.test(n) || /\bbank transfer\b/.test(n) || /\btransfer\b/.test(n) || /\biban\b/.test(n)) {
    return 'bank_transfer';
  }
  if (/\bespeces\b/.test(n) || /\bcash\b/.test(n) || /\bliquide\b/.test(n) || /\bliquides\b/.test(n)) {
    return 'cash';
  }
  if (/\bcheques\b/.test(n) || /\bcheque\b/.test(n) || /\bchq\b/.test(n) || /\bcheck\b/.test(n)) {
    return 'check';
  }
  if (/\bautre\b/.test(n) || /\bother\b/.test(n)) {
    return 'other';
  }
  return 'other';
}

export function parseDonationTypeFromCell(value: string): DonationType {
  const raw = String(value ?? '').trim().toLowerCase();
  const n = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ');

  if (/\b(financier|finance|cash)\b/.test(n) || /\bdon\b.*\bfinanc/.test(n) || /\bargent\b/.test(n)) {
    return 'financial';
  }

  if (
    /\b(en nature|nature|mobilier|materiel|materiel sportif|equipement|sponsoring|sponsor)\b/.test(n) ||
    /\b(don|en)\b.*\b(nature|mobilier)\b/.test(n) ||
    /\bsponsor/.test(n)
  ) {
    // If it explicitly says "sponsor", we treat it as sponsoring.
    if (/\bsponsor/.test(n) || /\bsponsoring/.test(n)) {
      return 'sponsoring';
    }
    return 'in_kind';
  }

  if (/\bsponsoring\b/.test(n) || /\bsponsor\b/.test(n)) {
    return 'sponsoring';
  }

  return 'financial';
}
