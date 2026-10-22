export type CompanySearchResult = {
  siren: string;
  nomCommercial: string;
  nafCode: string;
  nafLib: string;
  cpVille: string;
  dep: string;
  status: string;
};

export type CompanySearchResponse = {
  results: CompanySearchResult[];
  creditsUsed: number;
  availableCredits: number;
};

export type CompanySearchQuery = {
  dep?: string;
  naf?: string;
  nbrep?: number;
};
