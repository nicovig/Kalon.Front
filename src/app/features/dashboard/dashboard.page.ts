import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DASHBOARD_LATEST_DONATIONS } from './mock-data';
import { ButtonComponent } from '../../layout/button/button.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { AuthService } from '../../core/auth/auth.service';
import { DonorCreatePopupComponent } from '../donor/popup/donor-create-popup.component';

@Component({
  selector: 'dashboard-page',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, TableComponent, DashboardCardComponent, ToastComponent, TopbarComponent, CardComponent, DonorCreatePopupComponent]
})
export class DashboardPageComponent {

  private readonly authService = inject(AuthService);

  protected readonly currentUser = this.authService.currentUser;

  protected readonly latestDonations = DASHBOARD_LATEST_DONATIONS;

  protected readonly latestDonationsColumns: TableColumn[] = [
    { key: 'date', header: 'Date', type: 'date', searchable: true },
    { key: 'donorDisplayName', header: 'Donateur', searchable: true },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right', searchable: true }
  ];

  protected createModalOpen = false;

  protected openCreateModal(): void {
    this.createModalOpen = true;
  }

  protected closeCreateModal(): void {
    this.createModalOpen = false;
  }

}
