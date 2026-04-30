import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonLabelComponent } from '../button/button-label/button-label.component';

@Component({
  selector: 'floating-step-bar',
  standalone: true,
  imports: [CommonModule, ButtonLabelComponent],
  templateUrl: './floating-step-bar.component.html',
  styleUrls: ['./floating-step-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloatingStepBarComponent {
  @Input() centerText = '';
  @Input() prevLabel = 'Précédent';
  @Input() nextLabel = 'Continuer';
  @Input() disableNext = false;
  @Input() hidePrev = false;

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}

