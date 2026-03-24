import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'form-number-component',
  standalone: true,
  templateUrl: './form-number.component.html',
  styleUrls: ['./form-number.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormNumberComponent {
  @Input() value: string | number = '';
  @Input() placeholder = '';
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() id = '';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  protected onInput(value: string): void {
    this.valueChange.emit(value);
  }
}
