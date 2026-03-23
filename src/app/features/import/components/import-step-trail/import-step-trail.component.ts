import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ImportStepTrail = 'type' | 'file' | 'columns';

@Component({
  selector: 'import-step-trail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-step-trail.component.html',
  styleUrls: ['./import-step-trail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportStepTrailComponent {
  readonly step = input.required<ImportStepTrail>();

  protected isOn(s: ImportStepTrail): boolean {
    return this.step() === s;
  }
}

