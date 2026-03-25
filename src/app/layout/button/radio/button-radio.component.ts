import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'button-radio',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './button-radio.component.html',
  styleUrls: ['./button-radio.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonRadioComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input({ required: true }) value!: string;
  @Input() name: string | null = null;

  protected readonly instanceName = `radio-${Math.random().toString(16).slice(2)}`;
}
