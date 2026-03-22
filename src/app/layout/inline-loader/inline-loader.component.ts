import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'inline-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inline-loader.component.html',
  styleUrls: ['./inline-loader.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineLoaderComponent {
  @Input() label = '';
  @Input() size: 'md' | 'lg' = 'md';
}
