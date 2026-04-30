import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StepTrailItem = {
  key: string;
  label: string;
};

@Component({
  selector: 'step-trail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-trail.component.html',
  styleUrls: ['./step-trail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepTrailComponent {
  readonly currentKey = input.required<string>();
  readonly steps = input.required<StepTrailItem[]>();
}

