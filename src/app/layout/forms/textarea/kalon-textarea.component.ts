import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type TextareaVariant = 'dark' | 'light';

@Component({
  selector: 'kalon-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kalon-textarea.component.html',
  styleUrls: ['./kalon-textarea.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KalonTextareaComponent {
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

