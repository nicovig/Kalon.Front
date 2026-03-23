import { DonationImportFieldKey } from './model/import-donation-field.model';
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
): { amount: number; date: Date; donorEmail: string } | null {
  const bag = collectDonationImportBag(row, bindings);
  const email = (bag.donorEmail ?? '').trim();
  const amount = bag.donationAmount ? parseAmountFromCell(bag.donationAmount) : null;
  const date = bag.donationDate ? parseDateFromCell(bag.donationDate) : null;
  if (!email || amount === null || amount <= 0 || !date) {
    return null;
  }
  return { amount, date, donorEmail: email };
}
