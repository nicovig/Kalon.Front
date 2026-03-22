import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { AuthService } from '../../core/auth/auth.service';
import { DonationStoreService } from '../donation/donation.store';
import { DonorStoreService } from '../donor/donor.store';
import { DonorCreateLauncherComponent } from '../donor/donor-create-launcher.component';
import { EmptyDonorsWelcomeComponent } from '../donor/empty-donors-welcome/empty-donors-welcome.component';
import { ImportDonorBannerComponent } from '../import/import-donor-banner/import-donor-banner.component';
import { donorDisplayName, IDonor } from '../../core/models/donor.model';

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
    DonorCreateLauncherComponent,
    EmptyDonorsWelcomeComponent,
    ImportDonorBannerComponent
  ]
})
export class DashboardPageComponent {

  private readonly authService = inject(AuthService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly donorStore = inject(DonorStoreService);

  protected readonly currentUser = this.authService.currentUser;

  protected readonly latestDonationsComputed = computed(() => this.donationStore.donations());

  protected readonly kpiActiveDonors = computed(
    () => this.donorStore.donors().filter((d) => d.statut === 'active').length
  );

  protected readonly kpiYearDonationsTotal = computed(() => {
    const y = new Date().getFullYear();
    return this.donationStore
      .donations()
      .filter((d) => d.date.getFullYear() === y)
      .reduce((sum, d) => sum + d.amount, 0);
  });

  protected readonly kpiToRemind = computed(
    () => this.donorStore.donors().filter((d) => d.statut === 'to_remind').length
  );

  protected readonly kpiReceipts = 0;

  protected readonly donorCount = computed(() => this.donorStore.donors().length);

  protected readonly quotaDonorsPct = computed(() => {
    const limit = 300;
    const n = this.donorCount();
    return Math.min(100, Math.round((n / limit) * 100));
  });

  protected readonly importCount = computed(() => 0);
  protected readonly importQuotaPct = computed(() => 0);

  protected readonly emailSentCount = computed(() => 0);
  protected readonly emailSentQuotaPct = computed(() => 0);

  protected readonly priorityRelanceDonors = computed(() =>
    this.donorStore
      .donors()
      .filter((d) => d.statut === 'to_remind')
      .sort(
        (a, b) => (a.lastDonation?.getTime() ?? 0) - (b.lastDonation?.getTime() ?? 0)
      )
      .slice(0, 5)
  );

  protected donorLabel(d: IDonor): string {
    return donorDisplayName(d);
  }

  protected monthsSinceLastDonation(d: IDonor): number {
    if (!d.lastDonation) {
      return 0;
    }
    const now = new Date();
    const from = d.lastDonation;
    let months = (now.getFullYear() - from.getFullYear()) * 12;
    months += now.getMonth() - from.getMonth();
    return Math.max(0, months);
  }

  protected readonly latestDonationsColumns: TableColumn[] = [
    { key: 'date', header: 'Date', type: 'date', searchable: true },
    { key: 'donorDisplayName', header: 'Donateur', searchable: true },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right', searchable: true }
  ];

}
