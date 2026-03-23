import { ChangeDetectionStrategy, Component, EventEmitter, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../../../layout/button/button-label/button-label.component';
import { ImportMode, IMPORT_MODE_OPTIONS } from '../../core/model/import-mode.model';

@Component({
  selector: 'import-pop-up',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ButtonLabelComponent],
  templateUrl: './import-pop-up.component.html',
  styleUrls: ['./import-pop-up.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPopUpComponent {
  readonly dismiss = output<void>();
  readonly continue = output<ImportMode>();

  protected readonly options = IMPORT_MODE_OPTIONS;
  protected readonly activeMode = signal<ImportMode | null>(null);

  protected pick(mode: ImportMode): void {
    this.activeMode.set(mode);
  }

  protected onDismiss(): void {
    this.dismiss.emit();
  }

  protected onContinue(): void {
    const mode = this.activeMode();
    if (!mode) return;
    this.continue.emit(mode);
  }
}

