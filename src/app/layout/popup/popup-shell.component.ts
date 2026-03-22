import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-shell.component.html',
  styleUrls: ['./popup-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupShellComponent {
  @Input() maxWidth = 'min(760px, calc(100% - 32px))';
  @Input() zIndex = 2000;

  @Output() dismiss = new EventEmitter<void>();

  protected onBackdrop(): void {
    this.dismiss.emit();
  }

  protected stopModalClick(event: Event): void {
    event.stopPropagation();
  }

  protected onCloseClick(): void {
    this.dismiss.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss.emit();
  }
}
