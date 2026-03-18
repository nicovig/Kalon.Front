import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DASHBOARD_KPIS, DASHBOARD_LATEST_DONORS, DASHBOARD_PLAN_QUOTA, DASHBOARD_REMINDERS } from './mock-data';

@Component({
  selector: 'kalon-dashboard-page',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  protected readonly kpis = DASHBOARD_KPIS;
  protected readonly latestDonors = DASHBOARD_LATEST_DONORS;
  protected readonly planQuota = DASHBOARD_PLAN_QUOTA;
  protected readonly reminders = DASHBOARD_REMINDERS;
}

