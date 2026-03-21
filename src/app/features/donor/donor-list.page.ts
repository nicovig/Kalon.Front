import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonComponent } from '../../layout/button/button.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DonorCreatePopupComponent } from './popup/donor-create-popup.component';
import { DonorStoreService } from './donor.store';

@Component({
  selector: 'donor-page',
  standalone: true,
  templateUrl: './donor-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastComponent, TopbarComponent, ButtonComponent, TableComponent, DonorCreatePopupComponent]
})
export class DonorListPageComponent {
  private readonly donorStore = inject(DonorStoreService);

  protected createModalOpen = false;

  protected readonly donorsComputed = computed(() => this.donorStore.donors());

  protected readonly donorColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true },
    { key: 'lastname', header: 'Nom', searchable: true },
    { key: 'email', header: 'Email', searchable: true },
    { key: 'phone', header: 'Téléphone', searchable: true },
    { key: 'address.street', header: 'Adresse', searchable: true },
    { key: 'statut', header: 'Statut', type: 'badge' },
    { key: 'totalDonation', header: 'Total dons', type: 'number', align: 'right' }
  ];

  protected openCreateModal(): void {
    this.createModalOpen = true;
  }

  protected closeCreateModal(): void {
    this.createModalOpen = false;
  }
}

