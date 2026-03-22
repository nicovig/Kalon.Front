import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  forwardRef,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'form-date-component',
  standalone: true,
  templateUrl: './form-date.component.html',
  styleUrls: ['./form-date.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormDateComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormDateComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() id = '';
  @Input() name = '';
  @Input() width = '100%';
  @Input() disabled = false;
  @Input() required = false;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() autocomplete: string | null = null;
  @Input() ariaLabel: string | null = null;

  protected value = '';

  private changeCallback: (value: string) => void = () => {};
  private touchedCallback: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.changeCallback = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  protected onInput(value: string): void {
    this.value = value;
    this.changeCallback(value);
    this.cdr.markForCheck();
  }

  protected onBlur(): void {
    this.touchedCallback();
  }
}
