import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CollapsibleChipItem {
  id: string;
  name: string;
  subtitle?: string;
}

@Component({
  selector: 'collapsible-chip-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './collapsible-chip-list.component.html',
  styleUrls: ['./collapsible-chip-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollapsibleChipListComponent {
  readonly title = input.required<string>();
  readonly items = input.required<CollapsibleChipItem[]>();
  readonly removeLabel = input('Retirer');

  readonly removeItem = output<string>();
}
