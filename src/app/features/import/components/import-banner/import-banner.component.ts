import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ImportFlowService } from '../../core/import-flow.service';
import { ImportMode } from '../../core/model/import-mode.model';
import { ImportPopUpComponent } from '../import-pop-up/import-pop-up.component';

@Component({
  selector: 'import-banner',
  standalone: true,
  imports: [CommonModule, ImportPopUpComponent],
  templateUrl: './import-banner.component.html',
  styleUrls: ['./import-banner.component.css'],
  host: {
    '[class.import-banner--xxl]': 'variant === "xxl"'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportBannerComponent {
  private readonly flow = inject(ImportFlowService);
  private readonly router = inject(Router);

  @Input() navigate = true;

  @Input() variant: 'default' | 'xxl' = 'default';

  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  protected dragOver = false;
  protected modePickerOpen = false;
  private fileForModeSelection: File | null = null;

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
    if (f && this.isAccepted(f)) {
      this.dispatchFile(f);
    }
  }

  protected openPicker(): void {
    this.fileInput?.nativeElement.click();
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (f && this.isAccepted(f)) {
      this.dispatchFile(f);
    }
  }

  private dispatchFile(file: File): void {
    if (this.navigate) {
      this.fileForModeSelection = file;
      this.modePickerOpen = true;
    } else {
      this.fileSelected.emit(file);
    }
  }

  protected closeModePicker(): void {
    this.modePickerOpen = false;
    this.fileForModeSelection = null;
  }

  protected onModePicked(mode: ImportMode): void {
    const file = this.fileForModeSelection;
    if (!file) return;
    this.modePickerOpen = false;
    this.fileForModeSelection = null;
    this.flow.setPendingFile(file);
    void this.router.navigate(['/import'], { queryParams: { mode } });
  }

  private isAccepted(file: File): boolean {
    const n = file.name.toLowerCase();
    return n.endsWith('.csv') || n.endsWith('.xlsx') || n.endsWith('.xls');
  }
}
