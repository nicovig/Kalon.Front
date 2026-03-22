import { NewDonorInputIndividual } from '../../donor/donor.store';
import { ImportFieldKey } from './import-field.model';
import { CombinedImportFieldKey } from './import-combined-field.model';
import { mapRowToNewDonorInput } from './import-row-to-donor';
import { parseAmountFromCell, parseDateFromCell } from './import-parse-cells';

export function mapCombinedRowToActions(
  row: string[],
  bindings: CombinedImportFieldKey[]
): {
  donorInput: NewDonorInputIndividual | null;
  donation: { amount: number; date: Date } | null;
} {
  const donorBindings = bindings.map((b) =>
    b === 'donationDate' || b === 'donationAmount' ? ('skip' as ImportFieldKey) : (b as ImportFieldKey)
  );
  const donorInput = mapRowToNewDonorInput(row, donorBindings);
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
  return { donorInput, donation };
}
