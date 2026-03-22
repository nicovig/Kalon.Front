import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormSelectOption = { value: string; label: string };

@Component({
  selector: 'form-select-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-select.component.html',
  styleUrls: ['./form-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormSelectComponent implements ControlValueAccessor {
  @Input() label: string | null = null;

  @Input() options: FormSelectOption[] = [];

  @Input() disabled = false;

  @Input() invalid = false;

  @Input() variant: 'default' | 'warn' = 'default';

  protected innerValue = '';

  private changeCb: (v: string) => void = () => {};

  private touchedCb: () => void = () => {};

  writeValue(value: string | null): void {
    this.innerValue = value ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.changeCb = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touchedCb = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onSelectChange(value: string): void {
    this.innerValue = value;
    this.changeCb(value);
  }

  protected onBlur(): void {
    this.touchedCb();
  }
}
