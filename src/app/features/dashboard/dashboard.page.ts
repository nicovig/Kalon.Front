import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { InlineLoaderComponent } from '../../layout/inline-loader/inline-loader.component';
import { ToastService } from '../../layout/toast/toast.service';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { AuthService } from '../../core/auth/auth.service';
import { DonationStoreService } from '../donation/donation.store';
import { ContactStoreService } from '../contact/contact.store';
import { ContactCreateLauncherComponent } from '../contact/contact-create-launcher.component';
import { EmptyContactsWelcomeComponent } from '../contact/empty-contacts-welcome/empty-contacts-welcome.component';
import { ImportBannerComponent } from '../import/components/import-banner/import-banner.component';
import { contactDisplayName, IContact } from '../../core/models/contact.model';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';
import { DonationPaymentMethod } from '../../core/models/donation.model';
import { RouterLink } from '@angular/router';
import { OrganizationDocumentsStore } from '../archives/organization-documents.store';
import { DashboardNotificationStore } from '../../core/notification/dashboard-notification.store';

@Component({
  selector: 'dashboard-page',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableComponent,
    DashboardCardComponent,
    ToastComponent,
    TopbarComponent,
    CardComponent,
    InlineLoaderComponent,
    ButtonLabelComponent,
    ContactCreateLauncherComponent,
    EmptyContactsWelcomeComponent,
    ImportBannerComponent,
    RouterLink
  ]
})
export class DashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);
  private readonly organizationDocumentsStore = inject(OrganizationDocumentsStore);
  private readonly dashboardNotificationStore = inject(DashboardNotificationStore);
  private readonly toast = inject(ToastService);
  protected readonly loadingData = signal(false);

  protected readonly currentUser = this.authService.currentUser;

  private readonly contactById = computed(() => {
    const map = new Map<string, IContact>();
    for (const c of this.contactStore.contacts()) {
      map.set(c.id, c);
    }
    return map;
  });

  protected readonly latestDonationsComputed = computed(() => {
    const map = this.contactById();
    return this.donationStore
      .donations()
      .map((d) => ({
        ...d,
        paymentMethodLabel: this.paymentMethodLabel(d.paymentMethod),
        contributionTypeLabel: this.contributionTypeLabel(map.get(d.contactId))
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  protected readonly kpiActiveContacts = computed(
    () =>
      this.contactStore
        .contacts()
        .filter((c) => this.contactSettings.statusOf(c) === 'active').length.toString()
  );

  protected readonly kpiYearDonationsTotal = computed(() => {
    const y = new Date().getFullYear();
    return this.donationStore
      .donations()
      .filter((d) => d.date.getFullYear() === y)
      .reduce((sum, d) => sum + d.amount, 0)
      .toFixed(2);
  });

  protected readonly kpiToRemind = computed(
    () => this.dashboardNotificationStore.contactsToRemind().toString()
  );

  protected readonly kpiGeneratedDocumentsCount = computed(
    () => this.organizationDocumentsStore.generatedDocuments().length.toString()
  );

  protected readonly physicalLettersToSend = computed(
    () => this.dashboardNotificationStore.physicalLettersToSend().toString()
  );

  protected readonly contactCount = computed(() => this.contactStore.contacts().length);

  protected readonly quotaContactsPct = computed(() => {
    const limit = 300;
    const n = this.contactCount();
    return Math.min(100, Math.round((n / limit) * 100));
  });

  protected readonly importCount = computed(() => 0);
  protected readonly importQuotaPct = computed(() => 0);

  protected readonly emailSentCount = computed(() => 0);
  protected readonly emailSentQuotaPct = computed(() => 0);

  protected readonly priorityRelanceContacts = computed(() =>
    this.contactStore
      .contacts()
      .filter((c) => this.contactSettings.statusOf(c) === 'to_remind' && !!c.lastDonation)
      .sort((a, b) => (a.lastDonation?.getTime() ?? 0) - (b.lastDonation?.getTime() ?? 0))
      .slice(0, 5)
  );

  protected readonly priorityRelanceQueryParams = computed(() => {
    const ids = this.priorityRelanceContacts()
      .map((c) => c.id)
      .join(',');
    return {
      type: 'message',
      canal: 'email',
      step: 'modele',
      ...(ids ? { contactIds: ids } : {})
    };
  });

  protected contactLabel(c: IContact): string {
    return contactDisplayName(c);
  }

  protected monthsSinceLastDonation(c: IContact): number {
    if (!c.lastDonation) {
      return 0;
    }
    const now = new Date();
    const from = c.lastDonation;
    let months = (now.getFullYear() - from.getFullYear()) * 12;
    months += now.getMonth() - from.getMonth();
    return Math.max(0, months);
  }

  protected readonly latestDonationsColumns: TableColumn[] = [
    { key: 'date', header: 'Date', type: 'date', searchable: true },
    { key: 'contactDisplayName', header: 'Profil', searchable: true },
    { key: 'contributionTypeLabel', header: 'Type', type: 'text', searchable: true },
    { key: 'paymentMethodLabel', header: 'Moyen de paiement', type: 'text', searchable: true },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right', searchable: true }
  ];

  constructor() {
    this.organizationDocumentsStore.load();
    this.loadDashboardData();
  }

  protected reloadDashboardData(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    if (!this.authService.isAuthenticated()) return;
    this.loadingData.set(true);
    forkJoin([
      this.contactStore.loadContactsFromApi(),
      this.donationStore.loadDonationsFromApi()
    ]).subscribe({
      next: () => this.loadingData.set(false),
      error: () => {
        this.loadingData.set(false);
        this.toast.show('Impossible de charger les donnees du dashboard.', 'alert');
      }
    });
  }

  private contributionTypeLabel(contact: IContact | undefined): string {
    if (!contact) {
      return '—';
    }
    switch (contact.kind) {
      case 'company':
        return 'Mécène';
      case 'member':
        return 'Cotisation';
      case 'donor':
      case 'helper':
      default:
        return 'Donateur';
    }
  }

  private paymentMethodLabel(paymentMethod: DonationPaymentMethod | null): string {
    if (!paymentMethod) return '—';
    switch (paymentMethod) {
      case 'bank_transfer':
        return 'Virement';
      case 'cash':
        return 'Espèces';
      case 'check':
        return 'Chèques';
      case 'other':
        return 'Autre';
      default: {
        const _exhaustive: never = paymentMethod;
        return _exhaustive;
      }
    }
  }
}
