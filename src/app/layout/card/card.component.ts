import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() paddingClass: 'default' | 'advanced' = 'default';
  @Input() variant: 'default' | 'bare' = 'default';
  @Input() type: 'text' | 'button' = 'text';
  @Input() disabled = false;

  @Output() click = new EventEmitter<void>();

  protected onCardClick(): void {
    if (this.type !== 'button' || this.disabled) {
      return;
    }
    this.click.emit();
  }
}
