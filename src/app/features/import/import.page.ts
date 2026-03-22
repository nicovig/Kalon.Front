import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ImportOnboardingWizardComponent } from './onboarding/import-onboarding-wizard/import-onboarding-wizard.component';
import { ImportOnboardingHelpComponent } from './onboarding/import-onboarding-help/import-onboarding-help.component';
import type { ImportOnboardingStep } from './onboarding/import-onboarding-wizard/import-onboarding-wizard.component';
import { ToastService } from '../../layout/toast/toast.service';
import { guessMappingForHeaders } from './core/import-column-guess';
import { IMPORT_FIELD_OPTIONS } from './core/import-field.model';
import { guessDonationMappingForHeaders } from './core/import-donation-guess';
import { DONATION_IMPORT_FIELD_OPTIONS, DonationImportFieldKey } from './core/import-donation-field.model';
import {
  COMBINED_IMPORT_OPTIONS,
  CombinedImportFieldKey
} from './core/import-combined-field.model';
import { guessCombinedMappingForHeaders } from './core/import-combined-guess';
import { ImportMode, IMPORT_MODE_OPTIONS } from './core/import-mode.model';
import { ImportFlowService } from './core/import-flow.service';
import {
  mapDataRowToCombinedPreview,
  mapDataRowToPreview
} from './core/import-map-preview';
import { ImportFieldKey } from './core/import-field.model';
import { parseImportFile } from './core/import-file-parse';
import { mapRowToNewDonorInput } from './core/import-row-to-donor';
import { mapRowToDonationImport, collectDonationImportBag } from './core/import-row-donation';
import { mapCombinedRowToActions } from './core/import-row-combined';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { DonorStoreService } from '../donor/donor.store';
import { DonationStoreService } from '../donation/donation.store';
import { donorDisplayName } from '../../core/models/donor.model';

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
    ImportOnboardingWizardComponent,
    ImportOnboardingHelpComponent,
    FormSelectComponent
  ],
  templateUrl: './import.page.html',
  styleUrls: ['./import.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPageComponent implements OnInit {
  protected readonly importFlow = inject(ImportFlowService);
  private readonly toast = inject(ToastService);
  private readonly donorStore = inject(DonorStoreService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly importMode = signal<ImportMode>('donors');

  protected readonly onboardingStep = signal<ImportOnboardingStep>('type');

  protected readonly fieldOptionsForSelect = computed((): FormSelectOption[] => {
    switch (this.importMode()) {
      case 'donors':
        return IMPORT_FIELD_OPTIONS.map((o) => ({ value: o.key, label: o.label }));
      case 'donations':
        return DONATION_IMPORT_FIELD_OPTIONS.map((o) => ({ value: o.key, label: o.label }));
      case 'combined':
        return COMBINED_IMPORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }));
    }
  });

  protected readonly topbarSubtitle = computed(() => {
    switch (this.importMode()) {
      case 'donors':
        return 'Déposez votre fichier pour relier chaque colonne aux fiches donateurs';
      case 'donations':
        return 'Importez montants et dates ; chaque ligne est reliée à un donateur existant par email';
      case 'combined':
        return 'Un fichier où chaque ligne peut contenir le contact et le don sur la même ligne';
    }
  });

  protected readonly fileName = signal<string | null>(null);
  protected readonly sheetName = signal<string | null>(null);
  protected readonly rowCount = signal(0);
  protected readonly headers = signal<string[]>([]);
  protected readonly bindings = signal<string[]>([]);
  protected readonly sampleRows = signal<string[][]>([]);
  protected readonly allRows = signal<string[][]>([]);

  protected readonly previewRows = computed(() => {
    if (this.importMode() !== 'donors') {
      return [];
    }
    const rows = this.sampleRows();
    const b = this.bindings();
    return rows.map((r) => mapDataRowToPreview(r, b as ImportFieldKey[]));
  });

  protected readonly combinedPreviewRows = computed(() => {
    if (this.importMode() !== 'combined') {
      return [];
    }
    const rows = this.sampleRows();
    const b = this.bindings();
    return rows.map((r) => mapDataRowToCombinedPreview(r, b as CombinedImportFieldKey[]));
  });

  protected readonly donationPreviewRows = computed(() => {
    if (this.importMode() !== 'donations') {
      return [];
    }
    const rows = this.sampleRows();
    const b = this.bindings() as DonationImportFieldKey[];
    return rows.map((r) => {
      const bag = collectDonationImportBag(r, b);
      const email = (bag.donorEmail ?? '').trim();
      const donor = email ? this.donorStore.findDonorByEmail(email) : undefined;
      const donorName = donor ? donorDisplayName(donor) : '—';
      return {
        date: bag.donationDate ?? '—',
        amount: bag.donationAmount ?? '—',
        donorEmail: email || '—',
        donorName
      };
    });
  });

  protected readonly duplicateRowIndices = computed(() => {
    const b = this.bindings();
    const byKey = new Map<string, number[]>();
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
    const byKey = new Map<string, number[]>();
    b.forEach((key, index) => {
      if (key === 'skip') {
        return;
      }
      const list = byKey.get(key) ?? [];
      list.push(index);
      byKey.set(key, list);
    });
    const out: { key: string; label: string; count: number }[] = [];
    for (const [key, indices] of byKey) {
      if (indices.length > 1) {
        out.push({
          key,
          label: this.labelForMappedField(key),
          count: indices.length
        });
      }
    }
    return out;
  });

  protected readonly donationsMappingComplete = computed(() => {
    if (this.importMode() !== 'donations') {
      return true;
    }
    const b = this.bindings();
    return (
      b.includes('donationDate') && b.includes('donationAmount') && b.includes('donorEmail')
    );
  });

  private labelForMappedField(key: string): string {
    return (
      IMPORT_FIELD_OPTIONS.find((o) => o.key === key)?.label ??
      DONATION_IMPORT_FIELD_OPTIONS.find((o) => o.key === key)?.label ??
      COMBINED_IMPORT_OPTIONS.find((o) => o.key === key)?.label ??
      key
    );
  }

  protected readonly importButtonDisabled = computed(() => {
    if (this.duplicateFieldSummaries().length > 0) {
      return true;
    }
    if (!this.donationsMappingComplete()) {
      return true;
    }
    if (!this.fileName() || this.rowCount() === 0) {
      return true;
    }
    return false;
  });

  protected readonly importButtonTitle = computed(() => {
    if (this.duplicateFieldSummaries().length > 0) {
      return 'Corrigez les doublons dans le champ Kalon pour continuer';
    }
    if (!this.donationsMappingComplete()) {
      return 'Mappez au moins une colonne pour la date, le montant et l’email du donateur';
    }
    return '';
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('mode');
    if (qp === 'donors' || qp === 'donations' || qp === 'combined') {
      this.importMode.set(qp);
    }
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      const m = p.get('mode');
      if (m === 'donors' || m === 'donations' || m === 'combined') {
        if (this.importMode() !== m) {
          this.importMode.set(m);
          this.clearAndRestart();
        }
      }
    });
    const f = this.importFlow.takePendingFile();
    if (f) {
      void this.loadFile(f);
    }
  }

  protected setImportMode(mode: ImportMode): void {
    if (this.importMode() === mode) {
      return;
    }
    this.importMode.set(mode);
    this.clearAndRestart();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode },
      queryParamsHandling: 'merge'
    });
  }

  protected modeShortLabel(mode: ImportMode): string {
    return IMPORT_MODE_OPTIONS.find((o) => o.mode === mode)?.label ?? mode;
  }

  protected dismissSuggestDonations(): void {
    this.importFlow.consumeSuggestDonations();
  }

  protected onDroppedFile(file: File): void {
    void this.loadFile(file);
  }

  protected onBindingChange(index: number, value: string): void {
    const next = [...this.bindings()];
    next[index] = value;
    this.bindings.set(next);
  }

  protected reapplyGuess(): void {
    const headers = this.headers();
    const mode = this.importMode();
    if (mode === 'donors') {
      this.bindings.set(guessMappingForHeaders(headers));
    } else if (mode === 'donations') {
      this.bindings.set(guessDonationMappingForHeaders(headers) as unknown as string[]);
    } else {
      this.bindings.set(guessCombinedMappingForHeaders(headers) as unknown as string[]);
    }
  }

  protected clearAndRestart(): void {
    this.fileName.set(null);
    this.sheetName.set(null);
    this.rowCount.set(0);
    this.headers.set([]);
    this.bindings.set([]);
    this.sampleRows.set([]);
    this.allRows.set([]);
    this.onboardingStep.set('type');
  }

  protected importToKalon(): void {
    if (this.importButtonDisabled()) {
      return;
    }
    const mode = this.importMode();
    const rows = this.allRows();
    const b = this.bindings();
    if (mode === 'donors') {
      this.importDonors(rows, b as ImportFieldKey[]);
      return;
    }
    if (mode === 'donations') {
      this.importDonationsOnly(rows, b as DonationImportFieldKey[]);
      return;
    }
    this.importCombined(rows, b as CombinedImportFieldKey[]);
  }

  private importDonors(rows: string[][], bindings: ImportFieldKey[]): void {
    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const input = mapRowToNewDonorInput(row, bindings);
      if (!input) {
        skipped++;
        continue;
      }
      this.donorStore.createDonor(input);
      created++;
    }
    if (created === 0) {
      this.toast.show(
        'Aucun donateur importé : chaque ligne doit avoir au moins un email et un nom ou un prénom.',
        'alert',
        6500
      );
      return;
    }
    this.toast.show(
      `${created} donateur(s) ajouté(s)${skipped > 0 ? ` — ${skipped} ligne(s) ignorée(s)` : ''}.`,
      'success',
      5000
    );
    this.importFlow.setSuggestDonationsNext(true);
    void this.router.navigate(['/import'], { queryParams: { mode: 'donations' } });
  }

  private importDonationsOnly(rows: string[][], bindings: DonationImportFieldKey[]): void {
    let created = 0;
    let skipped = 0;
    let missingDonor = 0;
    for (const row of rows) {
      const parsed = mapRowToDonationImport(row, bindings);
      if (!parsed) {
        skipped++;
        continue;
      }
      const donor = this.donorStore.findDonorByEmail(parsed.donorEmail);
      if (!donor) {
        missingDonor++;
        skipped++;
        continue;
      }
      this.donationStore.addDonationForDonor(donor, parsed.amount, parsed.date);
      created++;
    }
    if (created === 0) {
      this.toast.show(
        `Aucun don importé. Vérifiez les montants, les dates et que l’email correspond à un donateur existant${
          missingDonor > 0 ? ` (${missingDonor} email(s) introuvable(s))` : ''
        }.`,
        'alert',
        7500
      );
      return;
    }
    this.toast.show(
      `${created} don(s) enregistré(s)${skipped > 0 ? ` — ${skipped} ligne(s) ignorée(s)` : ''}.`,
      'success',
      5000
    );
    void this.router.navigate(['/donateurs']);
  }

  private importCombined(rows: string[][], bindings: CombinedImportFieldKey[]): void {
    let donorsCreated = 0;
    let donationsCreated = 0;
    let skipped = 0;
    for (const row of rows) {
      const { donorInput, donation } = mapCombinedRowToActions(row, bindings);
      if (!donorInput) {
        skipped++;
        continue;
      }
      const donor = this.donorStore.createDonor(donorInput);
      donorsCreated++;
      if (donation) {
        this.donationStore.addDonationForDonor(donor, donation.amount, donation.date);
        donationsCreated++;
      }
    }
    if (donorsCreated === 0) {
      this.toast.show(
        'Aucune ligne importée : chaque ligne doit avoir au moins un email et un nom ou un prénom.',
        'alert',
        6500
      );
      return;
    }
    this.toast.show(
      `${donorsCreated} donateur(s) créé(s)${
        donationsCreated > 0 ? `, ${donationsCreated} don(s) associé(s)` : ''
      }${skipped > 0 ? ` — ${skipped} ligne(s) ignorée(s)` : ''}.`,
      'success',
      5500
    );
    void this.router.navigate(['/donateurs']);
  }

  private async loadFile(file: File): Promise<void> {
    this.importFlow.setParsing(true);
    try {
      const parsed = await parseImportFile(file);
      if (!parsed.headers.length) {
        this.toast.show('Aucune colonne détectée dans ce fichier.', 'alert');
        this.allRows.set([]);
        return;
      }
      this.fileName.set(file.name);
      this.sheetName.set(parsed.sheetName ?? null);
      this.rowCount.set(parsed.rows.length);
      this.headers.set(parsed.headers);
      const mode = this.importMode();
      if (mode === 'donors') {
        this.bindings.set(guessMappingForHeaders(parsed.headers));
      } else if (mode === 'donations') {
        this.bindings.set(guessDonationMappingForHeaders(parsed.headers) as unknown as string[]);
      } else {
        this.bindings.set(guessCombinedMappingForHeaders(parsed.headers) as unknown as string[]);
      }
      this.allRows.set(parsed.rows);
      this.sampleRows.set(parsed.rows.slice(0, 8));
    } catch {
      this.toast.show('Impossible de lire ce fichier. Vérifiez le format (CSV ou Excel).', 'alert');
    } finally {
      this.importFlow.setParsing(false);
    }
  }
}
