import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'button-label-component',
  standalone: true,
  templateUrl: './button-label.component.html',
  styleUrls: ['./button-label.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonLabelComponent {
  @Input()
  type:
    | 'primary'
    | 'ghost'
    | 'mail'
    | 'page'
    | 'upgrade'
    | 'import-pill'
    | 'step'
    | 'send'
    | 'adv-apply'
    | 'ia-gen'
    | 'toolbar' = 'primary';
  @Input() cur: boolean = false;
  @Input() active: boolean = false;
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() id: string | null = null;
  @Input() title: string | null = null;
}
