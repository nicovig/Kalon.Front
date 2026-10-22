import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import { SEARCH_MOCK_ENABLED } from '../../core/config/api.config';
import type { CompanyDetailResponse } from './models/company-detail.model';
import type {
  CompanySearchQuery,
  CompanySearchResponse
} from './models/company-search-result.model';
import type {
  SearchCreditBalance,
  SearchCreditsInsufficientError
} from './models/credit-balance.model';
import {
  getMockCompanyDetails,
  getMockSearchCompanies,
  getMockSearchCredits
} from './search-mock';

export type SearchApiErrorKind = 'insufficient_credits' | 'premium_required' | 'unknown';

export type SearchApiError = {
  kind: SearchApiErrorKind;
  status: number;
  message: string;
  availableCredits?: number;
  canPurchase?: boolean;
};

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  getCredits(): Observable<SearchCreditBalance> {
    if (SEARCH_MOCK_ENABLED) {
      return of(getMockSearchCredits()).pipe(delay(250));
    }
    return this.http
      .get<SearchCreditBalance>(API_ENDPOINTS.search.credits())
      .pipe(catchError((err) => throwError(() => this.mapError(err))));
  }

  searchCompanies(query: CompanySearchQuery): Observable<CompanySearchResponse> {
    if (SEARCH_MOCK_ENABLED) {
      return of(getMockSearchCompanies(query)).pipe(delay(450));
    }
    return this.http
      .get<CompanySearchResponse>(
        API_ENDPOINTS.search.companies({
          dep: query.dep?.trim() || undefined,
          naf: query.naf?.trim() || undefined,
          nbrep: query.nbrep
        })
      )
      .pipe(catchError((err) => throwError(() => this.mapError(err))));
  }

  getCompanyDetails(siren: string): Observable<CompanyDetailResponse> {
    if (SEARCH_MOCK_ENABLED) {
      return of(getMockCompanyDetails(siren)).pipe(delay(350));
    }
    return this.http
      .get<CompanyDetailResponse>(
        API_ENDPOINTS.search.companyDetails({ siren: String(siren ?? '').trim() })
      )
      .pipe(catchError((err) => throwError(() => this.mapError(err))));
  }

  private mapError(err: unknown): SearchApiError {
    if (!(err instanceof HttpErrorResponse)) {
      return {
        kind: 'unknown',
        status: 0,
        message: 'Une erreur est survenue.'
      };
    }

    if (err.status === 403) {
      return {
        kind: 'premium_required',
        status: 403,
        message: 'Cette fonctionnalité nécessite le plan Premium.'
      };
    }

    if (err.status === 402) {
      const body = (err.error ?? {}) as SearchCreditsInsufficientError;
      return {
        kind: 'insufficient_credits',
        status: 402,
        message: body.error?.trim() || 'Crédits insuffisants.',
        availableCredits:
          typeof body.availableCredits === 'number' ? body.availableCredits : undefined,
        canPurchase: body.canPurchase === true
      };
    }

    return {
      kind: 'unknown',
      status: err.status,
      message: 'Une erreur est survenue. Réessayez dans un instant.'
    };
  }
}
