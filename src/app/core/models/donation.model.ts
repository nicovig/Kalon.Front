export type DonationPaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'other';

export type DonationType = 'financial' | 'in_kind' | 'sponsoring';

export interface IDonation {
  id: string;
  contactId: string;
  amount: number;
  date: Date;
  contactDisplayName: string;
  paymentMethod: DonationPaymentMethod | null;
  donationType: DonationType;
}
