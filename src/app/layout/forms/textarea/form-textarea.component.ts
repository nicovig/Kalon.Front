import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'form-textarea',
  standalone: true,
  templateUrl: './form-textarea.component.html',
  styleUrls: ['./form-textarea.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormTextareaComponent {
  @Input() placeholder = '';
}
