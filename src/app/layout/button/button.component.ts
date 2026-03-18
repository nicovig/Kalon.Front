import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'button-component',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input() type: 'primary' | 'ghost' | 'mail' | 'page' | 'upgrade' | 'import-pill' = 'primary';
  @Input() cur: boolean = false;
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
}