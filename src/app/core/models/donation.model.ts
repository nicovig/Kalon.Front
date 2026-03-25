export type DonationPaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'other';

export interface IDonation {
  id: string;
  contactId: string;
  amount: number;
  date: Date;
  contactDisplayName: string;
  paymentMethod: DonationPaymentMethod;
}
