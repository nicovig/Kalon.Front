import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { IDonor } from '../../core/models/donor.model';
import { DonorCreateLauncherComponent } from './donor-create-launcher.component';
import { EmptyDonorsWelcomeComponent } from './empty-donors-welcome/empty-donors-welcome.component';
import { ImportBannerComponent } from '../import/components/import-banner/import-banner.component';
import { DonorDonationsPopupComponent } from './popup/donor-donations/donor-donations-popup.component';
import { EditDonorPopupComponent } from './popup/edit-donor/edit-donor-popup.component';
import { DonorStoreService } from './donor.store';
import { DonorSettingsComponent } from './settings/donor-settings.component';
import { DonorSettingsStore } from './settings/donor-settings.store';

@Component({
  selector: 'donor-page',
  standalone: true,
  templateUrl: './donor-list.page.html',
  styleUrls: ['./donor-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToastComponent,
    TopbarComponent,
    TableComponent,
    DonorCreateLauncherComponent,
    EmptyDonorsWelcomeComponent,
    EditDonorPopupComponent,
    DonorDonationsPopupComponent,
    ImportBannerComponent,
    DonorSettingsComponent
  ]
})
export class DonorListPageComponent {
  private readonly donorStore = inject(DonorStoreService);
  private readonly donorSettings = inject(DonorSettingsStore);

  protected readonly donorsComputed = computed(() => {
    const now = new Date();
    return this.donorStore.donors().map((d) => ({
      ...d,
      statut: this.donorSettings.statusOf(d, now)
    }));
  });

  protected readonly donorToEdit = signal<IDonor | null>(null);

  protected readonly donorToViewDonations = signal<IDonor | null>(null);

  protected onEditDonor(row: unknown): void {
    this.donorToEdit.set(row as IDonor);
  }

  protected closeEditDonor(): void {
    this.donorToEdit.set(null);
  }

  protected onViewDonations(row: unknown): void {
    this.donorToViewDonations.set(row as IDonor);
  }

  protected closeViewDonations(): void {
    this.donorToViewDonations.set(null);
  }

  protected readonly donorColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true },
    { key: 'lastname', header: 'Nom', searchable: true },
    { key: 'kind', header: 'Type', type: 'donorKind', searchable: true },
    { key: 'email', header: 'Email', searchable: true },
    { key: 'phone', header: 'Téléphone', searchable: true },
    { key: 'address.street', header: 'Adresse', searchable: true },
    { key: 'statut', header: 'Statut', type: 'badge' },
    { key: 'totalDonation', header: 'Total dons', type: 'number', align: 'right' }
  ];
}

