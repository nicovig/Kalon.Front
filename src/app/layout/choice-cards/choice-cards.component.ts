import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ChoiceCardItem = {
  key: string;
  icon?: string;
  title: string;
  blurb?: string;
  hint?: string;
};

@Component({
  selector: 'choice-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choice-cards.component.html',
  styleUrls: ['./choice-cards.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChoiceCardsComponent {
  readonly options = input.required<ChoiceCardItem[]>();
  readonly selectedKey = input<string | null>(null);
  readonly ariaLabel = input('Choix');

  readonly optionSelected = output<string>();

  protected onSelect(key: string): void {
    this.optionSelected.emit(key);
  }
}

