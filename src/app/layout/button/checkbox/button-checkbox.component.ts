import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'button-checkbox',
  standalone: true,
  templateUrl: './button-checkbox.component.html',
  styleUrls: ['./button-checkbox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonCheckboxComponent {
  @Input() checked = false;
}

