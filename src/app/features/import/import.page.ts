import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { InlineLoaderComponent } from '../../layout/inline-loader/inline-loader.component';
import { ImportDonorBannerComponent } from './import-donor-banner/import-donor-banner.component';
import { ToastService } from '../../layout/toast/toast.service';
import { guessMappingForHeaders } from './core/import-column-guess';
import { IMPORT_FIELD_OPTIONS, ImportFieldKey } from './core/import-field.model';
import { ImportFlowService } from './core/import-flow.service';
import { mapDataRowToPreview } from './core/import-map-preview';
import { parseImportFile } from './core/import-file-parse';

@Component({
  selector: 'import-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastComponent,
    TopbarComponent,
    CardComponent,
    ButtonLabelComponent,
    InlineLoaderComponent,
    ImportDonorBannerComponent
  ],
  templateUrl: './import.page.html',
  styleUrls: ['./import.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPageComponent implements OnInit {
  protected readonly importFlow = inject(ImportFlowService);
  private readonly toast = inject(ToastService);

  protected readonly fieldOptions = IMPORT_FIELD_OPTIONS;

  protected readonly fileName = signal<string | null>(null);
  protected readonly sheetName = signal<string | null>(null);
  protected readonly rowCount = signal(0);
  protected readonly headers = signal<string[]>([]);
  protected readonly bindings = signal<ImportFieldKey[]>([]);
  protected readonly sampleRows = signal<string[][]>([]);

  protected readonly previewRows = computed(() => {
    const rows = this.sampleRows();
    const b = this.bindings();
    return rows.map((r) => mapDataRowToPreview(r, b));
  });

  protected readonly duplicateRowIndices = computed(() => {
    const b = this.bindings();
    const byKey = new Map<ImportFieldKey, number[]>();
    b.forEach((key, index) => {
      if (key === 'skip') {
        return;
      }
      const list = byKey.get(key) ?? [];
      list.push(index);
      byKey.set(key, list);
    });
    const dup = new Set<number>();
    for (const indices of byKey.values()) {
      if (indices.length > 1) {
        indices.forEach((i) => dup.add(i));
      }
    }
    return dup;
  });

  protected readonly duplicateFieldSummaries = computed(() => {
    const b = this.bindings();
    const byKey = new Map<ImportFieldKey, number[]>();
    b.forEach((key, index) => {
      if (key === 'skip') {
        return;
      }
      const list = byKey.get(key) ?? [];
      list.push(index);
      byKey.set(key, list);
    });
    const out: { key: ImportFieldKey; label: string; count: number }[] = [];
    for (const [key, indices] of byKey) {
      if (indices.length > 1) {
        out.push({
          key,
          label: this.labelForField(key),
          count: indices.length
        });
      }
    }
    return out;
  });

  private labelForField(key: ImportFieldKey): string {
    return IMPORT_FIELD_OPTIONS.find((o) => o.key === key)?.label ?? key;
  }

  ngOnInit(): void {
    const f = this.importFlow.takePendingFile();
    if (f) {
      void this.loadFile(f);
    }
  }

  protected onDroppedFile(file: File): void {
    void this.loadFile(file);
  }

  protected onBindingChange(index: number, value: ImportFieldKey): void {
    const next = [...this.bindings()];
    next[index] = value;
    this.bindings.set(next);
  }

  protected reapplyGuess(): void {
    this.bindings.set(guessMappingForHeaders(this.headers()));
  }

  protected clearAndRestart(): void {
    this.fileName.set(null);
    this.sheetName.set(null);
    this.rowCount.set(0);
    this.headers.set([]);
    this.bindings.set([]);
    this.sampleRows.set([]);
  }

  private async loadFile(file: File): Promise<void> {
    this.importFlow.setParsing(true);
    try {
      const parsed = await parseImportFile(file);
      if (!parsed.headers.length) {
        this.toast.show('Aucune colonne détectée dans ce fichier.', 'alert');
        return;
      }
      this.fileName.set(file.name);
      this.sheetName.set(parsed.sheetName ?? null);
      this.rowCount.set(parsed.rows.length);
      this.headers.set(parsed.headers);
      this.bindings.set(guessMappingForHeaders(parsed.headers));
      this.sampleRows.set(parsed.rows.slice(0, 8));
    } catch {
      this.toast.show('Impossible de lire ce fichier. Vérifiez le format (CSV ou Excel).', 'alert');
    } finally {
      this.importFlow.setParsing(false);
    }
  }
}
