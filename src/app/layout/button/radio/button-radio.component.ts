import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'button-radio',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './button-radio.component.html',
  styleUrls: ['./button-radio.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonRadioComponent {
  private static nextGroupId = 0;
  private static readonly groupNameByControl = new WeakMap<FormControl<string>, string>();

  @Input({ required: true }) control!: FormControl<string>;
  @Input({ required: true }) value!: string;
  @Input() name: string | null = null;

  protected get radioName(): string {
    if (this.name) {
      return this.name;
    }
    let groupName = ButtonRadioComponent.groupNameByControl.get(this.control);
    if (!groupName) {
      groupName = `radio-group-${ButtonRadioComponent.nextGroupId++}`;
      ButtonRadioComponent.groupNameByControl.set(this.control, groupName);
    }
    return groupName;
  }
}
