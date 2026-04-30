import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
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

  @ViewChild('nativeTextarea')
  private readonly nativeTextarea?: ElementRef<HTMLTextAreaElement>;

  onInput(value: string | null | undefined): void {
    this.valueChange.emit(value ?? '');
  }

  insertAtCursor(fragment: string): void {
    const el = this.nativeTextarea?.nativeElement;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const v = this.value;
    const next = v.slice(0, start) + fragment + v.slice(end);
    this.onInput(next);
    queueMicrotask(() => {
      el.focus();
      const pos = start + fragment.length;
      el.setSelectionRange(pos, pos);
    });
  }
}

