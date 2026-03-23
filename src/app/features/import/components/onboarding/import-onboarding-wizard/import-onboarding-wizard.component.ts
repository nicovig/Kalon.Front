import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportMode, IMPORT_MODE_OPTIONS } from '../../../core/model/import-mode.model';
import { ImportBannerComponent } from '../../import-banner/import-banner.component';
import { InlineLoaderComponent } from '../../../../../layout/inline-loader/inline-loader.component';
import { ButtonLabelComponent } from '../../../../../layout/button/button-label/button-label.component';
import { ImportStepTrailComponent } from '../../import-step-trail/import-step-trail.component';

export type ImportOnboardingStep = 'type' | 'file';

@Component({
  selector: 'import-onboarding-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ImportStepTrailComponent,
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

  protected readonly options = IMPORT_MODE_OPTIONS;

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
