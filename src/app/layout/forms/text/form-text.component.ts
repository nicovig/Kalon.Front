import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'form-text-component',
  standalone: true,
  templateUrl: './form-text.component.html',
  styleUrls: ['./form-text.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormTextComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormTextComponent implements ControlValueAccessor {
  @Input() placeholder = 'Rechercher...';
  @Input() value = '';
  @Input() type: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' = 'text';
  @Input() disabled = false;
  @Input() required = false;
  @Input() icon: string | null = '🔍';
  @Input() width: string = '100%';
  @Input() allowPasswordToggle = false;
  @Input() id = '';
  @Input() name = '';
  @Input() autocomplete: string | null = null;
  @Input() ariaLabel: string | null = null;

  @Output() search: EventEmitter<string> = new EventEmitter<string>();
  @Output() valueChange = new EventEmitter<string>();

  private changeCallback: (value: string) => void = () => {};
  private touchedCallback: () => void = () => {};
  protected isPasswordVisible = false;

  get effectiveType(): string {
    if (this.type !== 'password') {
      return this.type;
    }

    return this.isPasswordVisible ? 'text' : 'password';
  }

  get effectiveIcon(): string | null {
    if (this.type === 'password' && this.allowPasswordToggle) {
      return this.isPasswordVisible ? '👁️' : '🙈';
    }

    return this.icon;
  }

  togglePasswordVisibility(): void {
    if (this.type !== 'password' || !this.allowPasswordToggle) {
      return;
    }

    this.isPasswordVisible = !this.isPasswordVisible;
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.changeCallback = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(value: string): void {
    this.value = value;
    this.changeCallback(value);
    this.valueChange.emit(value);
    this.search.emit(value);
  }

  onBlur(): void {
    this.touchedCallback();
  }
}
