import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'emoji-holder',
  standalone: true,
  imports: [PickerComponent],
  templateUrl: './emoji-holder.component.html',
  styleUrls: ['./emoji-holder.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmojiHolderComponent {

  @Output() emojiSelected = new EventEmitter<string>();

  select(event: any): void {
    const native = event?.emoji?.native ?? event?.emoji?.colons ?? '';
    if (!native) {
      return;
    }
    this.emojiSelected.emit(native);
  }
}

