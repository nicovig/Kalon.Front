import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SEARCH_FEATURE_KEY } from '../../core/auth/plan.guard';
import { UserStore } from '../../core/auth/user.store';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { CardComponent } from '../../layout/card/card.component';
import { FormSelectComponent } from '../../layout/forms/select/form-select.component';
import { InlineLoaderComponent } from '../../layout/inline-loader/inline-loader.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { ToastService } from '../../layout/toast/toast.service';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import type { CompanyDetailResponse } from './models/company-detail.model';
import type { CompanySearchResult } from './models/company-search-result.model';
import type { SearchCreditBalance } from './models/credit-balance.model';
import {
  SEARCH_CREDIT_COST,
  SEARCH_DEPARTMENT_OPTIONS,
  SEARCH_DETAIL_CREDIT_COST,
  SEARCH_NAF_OPTIONS,
  SEARCH_RESULT_COUNT_OPTIONS
} from './search-options';
import { SearchApiError, SearchService } from './search.service';

type SearchResultCard = CompanySearchResult & {
  unlocked: boolean;
  unlocking: boolean;
  detail: CompanyDetailResponse | null;
  detailError: string | null;
};

@Component({
  selector: 'search-page',
  standalone: true,
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TopbarComponent,
    ToastComponent,
    CardComponent,
    ButtonLabelComponent,
    FormSelectComponent,
    InlineLoaderComponent
  ]
})
export class SearchPageComponent implements OnInit {
  private readonly searchService = inject(SearchService);
  private readonly userStore = inject(UserStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchCreditCost = SEARCH_CREDIT_COST;
  protected readonly detailCreditCost = SEARCH_DETAIL_CREDIT_COST;
  protected readonly departmentOptions = SEARCH_DEPARTMENT_OPTIONS;
  protected readonly nafOptions = SEARCH_NAF_OPTIONS;
  protected readonly resultCountOptions = SEARCH_RESULT_COUNT_OPTIONS;

  protected readonly dep = signal('');
  protected readonly naf = signal('');
  protected readonly nbrep = signal('20');

  protected readonly creditsLoading = signal(true);
  protected readonly credits = signal<SearchCreditBalance | null>(null);
  protected readonly premiumRequired = signal(false);

  protected readonly searching = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly results = signal<SearchResultCard[]>([]);

  private readonly canUseFeature = this.userStore.hasFeature(SEARCH_FEATURE_KEY);

  protected readonly showPremiumGate = computed(
    () => this.premiumRequired() || !this.canUseFeature
  );

  protected readonly availableCredits = computed(
    () => this.credits()?.availableCredits ?? 0
  );

  protected readonly canSearch = computed(() => {
    if (this.showPremiumGate()) return false;
    return this.credits()?.canSearch === true;
  });

  protected readonly creditsBadgeTone = computed(() => {
    const value = this.availableCredits();
    if (value <= 0) return 'danger';
    if (value <= 10) return 'warn';
    return 'ok';
  });

  protected readonly creditsLabel = computed(() => {
    const value = this.availableCredits();
    const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return `${rounded} crédit${value > 1 ? 's' : ''} disponible${value > 1 ? 's' : ''}`;
  });

  ngOnInit(): void {
    if (this.showPremiumGate()) {
      this.creditsLoading.set(false);
      return;
    }
    this.loadCredits();
  }

  protected onSearch(): void {
    if (!this.canSearch() || this.searching()) {
      return;
    }

    this.searching.set(true);
    this.hasSearched.set(true);
    this.results.set([]);

    const nafValue = this.naf();
    this.searchService
      .searchCompanies({
        dep: this.dep() || undefined,
        naf: nafValue && nafValue !== 'other' ? nafValue : undefined,
        nbrep: Number(this.nbrep()) || 20
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.patchCredits(response.availableCredits);
          this.showSpendToast(
            response.creditsUsed ?? SEARCH_CREDIT_COST,
            response.availableCredits
          );
          this.results.set(
            (response.results ?? []).map((item) => ({
              ...item,
              unlocked: false,
              unlocking: false,
              detail: null,
              detailError: null
            }))
          );
          this.searching.set(false);
        },
        error: (err: SearchApiError) => {
          this.searching.set(false);
          this.handleSearchError(err);
        }
      });
  }

  protected unlockDetails(card: SearchResultCard): void {
    if (card.unlocked || card.unlocking) {
      return;
    }

    this.results.update((list) =>
      list.map((item) =>
        item.siren === card.siren
          ? { ...item, unlocking: true, detailError: null }
          : item
      )
    );

    this.searchService
      .getCompanyDetails(card.siren)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.patchCredits(detail.availableCredits);
          this.showSpendToast(
            detail.creditsUsed ?? SEARCH_DETAIL_CREDIT_COST,
            detail.availableCredits
          );
          this.results.update((list) =>
            list.map((item) =>
              item.siren === card.siren
                ? {
                    ...item,
                    unlocked: true,
                    unlocking: false,
                    detail,
                    detailError: null
                  }
                : item
            )
          );
        },
        error: (err: SearchApiError) => {
          const message =
            err.kind === 'insufficient_credits'
              ? 'Crédits insuffisants'
              : err.message;
          if (err.kind === 'insufficient_credits' && err.availableCredits != null) {
            this.patchCredits(err.availableCredits);
          }
          if (err.kind === 'premium_required') {
            this.premiumRequired.set(true);
          }
          this.results.update((list) =>
            list.map((item) =>
              item.siren === card.siren
                ? { ...item, unlocking: false, detailError: message }
                : item
            )
          );
        }
      });
  }

  protected formatMoney(value: number | null | undefined): string {
    if (value == null || Number.isNaN(Number(value))) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(Number(value));
  }

  protected formatPhone(value: string | null | undefined): string {
    const digits = String(value ?? '').replace(/\D+/g, '');
    if (!digits) {
      return '—';
    }
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }

  protected dirigeantLabel(detail: CompanyDetailResponse): string {
    const prenom = detail.contact?.prenomDirigeant?.trim() ?? '';
    const nom = detail.contact?.nomDirigeant?.trim() ?? '';
    const full = `${prenom} ${nom}`.trim();
    return full || '—';
  }

  private loadCredits(): void {
    this.creditsLoading.set(true);
    this.searchService
      .getCredits()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (balance) => {
          this.credits.set(balance);
          this.creditsLoading.set(false);
        },
        error: (err: SearchApiError) => {
          this.creditsLoading.set(false);
          if (err.kind === 'premium_required') {
            this.premiumRequired.set(true);
            return;
          }
          this.toast.show(err.message, 'alert', 5000);
        }
      });
  }

  private patchCredits(availableCredits: number): void {
    this.credits.set({
      availableCredits,
      canSearch: availableCredits >= SEARCH_CREDIT_COST,
      canOpenDetail: availableCredits >= SEARCH_DETAIL_CREDIT_COST
    });
  }

  private showSpendToast(cost: number, remaining: number): void {
    const costLabel = this.formatCreditAmount(cost);
    const remainingLabel = this.formatCreditAmount(remaining);
    this.toast.show(
      `Moins ${costLabel} crédit${cost > 1 ? 's' : ''}, ${remainingLabel} restant${remaining > 1 ? 's' : ''}`,
      'info',
      3500
    );
  }

  private formatCreditAmount(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  private handleSearchError(err: SearchApiError): void {
    if (err.kind === 'premium_required') {
      this.premiumRequired.set(true);
      return;
    }
    if (err.kind === 'insufficient_credits') {
      if (err.availableCredits != null) {
        this.patchCredits(err.availableCredits);
      }
      this.toast.show(
        'Crédits insuffisants pour effectuer une recherche',
        'alert',
        5000
      );
      return;
    }
    this.toast.show(err.message, 'alert', 5000);
  }
}
