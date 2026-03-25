import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { AuthService } from '../../core/auth/auth.service';
import { DonationStoreService } from '../donation/donation.store';
import { ContactStoreService } from '../contact/contact.store';
import { ContactCreateLauncherComponent } from '../contact/contact-create-launcher.component';
import { EmptyContactsWelcomeComponent } from '../contact/empty-contacts-welcome/empty-contacts-welcome.component';
import { ImportBannerComponent } from '../import/components/import-banner/import-banner.component';
import { contactDisplayName, IContact } from '../../core/models/contact.model';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';
import { DonationPaymentMethod } from '../../core/models/donation.model';

@Component({
  selector: 'dashboard-page',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonLabelComponent,
    TableComponent,
    DashboardCardComponent,
    ToastComponent,
    TopbarComponent,
    CardComponent,
    ContactCreateLauncherComponent,
    EmptyContactsWelcomeComponent,
    ImportBannerComponent
  ]
})
export class DashboardPageComponent {

  private readonly authService = inject(AuthService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);

  protected readonly currentUser = this.authService.currentUser;

  protected readonly latestDonationsComputed = computed(() =>
    this.donationStore.donations().map((d) => ({
      ...d,
      paymentMethodLabel: this.paymentMethodLabel(d.paymentMethod)
    }))
  );

  protected readonly kpiActiveContacts = computed(
    () =>
      this.contactStore
        .contacts()
        .filter((c) => this.contactSettings.statusOf(c) === 'active').length
  );

  protected readonly kpiYearDonationsTotal = computed(() => {
    const y = new Date().getFullYear();
    return this.donationStore
      .donations()
      .filter((d) => d.date.getFullYear() === y)
      .reduce((sum, d) => sum + d.amount, 0);
  });

  protected readonly kpiToRemind = computed(
    () =>
      this.contactStore
        .contacts()
        .filter((d) => this.contactSettings.statusOf(d) === 'to_remind').length
  );

  protected readonly kpiReceipts = 0;

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
      .filter((c) => this.contactSettings.statusOf(c) === 'to_remind')
      .sort(
        (a, b) => (a.lastDonation?.getTime() ?? 0) - (b.lastDonation?.getTime() ?? 0)
      )
      .slice(0, 5)
  );

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
    { key: 'paymentMethodLabel', header: 'Moyen de paiement', type: 'text', searchable: true },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right', searchable: true }
  ];

  private paymentMethodLabel(paymentMethod: DonationPaymentMethod): string {
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
