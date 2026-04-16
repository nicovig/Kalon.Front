import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StepTrailComponent, StepTrailItem } from '../../../../layout/step-trail/step-trail.component';

export type ImportStepTrail = 'type' | 'file' | 'columns';

@Component({
  selector: 'import-step-trail',
  standalone: true,
  imports: [StepTrailComponent],
  templateUrl: './import-step-trail.component.html',
  styleUrls: ['./import-step-trail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportStepTrailComponent {
  readonly step = input.required<ImportStepTrail>();

  protected readonly steps: StepTrailItem[] = [
    { key: 'type', label: 'Type' },
    { key: 'file', label: 'Fichier' },
    { key: 'columns', label: 'Colonnes' }
  ];
}

