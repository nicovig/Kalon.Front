import type { CompanyDetailResponse } from './models/company-detail.model';
import type {
  CompanySearchQuery,
  CompanySearchResponse,
  CompanySearchResult
} from './models/company-search-result.model';
import type { SearchCreditBalance } from './models/credit-balance.model';
import { SEARCH_CREDIT_COST, SEARCH_DETAIL_CREDIT_COST } from './search-options';

const MOCK_COMPANIES: CompanySearchResult[] = [
  {
    siren: '552100554',
    nomCommercial: 'Boulangerie des Quais',
    nafCode: '1071C',
    nafLib: 'Boulangerie et boulangerie-pâtisserie',
    cpVille: '49000 Angers',
    dep: '49',
    status: 'active'
  },
  {
    siren: '443061841',
    nomCommercial: 'Clinique du Maine',
    nafCode: '8610Z',
    nafLib: 'Activités hospitalières',
    cpVille: '72000 Le Mans',
    dep: '72',
    status: 'active'
  },
  {
    siren: '380129866',
    nomCommercial: 'Sport Attitude 49',
    nafCode: '9311Z',
    nafLib: 'Gestion d’installations sportives',
    cpVille: '49100 Angers',
    dep: '49',
    status: 'active'
  },
  {
    siren: '794582154',
    nomCommercial: 'Atelier Culturel Loire',
    nafCode: '9001Z',
    nafLib: 'Arts du spectacle vivant',
    cpVille: '44000 Nantes',
    dep: '44',
    status: 'active'
  },
  {
    siren: '318167758',
    nomCommercial: 'Bâtir Ensemble',
    nafCode: '4120A',
    nafLib: 'Construction de maisons individuelles',
    cpVille: '85000 La Roche-sur-Yon',
    dep: '85',
    status: 'active'
  },
  {
    siren: '501722334',
    nomCommercial: 'Table & Terroir',
    nafCode: '5610A',
    nafLib: 'Restauration traditionnelle',
    cpVille: '37000 Tours',
    dep: '37',
    status: 'active'
  },
  {
    siren: '612045687',
    nomCommercial: 'Comptoir du Centre',
    nafCode: '4711D',
    nafLib: 'Supermarchés',
    cpVille: '35000 Rennes',
    dep: '35',
    status: 'active'
  },
  {
    siren: '399287456',
    nomCommercial: 'Industrie Ouest Métal',
    nafCode: '2511Z',
    nafLib: 'Fabrication de structures métalliques',
    cpVille: '49000 Angers',
    dep: '49',
    status: 'active'
  }
];

const MOCK_DETAILS: Record<string, CompanyDetailResponse> = {
  '552100554': {
    bilan: {
      siren: '552100554',
      annee: 2024,
      chiffreAffaires: 480000,
      resultatNet: 42000
    },
    contact: {
      siren: '552100554',
      nomDirigeant: 'Martin',
      prenomDirigeant: 'Claire',
      telephone: '0241123456',
      email: 'claire.martin@boulangerie-quais.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '443061841': {
    bilan: {
      siren: '443061841',
      annee: 2023,
      chiffreAffaires: 12500000,
      resultatNet: 890000
    },
    contact: {
      siren: '443061841',
      nomDirigeant: 'Lefebvre',
      prenomDirigeant: 'Antoine',
      telephone: '0243987654',
      email: 'a.lefebvre@clinique-maine.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '380129866': {
    bilan: {
      siren: '380129866',
      annee: 2024,
      chiffreAffaires: 920000,
      resultatNet: 110000
    },
    contact: {
      siren: '380129866',
      nomDirigeant: 'Moreau',
      prenomDirigeant: 'Sophie',
      telephone: '0241556677',
      email: 's.moreau@sport-attitude49.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '794582154': {
    bilan: {
      siren: '794582154',
      annee: 2024,
      chiffreAffaires: 310000,
      resultatNet: 28000
    },
    contact: {
      siren: '794582154',
      nomDirigeant: 'Bernard',
      prenomDirigeant: 'Luc',
      telephone: '0240223344',
      email: 'luc.bernard@atelier-loire.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '318167758': {
    bilan: {
      siren: '318167758',
      annee: 2023,
      chiffreAffaires: 3400000,
      resultatNet: 210000
    },
    contact: {
      siren: '318167758',
      nomDirigeant: 'Garcia',
      prenomDirigeant: 'Nina',
      telephone: '0251889900',
      email: 'n.garcia@batir-ensemble.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '501722334': {
    bilan: {
      siren: '501722334',
      annee: 2024,
      chiffreAffaires: 760000,
      resultatNet: 54000
    },
    contact: {
      siren: '501722334',
      nomDirigeant: 'Petit',
      prenomDirigeant: 'Hugo',
      telephone: '0247112233',
      email: 'hugo.petit@table-terroir.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '612045687': {
    bilan: {
      siren: '612045687',
      annee: 2024,
      chiffreAffaires: 8900000,
      resultatNet: 430000
    },
    contact: {
      siren: '612045687',
      nomDirigeant: 'Roux',
      prenomDirigeant: 'Camille',
      telephone: '0299445566',
      email: 'c.roux@comptoir-centre.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  },
  '399287456': {
    bilan: {
      siren: '399287456',
      annee: 2023,
      chiffreAffaires: 5600000,
      resultatNet: 320000
    },
    contact: {
      siren: '399287456',
      nomDirigeant: 'Durand',
      prenomDirigeant: 'Paul',
      telephone: '0241778899',
      email: 'paul.durand@ouest-metal.fr'
    },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: 0
  }
};

let mockAvailableCredits = 25;

export function resetSearchMockCredits(value = 25): void {
  mockAvailableCredits = value;
}

export function getMockSearchCredits(): SearchCreditBalance {
  return {
    availableCredits: mockAvailableCredits,
    canSearch: mockAvailableCredits >= SEARCH_CREDIT_COST,
    canOpenDetail: mockAvailableCredits >= SEARCH_DETAIL_CREDIT_COST
  };
}

export function getMockSearchCompanies(query: CompanySearchQuery): CompanySearchResponse {
  const dep = query.dep?.trim() ?? '';
  const naf = query.naf?.trim() ?? '';
  const limit = Math.max(1, Math.min(query.nbrep ?? 20, 50));

  let filtered = [...MOCK_COMPANIES];
  if (dep) {
    filtered = filtered.filter((item) => item.dep === dep);
  }
  if (naf && naf !== 'other') {
    filtered = filtered.filter(
      (item) => item.nafCode.startsWith(naf) || item.nafCode === naf
    );
  }

  mockAvailableCredits = Math.max(0, Number((mockAvailableCredits - SEARCH_CREDIT_COST).toFixed(1)));

  return {
    results: filtered.slice(0, limit),
    creditsUsed: SEARCH_CREDIT_COST,
    availableCredits: mockAvailableCredits
  };
}

export function getMockCompanyDetails(siren: string): CompanyDetailResponse {
  const key = String(siren ?? '').trim();
  const base = MOCK_DETAILS[key];
  mockAvailableCredits = Math.max(
    0,
    Number((mockAvailableCredits - SEARCH_DETAIL_CREDIT_COST).toFixed(1))
  );

  if (!base) {
    return {
      bilan: {
        siren: key,
        annee: 2024,
        chiffreAffaires: 250000,
        resultatNet: 18000
      },
      contact: {
        siren: key,
        nomDirigeant: 'Inconnu',
        prenomDirigeant: 'Contact',
        telephone: '0100000000',
        email: 'contact@entreprise.fr'
      },
      creditsUsed: SEARCH_DETAIL_CREDIT_COST,
      availableCredits: mockAvailableCredits
    };
  }

  return {
    ...base,
    bilan: { ...base.bilan },
    contact: { ...base.contact },
    creditsUsed: SEARCH_DETAIL_CREDIT_COST,
    availableCredits: mockAvailableCredits
  };
}
