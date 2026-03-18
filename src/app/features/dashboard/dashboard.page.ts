import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DASHBOARD_KPIS, DASHBOARD_LATEST_DONORS, DASHBOARD_PLAN_QUOTA, DASHBOARD_REMINDERS } from './mock-data';
import { ButtonComponent } from '../../layout/button/button.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';

@Component({
  selector: 'dashboard-page',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, TableComponent, DashboardCardComponent, ToastComponent, TopbarComponent, CardComponent]
})
export class DashboardPageComponent {

  protected readonly kpis = DASHBOARD_KPIS;
  protected readonly latestDonors = DASHBOARD_LATEST_DONORS;
  protected readonly planQuota = DASHBOARD_PLAN_QUOTA;
  protected readonly reminders = DASHBOARD_REMINDERS;

  protected readonly latestDonorsComputed = computed(() => DASHBOARD_LATEST_DONORS);

  protected readonly latestDonorsColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true },
    { key: 'lastname', header: 'Nom', searchable: true },
    { key: 'email', header: 'Email', searchable: true },
    { key: 'statut', header: 'Statut', type: 'badge' },
    { key: 'lastDonation', header: 'Dernier don', type: 'date' },
    { key: 'totalDonation', header: 'Total dons', type: 'number', align: 'right' }
  ];

}

