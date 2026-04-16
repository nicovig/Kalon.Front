import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'dashboard-card-component',
  standalone: true,
  templateUrl: './dashboard-card.component.html',
  styleUrls: ['./dashboard-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardCardComponent {
    @Input() type: 'violet' | 'pink' | 'mint' | 'yellow' = 'violet';
    @Input() value: string = '0';
    @Input() label: string = '';
    @Input() helper: string = '';
    @Input() chip: 'up' | 'down' | 'warn' = 'up';
    @Input() icon: string = '';
}