import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'file-drop-zone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-drop.component.html',
  styleUrls: ['./file-drop.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileDropComponent {
  @Input() inline = false;

  @ViewChild('fileInput') protected fileInput?: ElementRef<HTMLInputElement>;

  @Output() fileSelected = new EventEmitter<File>();

  protected dragOver = false;

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    const f = event.dataTransfer?.files?.[0];
    if (f) {
      this.emitIfAccepted(f);
    }
  }

  protected openPicker(): void {
    this.fileInput?.nativeElement.click();
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (f) {
      this.emitIfAccepted(f);
    }
  }

  private emitIfAccepted(file: File): void {
    const ok = this.isAccepted(file);
    if (ok) {
      this.fileSelected.emit(file);
    }
  }

  private isAccepted(file: File): boolean {
    const n = file.name.toLowerCase();
    return n.endsWith('.csv') || n.endsWith('.xlsx') || n.endsWith('.xls');
  }
}
