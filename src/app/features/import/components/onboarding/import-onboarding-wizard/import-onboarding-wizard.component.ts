import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportMode, IMPORT_MODE_OPTIONS } from '../../../core/model/import-mode.model';
import { ImportBannerComponent } from '../../import-banner/import-banner.component';
import { InlineLoaderComponent } from '../../../../../layout/inline-loader/inline-loader.component';
import { ButtonLabelComponent } from '../../../../../layout/button/button-label/button-label.component';
import { ImportStepTrailComponent } from '../../import-step-trail/import-step-trail.component';
import { ChoiceCardItem, ChoiceCardsComponent } from '../../../../../layout/choice-cards/choice-cards.component';

export type ImportOnboardingStep = 'type' | 'file';

@Component({
  selector: 'import-onboarding-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ImportStepTrailComponent,
    ChoiceCardsComponent,
    ImportBannerComponent,
    InlineLoaderComponent,
    ButtonLabelComponent
  ],
  templateUrl: './import-onboarding-wizard.component.html',
  styleUrl: './import-onboarding-wizard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportOnboardingWizardComponent {
  readonly mode = input.required<ImportMode>();

  readonly step = input.required<ImportOnboardingStep>();

  readonly parsing = input(false);

  readonly modeChange = output<ImportMode>();

  readonly stepChange = output<ImportOnboardingStep>();

  readonly fileSelected = output<File>();

  protected readonly options: ChoiceCardItem[] = IMPORT_MODE_OPTIONS.map((opt) => ({
    key: opt.mode,
    icon: opt.mode === 'contacts' ? '👤' : opt.mode === 'donations' ? '💶' : '🔗',
    title: opt.label,
    blurb: opt.blurb,
    hint: opt.hint
  }));

  protected goToFileStep(): void {
    this.stepChange.emit('file');
  }

  protected goBackToType(): void {
    this.stepChange.emit('type');
  }

  protected onModeChange(m: ImportMode): void {
    this.modeChange.emit(m);
  }

  protected onFile(f: File): void {
    this.fileSelected.emit(f);
  }
}
