import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ImportFlowService } from '../../core/import-flow.service';
import { ImportMode } from '../../core/model/import-mode.model';
import { ImportPopUpComponent } from '../import-pop-up/import-pop-up.component';
import { FileDropComponent } from '../../../../layout/file-drop/file-drop.component';

@Component({
  selector: 'import-banner',
  standalone: true,
  imports: [CommonModule, ImportPopUpComponent, FileDropComponent],
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
  @Input() title = 'Déposez votre fichier ici : profils, financements, ou les deux';

  @Input() variant: 'default' | 'xxl' = 'default';

  @Output() fileSelected = new EventEmitter<File>();
  protected modePickerOpen = false;
  private fileForModeSelection: File | null = null;

  protected onFileSelected(file: File): void {
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

}
