export type IgnoredImportLine = {
  rowNumber: number;
  reason: string;
  contactKind?: 'individual' | 'company';
  email?: string;
  enterpriseName?: string;
  siret?: string;
  firstname?: string;
  lastname?: string;
  contactEmail?: string;
  donationAmount?: string;
  donationDate?: string;
};

