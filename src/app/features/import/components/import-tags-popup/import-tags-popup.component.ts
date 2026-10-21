import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../../../layout/button/button-label/button-label.component';
import { FormTextComponent } from '../../../../layout/forms/text/form-text.component';
import type { ImportTagMappingDraft } from '../../core/import-tags';

export type ImportTagsPopupStep = 'create' | 'import';

@Component({
  selector: 'import-tags-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ButtonLabelComponent, FormTextComponent],
  templateUrl: './import-tags-popup.component.html',
  styleUrls: ['./import-tags-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportTagsPopupComponent {
  readonly drafts = input.required<ImportTagMappingDraft[]>();
  readonly columnLabel = input('Tag');
  readonly busy = input(false);
  readonly step = input<ImportTagsPopupStep>('create');

  readonly dismiss = output<void>();
  readonly primaryAction = output<ImportTagMappingDraft[]>();

  protected readonly localDrafts = signal<ImportTagMappingDraft[]>([]);

  protected readonly primaryLabel = computed(() =>
    this.step() === 'create' ? 'Créer les tags correspondants' : "Continuer l'import des données"
  );

  constructor() {
    effect(() => {
      this.localDrafts.set(this.drafts().map((d) => ({ ...d })));
    });
  }

  protected onKalonNameChange(index: number, value: string): void {
    this.localDrafts.update((list) =>
      list.map((row, i) => (i === index ? { ...row, kalonName: String(value ?? '') } : row))
    );
  }

  protected onDismiss(): void {
    this.dismiss.emit();
  }

  protected onPrimary(): void {
    this.primaryAction.emit(this.localDrafts().map((d) => ({ ...d })));
  }
}
