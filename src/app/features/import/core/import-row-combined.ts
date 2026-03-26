import { NewContactInput } from '../../contact/contact.store';
import { ImportFieldKey } from './model/import-field.model';
import { CombinedImportFieldKey } from './model/import-combined-field.model';
import { mapRowToNewContactInput } from './import-row-to-contact';
import { parseDonationTypeFromCell, parsePaymentMethodFromCell } from './import-row-donation';
import { parseAmountFromCell, parseDateFromCell } from './import-parse-cells';
import { DonationPaymentMethod, DonationType } from '../../../core/models/donation.model';

export function mapCombinedRowToActions(
  row: string[],
  bindings: CombinedImportFieldKey[]
): {
  contactInput: NewContactInput | null;
  donation: {
    amount: number;
    date: Date;
    paymentMethod: DonationPaymentMethod | null;
    donationType: DonationType;
  } | null;
} {
  const contactBindings = bindings.map((b) =>
    b === 'donationDate' || b === 'donationAmount' || b === 'donationType' || b === 'paymentMethod'
      ? ('skip' as ImportFieldKey)
      : (b as ImportFieldKey)
  );
  const contactInput = mapRowToNewContactInput(row, contactBindings);
  let donationDateStr = '';
  let donationAmountStr = '';
  let donationTypeStr = '';
  let donationPaymentMethodStr = '';
  const len = Math.min(row.length, bindings.length);
  for (let i = 0; i < len; i++) {
    if (bindings[i] === 'donationDate') {
      donationDateStr = String(row[i] ?? '').trim();
    }
    if (bindings[i] === 'donationAmount') {
      donationAmountStr = String(row[i] ?? '').trim();
    }
    if (bindings[i] === 'donationType') {
      donationTypeStr = String(row[i] ?? '').trim();
    }
    if (bindings[i] === 'paymentMethod') {
      donationPaymentMethodStr = String(row[i] ?? '').trim();
    }
  }
  const amountRaw = donationAmountStr ? parseAmountFromCell(donationAmountStr) : null;
  const date = donationDateStr ? parseDateFromCell(donationDateStr) : null;
  const paymentMethod = donationPaymentMethodStr
    ? parsePaymentMethodFromCell(donationPaymentMethodStr)
    : null;

  const donationType = donationTypeStr
    ? parseDonationTypeFromCell(donationTypeStr)
    : ('financial' as const);

  if (!date || !donationType) {
    return { contactInput, donation: null };
  }

  if (donationType === 'financial') {
    if (amountRaw === null || amountRaw <= 0) {
      return { contactInput, donation: null };
    }
    return { contactInput, donation: { amount: amountRaw, date, paymentMethod, donationType } };
  }

  const amount = amountRaw && amountRaw > 0 ? amountRaw : 0;
  return { contactInput, donation: { amount, date, paymentMethod, donationType } };
}
