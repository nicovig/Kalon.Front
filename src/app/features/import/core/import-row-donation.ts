import { DonationImportFieldKey } from './model/import-donation-field.model';
import { DonationPaymentMethod } from '../../../core/models/donation.model';
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
): { amount: number; date: Date; contactEmail: string; paymentMethod: DonationPaymentMethod } | null {
  const bag = collectDonationImportBag(row, bindings);
  const email = (bag.contactEmail ?? '').trim();
  const amount = bag.donationAmount ? parseAmountFromCell(bag.donationAmount) : null;
  const date = bag.donationDate ? parseDateFromCell(bag.donationDate) : null;
  const paymentMethod = bag.paymentMethod ? parsePaymentMethodFromCell(bag.paymentMethod) : 'other';
  if (!email || amount === null || amount <= 0 || !date) {
    return null;
  }
  return { amount, date, contactEmail: email, paymentMethod };
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
