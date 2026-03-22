import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'import-onboarding-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-onboarding-help.component.html',
  styleUrl: './import-onboarding-help.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportOnboardingHelpComponent {}
