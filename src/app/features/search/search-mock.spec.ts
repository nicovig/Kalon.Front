import {
  getMockCompanyDetails,
  getMockSearchCompanies,
  getMockSearchCredits,
  resetSearchMockCredits
} from './search-mock';

describe('search-mock', () => {
  beforeEach(() => {
    resetSearchMockCredits(25);
  });

  it('exposes a positive credit balance', () => {
    expect(getMockSearchCredits()).toEqual({
      availableCredits: 25,
      canSearch: true,
      canOpenDetail: true
    });
  });

  it('filters by department and NAF prefix', () => {
    const result = getMockSearchCompanies({ dep: '49', naf: '93', nbrep: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].siren).toBe('380129866');
    expect(result.availableCredits).toBe(24.9);
  });

  it('limits the number of results', () => {
    const result = getMockSearchCompanies({ nbrep: 2 });
    expect(result.results).toHaveLength(2);
  });

  it('returns detail for a known siren and updates credits', () => {
    getMockSearchCompanies({ nbrep: 10 });
    const detail = getMockCompanyDetails('552100554');
    expect(detail.contact.nomDirigeant).toBe('Martin');
    expect(detail.bilan.annee).toBe(2024);
    expect(detail.availableCredits).toBe(22.4);
  });
});
