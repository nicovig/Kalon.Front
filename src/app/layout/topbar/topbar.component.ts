import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
} 

