import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { ButtonComponent } from '../../layout/button/button.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DASHBOARD_LATEST_DONORS } from '../dashboard/mock-data';

@Component({
  selector: 'donor-page',
  standalone: true,
  templateUrl: './donor-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastComponent, TopbarComponent, ButtonComponent, TableComponent]
})
export class DonorListPageComponent {
  protected readonly donorsComputed = computed(() => DASHBOARD_LATEST_DONORS);

  protected readonly donorColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true },
    { key: 'lastname', header: 'Nom', searchable: true },
    { key: 'email', header: 'Email', searchable: true },
    { key: 'phone', header: 'Téléphone', searchable: true },
    { key: 'address', header: 'Adresse', searchable: true },
    { key: 'statut', header: 'Statut', type: 'badge' },
    { key: 'totalDonation', header: 'Total dons', type: 'number', align: 'right' }
  ];
}

