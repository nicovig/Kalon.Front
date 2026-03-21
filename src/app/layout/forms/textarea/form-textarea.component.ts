import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type TextareaVariant = 'dark' | 'light';

@Component({
  selector: 'form-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-textarea.component.html',
  styleUrls: ['./form-textarea.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormTextareaComponent {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() placeholder = '';
  @Input() rows = 4;
  @Input() id: string | null = null;
  @Input() variant: TextareaVariant = 'dark';

  onInput(value: string | null | undefined): void {
    this.valueChange.emit(value ?? '');
  }
}

