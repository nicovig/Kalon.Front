import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'kalon-checkbox',
  standalone: true,
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxComponent {
  @Input() checked = false;
}

