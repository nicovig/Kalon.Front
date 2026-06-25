import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportMode } from '../../core/model/import-mode.model';
import { getImportBusinessRules } from '../../core/import-business-rules';

@Component({
  selector: 'import-business-rules-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-business-rules-tooltip.component.html',
  styleUrls: ['./import-business-rules-tooltip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportBusinessRulesTooltipComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly mode = input<ImportMode>('contacts');

  protected readonly open = signal(false);

  protected sections() {
    return getImportBusinessRules(this.mode());
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
