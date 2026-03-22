import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'radio-option',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './radio-option.component.html',
  styleUrls: ['./radio-option.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadioOptionComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input({ required: true }) value!: string;
}
