import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import { SEARCH_MOCK_ENABLED } from '../../core/config/api.config';
import { SearchApiError, SearchService } from './search.service';
import { resetSearchMockCredits } from './search-mock';

describe('SearchService', () => {
  let service: SearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SearchService]
    });
    service = TestBed.inject(SearchService);
    http = TestBed.inject(HttpTestingController);
    resetSearchMockCredits(25);
  });

  afterEach(() => {
    http.verify();
  });

  if (SEARCH_MOCK_ENABLED) {
    it('returns mock credits', async () => {
      const result = await firstValueFrom(service.getCredits());
      expect(result.availableCredits).toBe(25);
      expect(result.canSearch).toBe(true);
      expect(result.canOpenDetail).toBe(true);
    });

    it('filters mock companies and decrements credits', async () => {
      const result = await firstValueFrom(
        service.searchCompanies({ dep: '49', nbrep: 20 })
      );
      expect(result.results.every((item) => item.dep === '49')).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.creditsUsed).toBe(0.1);
      expect(result.availableCredits).toBe(24.9);
    });

    it('returns mock company details and decrements credits', async () => {
      await firstValueFrom(service.searchCompanies({ nbrep: 10 }));
      const detail = await firstValueFrom(service.getCompanyDetails('552100554'));
      expect(detail.bilan.chiffreAffaires).toBe(480000);
      expect(detail.contact.prenomDirigeant).toBe('Claire');
      expect(detail.availableCredits).toBe(22.4);
    });
  } else {
    it('loads credit balance', () => {
      let result: unknown;
      service.getCredits().subscribe((value) => (result = value));

      const req = http.expectOne(API_ENDPOINTS.search.credits());
      expect(req.request.method).toBe('GET');
      req.flush({ availableCredits: 12.5, canSearch: true, canOpenDetail: true });

      expect(result).toEqual({
        availableCredits: 12.5,
        canSearch: true,
        canOpenDetail: true
      });
    });

    it('searches companies with query params', () => {
      let result: unknown;
      service
        .searchCompanies({ dep: '49', naf: '86', nbrep: 20 })
        .subscribe((value) => (result = value));

      const req = http.expectOne(
        API_ENDPOINTS.search.companies({ dep: '49', naf: '86', nbrep: 20 })
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        results: [
          {
            siren: '123456789',
            nomCommercial: 'Kalon SAS',
            nafCode: '86',
            nafLib: 'Médical',
            cpVille: '49000 Angers',
            dep: '49',
            status: 'active'
          }
        ],
        creditsUsed: 0.1,
        availableCredits: 12.4
      });

      expect(result).toEqual(
        expect.objectContaining({
          creditsUsed: 0.1,
          availableCredits: 12.4,
          results: [expect.objectContaining({ siren: '123456789', nomCommercial: 'Kalon SAS' })]
        })
      );
    });

    it('loads company details by siren', () => {
      let result: unknown;
      service.getCompanyDetails('123456789').subscribe((value) => (result = value));

      const req = http.expectOne(API_ENDPOINTS.search.companyDetails({ siren: '123456789' }));
      expect(req.request.method).toBe('GET');
      req.flush({
        bilan: { siren: '123456789', annee: 2024, chiffreAffaires: 1200000, resultatNet: 80000 },
        contact: {
          siren: '123456789',
          nomDirigeant: 'Dupont',
          prenomDirigeant: 'Marie',
          telephone: '0612345678',
          email: 'marie@test.fr'
        },
        creditsUsed: 2.5,
        availableCredits: 9.9
      });

      expect(result).toEqual(
        expect.objectContaining({
          creditsUsed: 2.5,
          availableCredits: 9.9,
          bilan: expect.objectContaining({ annee: 2024, chiffreAffaires: 1200000 }),
          contact: expect.objectContaining({ nomDirigeant: 'Dupont', prenomDirigeant: 'Marie' })
        })
      );
    });

    it('maps 402 to insufficient_credits', () => {
      let error: SearchApiError | undefined;
      service.searchCompanies({ dep: '49' }).subscribe({
        error: (err) => (error = err)
      });

      const req = http.expectOne(API_ENDPOINTS.search.companies({ dep: '49' }));
      req.flush(
        { error: 'Crédits insuffisants', availableCredits: 0, canPurchase: true },
        { status: 402, statusText: 'Payment Required' }
      );

      expect(error).toEqual({
        kind: 'insufficient_credits',
        status: 402,
        message: 'Crédits insuffisants',
        availableCredits: 0,
        canPurchase: true
      });
    });

    it('maps 403 to premium_required', () => {
      let error: SearchApiError | undefined;
      service.getCredits().subscribe({
        error: (err) => (error = err)
      });

      const req = http.expectOne(API_ENDPOINTS.search.credits());
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      expect(error).toEqual({
        kind: 'premium_required',
        status: 403,
        message: 'Cette fonctionnalité nécessite le plan Premium.'
      });
    });
  }
});
