import { NewContactInput } from '../../contact/contact.store';
import { ImportFieldKey } from './model/import-field.model';
import { CombinedImportFieldKey } from './model/import-combined-field.model';
import { mapRowToNewContactInput } from './import-row-to-contact';
import { parseAmountFromCell, parseDateFromCell } from './import-parse-cells';

export function mapCombinedRowToActions(
  row: string[],
  bindings: CombinedImportFieldKey[]
): {
  contactInput: NewContactInput | null;
  donation: { amount: number; date: Date } | null;
} {
  const contactBindings = bindings.map((b) =>
    b === 'donationDate' || b === 'donationAmount' ? ('skip' as ImportFieldKey) : (b as ImportFieldKey)
  );
  const contactInput = mapRowToNewContactInput(row, contactBindings);
  let donationDateStr = '';
  let donationAmountStr = '';
  const len = Math.min(row.length, bindings.length);
  for (let i = 0; i < len; i++) {
    if (bindings[i] === 'donationDate') {
      donationDateStr = String(row[i] ?? '').trim();
    }
    if (bindings[i] === 'donationAmount') {
      donationAmountStr = String(row[i] ?? '').trim();
    }
  }
  const amount = donationAmountStr ? parseAmountFromCell(donationAmountStr) : null;
  const date = donationDateStr ? parseDateFromCell(donationDateStr) : null;
  const donation =
    amount !== null && amount > 0 && date ? { amount, date } : null;
  return { contactInput, donation };
}
