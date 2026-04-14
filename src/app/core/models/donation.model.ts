export type DonationPaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'other';
export type DonationType = 'financial' | 'in_kind' | 'sponsoring';

export interface IDonation {
  id: string;
  organizationId: string;
  contactId: string;
  contactDisplayName: string;
  amount: number;
  date: Date;
  donationType: DonationType;
  paymentMethod: DonationPaymentMethod | null;
  notes?: string;
  isAnonymous: boolean;
  receiptId?: string;
}
