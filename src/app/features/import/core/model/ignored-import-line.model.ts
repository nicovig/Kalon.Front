export type IgnoredImportLine = {
  rowNumber: number;
  reason: string;
  donorKind?: 'individual' | 'company';
  email?: string;
  enterpriseName?: string;
  siret?: string;
  firstname?: string;
  lastname?: string;
  donorEmail?: string;
  donationAmount?: string;
  donationDate?: string;
};

