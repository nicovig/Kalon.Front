import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DASHBOARD_KPIS, DASHBOARD_PLAN_QUOTA, DASHBOARD_REMINDERS } from './mock-data';
import { ButtonComponent } from '../../layout/button/button.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { AuthService } from '../../core/auth/auth.service';
import { DonorCreatePopupComponent } from '../donor/popup/donor-create-popup.component';
import { DonorStoreService } from '../donor/donor.store';

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
  private readonly donorStore = inject(DonorStoreService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly kpis = DASHBOARD_KPIS;
  protected readonly planQuota = DASHBOARD_PLAN_QUOTA;
  protected readonly reminders = DASHBOARD_REMINDERS;

  protected createModalOpen = false;

  protected readonly latestDonorsComputed = computed(() => this.donorStore.donors());

  protected readonly latestDonorsColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true },
    { key: 'lastname', header: 'Nom', searchable: true },
    { key: 'email', header: 'Email', searchable: true },
    { key: 'statut', header: 'Statut', type: 'badge' },
    { key: 'lastDonation', header: 'Dernier don', type: 'date' },
    { key: 'totalDonation', header: 'Total dons', type: 'number', align: 'right' }
  ];

  protected openCreateModal(): void {
    this.createModalOpen = true;
  }

  protected closeCreateModal(): void {
    this.createModalOpen = false;
  }

}

