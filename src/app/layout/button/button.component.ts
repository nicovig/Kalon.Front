import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'button-component',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input()
  type:
    | 'primary'
    | 'ghost'
    | 'mail'
    | 'page'
    | 'upgrade'
    | 'import-pill'
    | 'send'
    | 'adv-apply'
    | 'ia-gen'
    | 'toolbar' = 'primary';
  @Input() cur: boolean = false;
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() id: string | null = null;
  @Input() title: string | null = null;
}