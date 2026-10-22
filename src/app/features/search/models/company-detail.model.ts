export type CompanyBilan = {
  siren: string;
  annee: number;
  chiffreAffaires: number;
  resultatNet: number;
};

export type CompanyContact = {
  siren: string;
  nomDirigeant: string;
  prenomDirigeant: string;
  telephone: string;
  email: string;
};

export type CompanyDetailResponse = {
  bilan: CompanyBilan;
  contact: CompanyContact;
  creditsUsed: number;
  availableCredits: number;
};
