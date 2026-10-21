import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, concatMap, finalize, from, map, of, reduce, switchMap, toArray } from 'rxjs';
import type { DonationPaymentMethod, DonationType } from '../../core/models/donation.model';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ImportOnboardingWizardComponent } from './components/onboarding/import-onboarding-wizard/import-onboarding-wizard.component';
import { ImportOnboardingHelpComponent } from './components/onboarding/import-onboarding-help/import-onboarding-help.component';
import type { ImportOnboardingStep } from './components/onboarding/import-onboarding-wizard/import-onboarding-wizard.component';
import { ToastService } from '../../layout/toast/toast.service';
import { guessMappingForHeaders } from './core/import-column-guess';
import { IMPORT_FIELD_OPTIONS } from './core/model/import-field.model';
import { guessDonationMappingForHeaders } from './core/import-donation-guess';
import { DONATION_IMPORT_FIELD_OPTIONS, DonationImportFieldKey } from './core/model/import-donation-field.model';
import {
  COMBINED_IMPORT_OPTIONS,
  CombinedImportFieldKey
} from './core/model/import-combined-field.model';
import { guessCombinedMappingForHeaders } from './core/import-combined-guess';
import { ImportMode, IMPORT_MODE_OPTIONS } from './core/model/import-mode.model';
import { ImportFlowService } from './core/import-flow.service';
import {
  mapDataRowToCombinedPreview,
  mapDataRowToPreview
} from './core/import-map-preview';
import { ImportFieldKey } from './core/model/import-field.model';
import { parseAmountFromCell, parseDateFromCell } from './core/import-parse-cells';
import { parseImportFile } from './core/import-file-parse';
import { mapRowToNewContactInput } from './core/import-row-to-contact';
import type { NewContactInput } from '../contact/contact.store';
import {
  mapRowToDonationImport,
  collectDonationImportBag,
  parseDonationTypeFromCell,
  parsePaymentMethodFromCell
} from './core/import-row-donation';
import { mapCombinedRowToActions } from './core/import-row-combined';
import {
  analyzeContactImportDataset,
  assessContactImportRowSkipReason,
  buildContactImportBag,
  contactsImportMappingReady,
  ContactImportParseOptions,
  FullNameOrder,
  needsCombinedNameOrderChoice
} from './core/import-contact-validation';
import { ImportStepTrailComponent } from './components/import-step-trail/import-step-trail.component';
import {
  IgnoredLinesPopupComponent
} from './components/ignored-lines/ignored-lines-popup.component';
import type { IgnoredImportLine } from './core/model/ignored-import-line.model';
import { PopupShellComponent } from '../../layout/popup/popup-shell.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { ContactStoreService } from '../contact/contact.store';
import { DonationStoreService } from '../donation/donation.store';
import { contactDisplayName } from '../../core/models/contact.model';
import { DashboardNotificationStore } from '../../core/notification/dashboard-notification.store';
import { ImportBusinessRulesTooltipComponent } from './components/import-business-rules-tooltip/import-business-rules-tooltip.component';
import { InlineLoaderComponent } from '../../layout/inline-loader/inline-loader.component';
import { TagStoreService } from '../account/tag.store';
import { OrganizationLinkingStore } from '../account/organization-linking.store';
import {
  contactLinkingImportHint,
  ImportManualLinkAssignment,
  isManualLinkingReady,
  planPostImportLinkUpdates,
  shouldRunPostImportLinking
} from './core/import-contact-linking';
import {
  applyTagRenameMap,
  buildImportTagMappingDrafts,
  buildTagRenameMap,
  collectUniqueTagValuesFromRows,
  findTagsColumnIndex,
  ImportTagMappingDraft
} from './core/import-tags';
import {
  chunkArray,
  computeImportProgressPercent,
  IMPORT_CONTACT_CHUNK_SIZE,
  PreparedContactImportRow,
  splitPreparedContactChunk
} from './core/import-chunking';
import {
  ImportTagsPopupComponent,
  ImportTagsPopupStep
} from './components/import-tags-popup/import-tags-popup.component';

type PendingImportDonation = {
  contactId?: string;
  contactInput?: NewContactInput;
  amount: number;
  date: Date;
  paymentMethod: DonationPaymentMethod | null;
  donationType: DonationType;
};

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
    ImportStepTrailComponent,
    IgnoredLinesPopupComponent,
    ImportTagsPopupComponent,
    PopupShellComponent,
    FormSelectComponent,
    ImportBusinessRulesTooltipComponent,
    InlineLoaderComponent
  ],
  templateUrl: './import.page.html',
  styleUrls: ['./import.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPageComponent implements OnInit {
  protected readonly importFlow = inject(ImportFlowService);
  private readonly toast = inject(ToastService);
  private readonly contactStore = inject(ContactStoreService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly tagStore = inject(TagStoreService);
  private readonly linkingStore = inject(OrganizationLinkingStore);
  private readonly dashboardNotificationStore = inject(DashboardNotificationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly importMode = signal<ImportMode>('default');

  protected readonly onboardingStep = signal<ImportOnboardingStep>('type');

  protected readonly topbarSubtitle = computed(() => {
    switch (this.importMode()) {
      case 'contacts':
        return 'Déposez votre fichier pour relier chaque colonne aux fiches profils';
      case 'donations':
        return 'Importez montants et dates ; chaque ligne est reliée à un profil (lien fait avec l\'email)';
      case 'combined':
        return 'Un fichier où chaque ligne peut contenir le contact et le don sur la même ligne';
      default:
        return '';
    }
  });

  protected readonly topbarTitle = computed(() => {
    switch (this.importMode()) {
      case 'contacts':
        return 'Import de profils';
      case 'donations':
        return 'Import de contributions';
      case 'combined':
        return 'Import de profils et contributions';
      default:
        return 'Import de données';
    }
  });

  protected readonly fileName = signal<string | null>(null);
  protected readonly sheetName = signal<string | null>(null);
  protected readonly excelSheetNames = signal<string[]>([]);
  private currentFile: File | null = null;
  protected readonly rowCount = signal(0);
  protected readonly headers = signal<string[]>([]);
  protected readonly bindings = signal<string[]>([]);
  protected readonly sampleRows = signal<string[][]>([]);
  protected readonly allRows = signal<string[][]>([]);

  protected readonly ignoredPopupOpen = signal(false);
  protected readonly ignoredLines = signal<IgnoredImportLine[]>([]);
  private ignoredAfterSuccess: (() => void) | null = null;

  protected readonly donationsImportPromptOpen = signal(false);
  protected readonly importing = signal(false);
  protected readonly importProgressPercent = signal(0);
  protected readonly tagsPopupOpen = signal(false);
  protected readonly tagsPopupBusy = signal(false);
  protected readonly tagsPopupStep = signal<ImportTagsPopupStep>('create');
  protected readonly tagDrafts = signal<ImportTagMappingDraft[]>([]);
  protected readonly tagsColumnLabel = signal('Tag');
  private readonly tagRenameMap = signal<Record<string, string>>({});
  private readonly tagPalette = ['#5b6cff', '#e85d75', '#2a9d8f', '#e9c46a', '#9b5de5', '#00b4d8'];

  protected readonly fullNameOrder = signal<FullNameOrder>('firstname-lastname');
  protected readonly linkingColumnIndex = signal<number | null>(null);
  protected readonly manualLinkAssignments = signal<Record<number, ImportManualLinkAssignment>>({});

  protected readonly fullNameOrderOptions: FormSelectOption[] = [
    { value: 'firstname-lastname', label: 'Prénom puis nom (ex. Jean Dupont)' },
    { value: 'lastname-firstname', label: 'Nom puis prénom (ex. Dupont Jean)' }
  ];

  protected readonly linkingRoleOptions: FormSelectOption[] = [
    { value: 'independent', label: 'Indépendant' },
    { value: 'parent', label: 'Profil principal' },
    { value: 'child', label: 'Profil lié' }
  ];

  protected readonly contactLinkingMode = computed(() => this.linkingStore.mode());
  protected readonly showContactLinkingSetup = computed(
    () =>
      (this.importMode() === 'contacts' || this.importMode() === 'combined') &&
      this.linkingStore.isLinkingEnabled()
  );
  protected readonly contactLinkingHint = computed(() =>
    contactLinkingImportHint(this.contactLinkingMode())
  );
  protected readonly linkingColumnOptions = computed((): FormSelectOption[] => {
    const h = this.headers();
    return h.map((header, index) => ({
      value: String(index),
      label: header?.trim() ? header : `(Colonne ${index + 1})`
    }));
  });
  protected readonly manualParentOptions = computed((): FormSelectOption[] => {
    const assignments = this.manualLinkAssignments();
    const rows = this.allRows();
    const opts: FormSelectOption[] = [{ value: '', label: 'Choisir le profil principal' }];
    for (let i = 0; i < rows.length; i++) {
      if (assignments[i]?.role !== 'parent') continue;
      opts.push({ value: String(i), label: this.manualRowLabel(i) });
    }
    return opts;
  });
  protected readonly manualLinkRows = computed(() =>
    this.allRows().map((_, index) => ({
      index,
      label: this.manualRowLabel(index),
      assignment: this.manualLinkAssignments()[index] ?? { role: 'independent' as const }
    }))
  );

  protected readonly showSheetSelector = computed(() => this.excelSheetNames().length > 1);

  protected readonly sheetSelectOptions = computed((): FormSelectOption[] =>
    this.excelSheetNames().map((name) => ({ value: name, label: name }))
  );

  protected readonly contactImportOptions = computed(
    (): ContactImportParseOptions => ({
      fullNameOrder: this.fullNameOrder()
    })
  );

  protected readonly previewRows = computed(() => {
    if (this.importMode() !== 'contacts') {
      return [];
    }
    const rows = this.sampleRows();
    const b = this.bindings();
    const options = this.contactImportOptions();
    return rows.map((r) => mapDataRowToPreview(r, b as ImportFieldKey[], options));
  });

  protected readonly combinedPreviewRows = computed(() => {
    if (this.importMode() !== 'combined') {
      return [];
    }
    const rows = this.sampleRows();
    const b = this.bindings();
    const options = this.contactImportOptions();
    return rows.map((r) => mapDataRowToCombinedPreview(r, b as CombinedImportFieldKey[], options));
  });

  protected readonly donationPreviewRows = computed(() => {
    if (this.importMode() !== 'donations') {
      return [];
    }
    const rows = this.sampleRows();
    const b = this.bindings() as DonationImportFieldKey[];
    return rows.map((r) => {
      const bag = collectDonationImportBag(r, b);
      const email = (bag.contactEmail ?? '').trim();
      const contact = email ? this.contactStore.findContactByLink(email) : undefined;
      const contactName = contact ? contactDisplayName(contact) : '-';
      return {
        date: bag.donationDate ?? '-',
        amount: bag.donationAmount ?? '-',
        contactEmail: email || '-',
        contactName
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

  protected readonly mappedFieldRows = computed(() => {
    const b = this.bindings();
    const order = this.orderedFieldKeysForMode();
    const active = new Set(b.filter((x) => x !== 'skip'));
    const rows: { fieldKey: string; columnIndex: number }[] = [];
    for (const fieldKey of order) {
      if (!active.has(fieldKey)) {
        continue;
      }
      const columnIndex = b.findIndex((x) => x === fieldKey);
      if (columnIndex >= 0) {
        rows.push({ fieldKey, columnIndex });
      }
    }
    if (this.importMode() === 'contacts' || this.importMode() === 'combined') {
      if (!rows.some((r) => r.fieldKey === 'tags')) {
        rows.push({
          fieldKey: 'tags',
          columnIndex: b.findIndex((x) => x === 'tags')
        });
      }
    }
    if (this.importMode() === 'donations') {
      const required: DonationImportFieldKey[] = ['donationDate', 'donationAmount', 'contactEmail'];
      for (const rk of required) {
        if (rows.some((r) => r.fieldKey === rk)) {
          continue;
        }
        const columnIndex = b.findIndex((x) => x === rk);
        rows.push({ fieldKey: rk, columnIndex });
      }
      rows.sort((a, b) => {
        const pri = (k: string) => required.indexOf(k as DonationImportFieldKey);
        const pa = pri(a.fieldKey);
        const pb = pri(b.fieldKey);
        if (pa >= 0 && pb >= 0) {
          return pa - pb;
        }
        if (pa >= 0) {
          return -1;
        }
        if (pb >= 0) {
          return 1;
        }
        return 0;
      });
    }
    return rows;
  });

  protected readonly ignoredColumnsList = computed(() => {
    const h = this.headers();
    const b = this.bindings();
    const out: { index: number; header: string }[] = [];
    for (let i = 0; i < h.length; i++) {
      if (b[i] === 'skip') {
        out.push({
          index: i,
          header: h[i]?.trim() ? h[i] : `(Colonne ${i + 1})`
        });
      }
    }
    return out;
  });

  protected readonly fileColumnSelectOptions = computed((): FormSelectOption[] => {
    const h = this.headers();
    const opts: FormSelectOption[] = [{ value: '', label: '- Aucune colonne -' }];
    for (let i = 0; i < h.length; i++) {
      const label = h[i]?.trim() ? h[i] : `(Colonne ${i + 1})`;
      opts.push({ value: String(i), label });
    }
    return opts;
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
      b.includes('donationDate') && b.includes('donationAmount') && b.includes('contactEmail')
    );
  });

  protected readonly contactsMappingComplete = computed(() => {
    if (this.importMode() !== 'contacts' && this.importMode() !== 'combined') {
      return true;
    }
    return contactsImportMappingReady(this.bindings() as ImportFieldKey[]);
  });

  protected readonly contactDatasetAnalysis = computed(() => {
    if (this.importMode() !== 'contacts' && this.importMode() !== 'combined') {
      return null;
    }
    if (!this.allRows().length) {
      return null;
    }
    return analyzeContactImportDataset(
      this.headers(),
      this.bindings() as ImportFieldKey[],
      this.allRows(),
      this.contactImportOptions()
    );
  });

  protected readonly showFullNameOrderChoice = computed(() => {
    if (this.importMode() !== 'contacts' && this.importMode() !== 'combined') {
      return false;
    }
    return needsCombinedNameOrderChoice(
      this.bindings() as ImportFieldKey[],
      this.contactDatasetAnalysis()?.issues ?? []
    );
  });

  protected readonly datasetBlockingIssues = computed(() =>
    (this.contactDatasetAnalysis()?.issues ?? []).filter((issue) => issue.severity === 'error')
  );

  protected readonly datasetWarningIssues = computed(() =>
    (this.contactDatasetAnalysis()?.issues ?? []).filter((issue) => issue.severity === 'warning')
  );

  protected labelForMappedField(key: string): string {
    return (
      IMPORT_FIELD_OPTIONS.find((o) => o.key === key)?.label ??
      DONATION_IMPORT_FIELD_OPTIONS.find((o) => o.key === key)?.label ??
      COMBINED_IMPORT_OPTIONS.find((o) => o.key === key)?.label ??
      key
    );
  }

  protected readonly importButtonDisabled = computed(() => {
    if (this.importing()) {
      return true;
    }
    if (this.duplicateFieldSummaries().length > 0) {
      return true;
    }
    if (this.datasetBlockingIssues().length > 0) {
      return true;
    }
    const hasAnyMappedField = this.bindings().some((b) => b !== 'skip');
    if (!hasAnyMappedField) {
      return true;
    }
    if (!this.contactsMappingComplete()) {
      return true;
    }
    if (!this.donationsMappingComplete()) {
      return true;
    }
    if (!this.fileName() || this.rowCount() === 0) {
      return true;
    }
    if (this.showContactLinkingSetup() && this.contactLinkingMode() === 'same_id') {
      if (this.linkingColumnIndex() == null) {
        return true;
      }
    }
    if (this.showContactLinkingSetup() && this.contactLinkingMode() === 'manual') {
      const indexes = this.allRows().map((_, index) => index);
      if (!isManualLinkingReady(indexes, this.manualLinkAssignments())) {
        return true;
      }
    }
    return false;
  });

  protected readonly importButtonTitle = computed(() => {
    if (this.duplicateFieldSummaries().length > 0) {
      return 'Corrigez les doublons dans le champ Kalon pour continuer';
    }
    if (this.datasetBlockingIssues().length > 0) {
      return 'Corrigez les colonnes vides ou le mapping avant d’importer';
    }
    const hasAnyMappedField = this.bindings().some((b) => b !== 'skip');
    if (!hasAnyMappedField) {
      return 'Associez au moins une colonne du fichier à un champ Kalon pour continuer';
    }
    if (!this.contactsMappingComplete()) {
      return 'Reliez au minimum une identité : prénom et/ou nom (ou nom complet), ou la raison sociale';
    }
    if (!this.donationsMappingComplete()) {
      return 'Mappez au moins une colonne pour la date, le montant et le lien avec Kalon (email ou nom/prénom du profil)';
    }
    if (this.showContactLinkingSetup() && this.contactLinkingMode() === 'same_id') {
      if (this.linkingColumnIndex() == null) {
        return 'Choisissez la colonne d’identifiant pour lier les profils';
      }
    }
    if (this.showContactLinkingSetup() && this.contactLinkingMode() === 'manual') {
      const indexes = this.allRows().map((_, index) => index);
      if (!isManualLinkingReady(indexes, this.manualLinkAssignments())) {
        return 'Vérifiez les rôles parent / lié avant d’importer';
      }
    }
    return '';
  });

  ngOnInit(): void {
    this.tagStore.ensureLoaded();
    this.linkingStore.ensureLoaded();
    const qp = this.route.snapshot.queryParamMap.get('mode');
    if (qp === 'contacts' || qp === 'donations' || qp === 'combined') {
      this.importMode.set(qp);
    }
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      const m = p.get('mode');
      if (m === 'contacts' || m === 'donations' || m === 'combined') {
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

  protected onExcelSheetChange(sheetName: string): void {
    if (!sheetName || !this.currentFile) {
      return;
    }
    void this.loadFile(this.currentFile, sheetName);
  }

  protected onKalonFieldColumnChange(fieldKey: string, value: string): void {
    const headers = this.headers();
    let next = [...this.bindings()];
    for (let i = 0; i < next.length; i++) {
      if (next[i] === fieldKey) {
        next[i] = 'skip';
      }
    }
    if (value !== '') {
      const idx = Number(value);
      if (!Number.isNaN(idx) && idx >= 0 && idx < headers.length) {
        next[idx] = fieldKey;
      }
    }
    next = this.normalizeBindingsOneColumnPerField(next);
    this.bindings.set(next);
  }

  protected reapplyGuess(): void {
    const headers = this.headers();
    const mode = this.importMode();
    let raw: string[];
    if (mode === 'contacts') {
      raw = guessMappingForHeaders(headers);
    } else if (mode === 'donations') {
      raw = guessDonationMappingForHeaders(headers) as unknown as string[];
    } else {
      raw = guessCombinedMappingForHeaders(headers) as unknown as string[];
    }
    this.bindings.set(this.normalizeBindingsOneColumnPerField(raw));
  }

  private orderedFieldKeysForMode(): string[] {
    switch (this.importMode()) {
      case 'contacts':
        return IMPORT_FIELD_OPTIONS.filter((o) => o.key !== 'skip').map((o) => o.key);
      case 'donations':
        return DONATION_IMPORT_FIELD_OPTIONS.filter((o) => o.key !== 'skip').map((o) => o.key);
      case 'combined':
        return COMBINED_IMPORT_OPTIONS.filter((o) => o.key !== 'skip').map((o) => o.key);
      default:
        return [];
    }
  }

  private normalizeBindingsOneColumnPerField(bindings: string[]): string[] {
    const next = [...bindings];
    const keys = new Set(next.filter((b) => b !== 'skip'));
    for (const key of keys) {
      const indices: number[] = [];
      next.forEach((b, i) => {
        if (b === key) {
          indices.push(i);
        }
      });
      if (indices.length <= 1) {
        continue;
      }
      const keep = Math.max(...indices);
      for (const i of indices) {
        if (i !== keep) {
          next[i] = 'skip';
        }
      }
    }
    return next;
  }

  protected onIgnoredPopupDismiss(): void {
    this.ignoredPopupOpen.set(false);
    this.ignoredAfterSuccess = null;
  }

  protected onIgnoredPopupContinue(editedLines: IgnoredImportLine[]): void {
    const mode = this.importMode();
    const rows = this.allRows();
    const b = this.bindings();
    const next = this.ignoredAfterSuccess;
    this.ignoredPopupOpen.set(false);
    this.ignoredAfterSuccess = null;

    const finish = (stillIgnored: IgnoredImportLine[], importedCount: number) => {
      if (importedCount > 0) {
        this.toast.show(`${importedCount} ligne(s) corrigée(s) importée(s).`, 'success', 3500);
        this.dashboardNotificationStore.refresh();
      }
      if (stillIgnored.length > 0) {
        this.toast.show(`${stillIgnored.length} ligne(s) encore ignorée(s).`, 'info', 3500);
      }
      next?.();
    };

    this.importFlow.setParsing(true);
    const request$ =
      mode === 'contacts'
        ? this.importIgnoredContacts(editedLines, rows, b as ImportFieldKey[])
        : mode === 'donations'
          ? this.importIgnoredDonations(editedLines, rows, b as DonationImportFieldKey[])
          : this.importIgnoredCombined(editedLines, rows, b as CombinedImportFieldKey[]);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importFlow.setParsing(false))
      )
      .subscribe({
        next: (res) => finish(res.stillIgnored, res.importedCount),
        error: () => {
          this.toast.show("L'import des lignes corrigées a échoué. Réessayez.", 'alert', 5000);
          next?.();
        }
      });
  }

  protected onDonationsImportPromptYes(): void {
    this.donationsImportPromptOpen.set(false);
    this.importMode.set('donations');
    this.clearAndRestart('file');
  }

  protected onDonationsImportPromptNo(): void {
    this.donationsImportPromptOpen.set(false);
    void this.router.navigate(['/']);
  }

  private openDonationsImportPrompt(): void {
    this.donationsImportPromptOpen.set(true);
  }

  private openIgnoredLinesPopup(ignoredLines: IgnoredImportLine[], next: (() => void) | null): void {
    if (!ignoredLines.length) {
      next?.();
      return;
    }
    this.ignoredLines.set(ignoredLines);
    this.ignoredPopupOpen.set(true);
    this.ignoredAfterSuccess = next;
  }

  private importIgnoredContacts(
    editedLines: IgnoredImportLine[],
    rows: string[][],
    bindings: ImportFieldKey[]
  ) {
    const stillIgnored: IgnoredImportLine[] = [];
    const prepared: PreparedContactImportRow[] = [];

    for (const line of editedLines) {
      const rowIndex = line.rowNumber - 1;
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }

      const overrides = this.buildContactOverridesFromIgnoredLine(line);
      const parsed = this.parseContactImportRow(rowIndex, row, bindings, overrides);
      if (!parsed.input) {
        stillIgnored.push({
          ...line,
          ...(parsed.ignored ?? {}),
          rowNumber: line.rowNumber,
          reason: parsed.ignored?.reason ?? line.reason
        });
        continue;
      }

      const existing = this.contactStore.findExistingContactForImport(parsed.input);
      prepared.push({
        index: rowIndex,
        input: parsed.input,
        existingId: existing?.id
      });
    }

    return this.persistPreparedContactChunks(prepared).pipe(
      map(({ created, updated }) => ({
        stillIgnored,
        importedCount: created + updated
      }))
    );
  }

  private importIgnoredDonations(
    editedLines: IgnoredImportLine[],
    rows: string[][],
    bindings: DonationImportFieldKey[]
  ) {
    const stillIgnored: IgnoredImportLine[] = [];
    const donations: PendingImportDonation[] = [];

    for (const line of editedLines) {
      const rowIndex = line.rowNumber - 1;
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }

      const bag = collectDonationImportBag(row, bindings);

      const overrideEmail = line.email?.trim();
      const overrideAmount = line.donationAmount;
      const overrideDate = line.donationDate;

      if (overrideEmail) {
        bag.contactEmail = overrideEmail;
      }
      if (overrideAmount !== undefined) {
        bag.donationAmount = overrideAmount;
      }
      if (overrideDate !== undefined) {
        bag.donationDate = overrideDate;
      }

      const contactEmail = (bag.contactEmail ?? '').trim();
      const donationAmountStr = (bag.donationAmount ?? '').trim();
      const donationDateStr = (bag.donationDate ?? '').trim();
      const donationTypeRaw = (bag.donationType ?? '').trim();
      const donationPaymentMethodRaw = (bag.paymentMethod ?? '').trim();

      const donationType = donationTypeRaw ? parseDonationTypeFromCell(donationTypeRaw) : ('financial' as const);

      const amountRaw = donationAmountStr ? parseAmountFromCell(donationAmountStr) : null;
      const date = donationDateStr ? parseDateFromCell(donationDateStr) : null;
      const paymentMethod = donationPaymentMethodRaw ? parsePaymentMethodFromCell(donationPaymentMethodRaw) : null;

      if (!contactEmail) {
        stillIgnored.push({
          ...line,
          email: contactEmail || undefined,
          reason: 'Email du profil manquant'
        });
        continue;
      }

      if (!date || (donationType === 'financial' && (amountRaw === null || amountRaw <= 0))) {
        const reason = !date
          ? 'Date invalide'
          : 'Montant invalide (doit être > 0)';

        stillIgnored.push({
          ...line,
          email: contactEmail,
          donationAmount: donationAmountStr || undefined,
          donationDate: donationDateStr || undefined,
          reason
        });
        continue;
      }

      const contact = this.contactStore.findContactByLink(contactEmail);
      if (!contact) {
        stillIgnored.push({
          ...line,
          email: contactEmail,
          reason: 'Email du profil introuvable dans Kalon'
        });
        continue;
      }

      const amount = donationType === 'financial' ? (amountRaw as number) : (amountRaw && amountRaw > 0 ? amountRaw : 0);
      donations.push({
        contactId: contact.id,
        amount,
        date,
        paymentMethod,
        donationType
      });
    }

    return this.persistDonationsBulk(donations).pipe(
      map((createdCount) => ({
        stillIgnored,
        importedCount: createdCount
      }))
    );
  }

  private importIgnoredCombined(
    editedLines: IgnoredImportLine[],
    rows: string[][],
    bindings: CombinedImportFieldKey[]
  ) {
    const stillIgnored: IgnoredImportLine[] = [];
    const prepared: PreparedContactImportRow[] = [];
    const pendingDonations: PendingImportDonation[] = [];

    const contactBindings = bindings.map((b) =>
      b === 'donationDate' || b === 'donationAmount' || b === 'donationType' || b === 'paymentMethod'
        ? ('skip' as ImportFieldKey)
        : (b as ImportFieldKey)
    );

    for (const line of editedLines) {
      const rowIndex = line.rowNumber - 1;
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }

      const overrides = this.buildContactOverridesFromIgnoredLine(line);
      const parsed = this.parseContactImportRow(rowIndex, row, contactBindings, overrides);
      if (!parsed.input) {
        stillIgnored.push({
          ...line,
          ...(parsed.ignored ?? {}),
          rowNumber: line.rowNumber,
          reason: parsed.ignored?.reason ?? line.reason
        });
        continue;
      }

      const existing = this.contactStore.findExistingContactForImport(parsed.input);
      prepared.push({
        index: rowIndex,
        input: parsed.input,
        existingId: existing?.id
      });

      let donationDateStr = '';
      let donationAmountStr = '';
      let donationTypeStr = '';
      let donationPaymentMethodStr = '';
      const len = Math.min(row.length, bindings.length);
      for (let i = 0; i < len; i++) {
        if (bindings[i] === 'donationDate') {
          donationDateStr = String(row[i] ?? '').trim();
        }
        if (bindings[i] === 'donationAmount') {
          donationAmountStr = String(row[i] ?? '').trim();
        }
        if (bindings[i] === 'donationType') {
          donationTypeStr = String(row[i] ?? '').trim();
        }
        if (bindings[i] === 'paymentMethod') {
          donationPaymentMethodStr = String(row[i] ?? '').trim();
        }
      }

      if (line.donationDate !== undefined) {
        donationDateStr = line.donationDate.trim();
      }
      if (line.donationAmount !== undefined) {
        donationAmountStr = line.donationAmount.trim();
      }

      const donationType = donationTypeStr ? parseDonationTypeFromCell(donationTypeStr) : ('financial' as const);
      const amountRaw = donationAmountStr ? parseAmountFromCell(donationAmountStr) : null;
      const date = donationDateStr ? parseDateFromCell(donationDateStr) : null;
      const paymentMethod = donationPaymentMethodStr ? parsePaymentMethodFromCell(donationPaymentMethodStr) : null;

      if (date && donationType === 'financial' && amountRaw !== null && amountRaw > 0) {
        pendingDonations.push({
          contactId: existing?.id,
          contactInput: parsed.input,
          amount: amountRaw,
          date,
          paymentMethod,
          donationType
        });
      } else if (date && donationType !== 'financial') {
        pendingDonations.push({
          contactId: existing?.id,
          contactInput: parsed.input,
          amount: amountRaw && amountRaw > 0 ? amountRaw : 0,
          date,
          paymentMethod,
          donationType
        });
      }
    }

    return this.persistPreparedContactChunks(prepared).pipe(
      switchMap(({ created, updated }) =>
        this.persistDonationsBulk(pendingDonations).pipe(
          map(() => ({
            stillIgnored,
            importedCount: created + updated
          }))
        )
      )
    );
  }

  protected clearAndRestart(nextStep: ImportOnboardingStep = 'type'): void {
    this.fileName.set(null);
    this.sheetName.set(null);
    this.excelSheetNames.set([]);
    this.currentFile = null;
    this.rowCount.set(0);
    this.headers.set([]);
    this.bindings.set([]);
    this.sampleRows.set([]);
    this.allRows.set([]);
    this.fullNameOrder.set('firstname-lastname');
    this.linkingColumnIndex.set(null);
    this.manualLinkAssignments.set({});
    this.tagsPopupOpen.set(false);
    this.tagsPopupBusy.set(false);
    this.tagsPopupStep.set('create');
    this.tagDrafts.set([]);
    this.tagRenameMap.set({});
    this.importing.set(false);
    this.importProgressPercent.set(0);
    this.onboardingStep.set(nextStep);
  }

  protected onLinkingColumnChange(value: string): void {
    const parsed = Number(value);
    this.linkingColumnIndex.set(Number.isFinite(parsed) ? parsed : null);
  }

  protected onManualLinkRoleChange(rowIndex: number, role: string): void {
    const normalized =
      role === 'parent' || role === 'child' || role === 'independent' ? role : 'independent';
    this.manualLinkAssignments.update((current) => {
      const next = { ...current };
      const previous = next[rowIndex] ?? { role: 'independent' as const };
      next[rowIndex] = {
        role: normalized,
        parentRowIndex: normalized === 'child' ? previous.parentRowIndex ?? null : null
      };
      if (normalized !== 'parent') {
        for (const [key, assignment] of Object.entries(next)) {
          if (assignment.role === 'child' && Number(assignment.parentRowIndex) === rowIndex) {
            next[Number(key)] = { role: 'independent' };
          }
        }
      }
      return next;
    });
  }

  protected onManualLinkParentChange(rowIndex: number, parentValue: string): void {
    const parentRowIndex = parentValue === '' ? null : Number(parentValue);
    this.manualLinkAssignments.update((current) => ({
      ...current,
      [rowIndex]: {
        role: 'child',
        parentRowIndex: Number.isFinite(parentRowIndex as number) ? parentRowIndex : null
      }
    }));
  }

  private manualRowLabel(index: number): string {
    const row = this.allRows()[index] ?? [];
    const bindings = this.bindings();
    const pick = (keys: string[]) => {
      for (const key of keys) {
        const col = bindings.findIndex((b) => b === key);
        if (col >= 0 && String(row[col] ?? '').trim()) {
          return String(row[col]).trim();
        }
      }
      return '';
    };
    const name =
      pick(['fullName']) ||
      [pick(['firstname', 'contactFirstname']), pick(['lastname', 'contactLastname', 'enterpriseName'])]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      pick(['email']) ||
      `Ligne ${index + 1}`;
    return `L.${index + 1} · ${name}`;
  }

  isImportInProgress(): boolean {
    return this.importing();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.importing()) {
      return;
    }
    event.preventDefault();
    event.returnValue = true;
  }

  protected importToKalon(): void {
    if (this.importButtonDisabled()) {
      return;
    }
    if (this.openTagsPrepPopupIfNeeded()) {
      return;
    }
    this.executeImport();
  }

  protected onTagsPopupDismiss(): void {
    if (this.tagsPopupBusy()) {
      return;
    }
    this.tagsPopupOpen.set(false);
    this.tagsPopupStep.set('create');
    this.tagDrafts.set([]);
  }

  protected onTagsPopupPrimary(drafts: ImportTagMappingDraft[]): void {
    if (this.tagsPopupStep() === 'create') {
      this.createTagsFromDrafts(drafts);
      return;
    }
    this.tagRenameMap.set(buildTagRenameMap(drafts));
    this.tagsPopupOpen.set(false);
    this.executeImport();
  }

  private openTagsPrepPopupIfNeeded(): boolean {
    if (this.importMode() === 'donations') {
      return false;
    }
    const columnIndex = findTagsColumnIndex(this.bindings());
    if (columnIndex < 0) {
      this.tagRenameMap.set({});
      return false;
    }
    const values = collectUniqueTagValuesFromRows(this.allRows(), columnIndex);
    if (!values.length) {
      this.tagRenameMap.set({});
      return false;
    }
    this.tagDrafts.set(
      buildImportTagMappingDrafts(values, (name) => this.tagStore.findByName(name)?.name)
    );
    this.tagsColumnLabel.set(this.headers()[columnIndex]?.trim() || 'Tag');
    this.tagsPopupStep.set('create');
    this.tagsPopupBusy.set(false);
    this.tagsPopupOpen.set(true);
    return true;
  }

  private createTagsFromDrafts(drafts: ImportTagMappingDraft[]): void {
    const normalized = drafts.map((draft) => ({
      ...draft,
      kalonName: draft.kalonName.trim() || draft.sourceValue.trim()
    }));
    const toCreate: string[] = [];
    const seen = new Set<string>();
    for (const draft of normalized) {
      const name = draft.kalonName;
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!this.tagStore.findByName(name)) {
        toCreate.push(name);
      }
    }

    if (!toCreate.length) {
      this.tagDrafts.set(
        normalized.map((draft) => ({
          ...draft,
          alreadyExists: Boolean(this.tagStore.findByName(draft.kalonName))
        }))
      );
      this.tagsPopupStep.set('import');
      return;
    }

    this.tagsPopupBusy.set(true);
    from(toCreate)
      .pipe(
        concatMap((name, index) =>
          this.tagStore.createTag(name, this.tagPalette[index % this.tagPalette.length])
        ),
        toArray(),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tagsPopupBusy.set(false))
      )
      .subscribe({
        next: () => {
          this.tagDrafts.set(
            normalized.map((draft) => ({
              ...draft,
              alreadyExists: Boolean(this.tagStore.findByName(draft.kalonName))
            }))
          );
          this.tagsPopupStep.set('import');
          this.toast.show(
            `${toCreate.length} tag${toCreate.length > 1 ? 's' : ''} créé${toCreate.length > 1 ? 's' : ''}.`,
            'success',
            3500
          );
        },
        error: () =>
          this.toast.show('Impossible de créer les tags. Réessayez.', 'alert', 5000)
      });
  }

  private executeImport(): void {
    const mode = this.importMode();
    const rows = this.allRows();
    const b = this.bindings();
    this.beginImportProgress();
    const request$ =
      mode === 'contacts'
        ? this.importContacts(rows, b as ImportFieldKey[])
        : mode === 'donations'
          ? this.importDonationsOnly(rows, b as DonationImportFieldKey[])
          : this.importCombined(rows, b as CombinedImportFieldKey[]);
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishImportProgress())
      )
      .subscribe({
        error: () => this.toast.show("L'import a échoué. Réessayez dans un instant.", 'alert', 5000)
      });
  }

  private beginImportProgress(): void {
    this.importing.set(true);
    this.importProgressPercent.set(0);
  }

  private setImportProgress(processed: number, total: number): void {
    this.importProgressPercent.set(computeImportProgressPercent(processed, total));
  }

  private finishImportProgress(): void {
    this.importProgressPercent.set(100);
    window.setTimeout(() => {
      this.importing.set(false);
      this.importProgressPercent.set(0);
    }, 220);
  }

  private buildContactOverridesFromIgnoredLine(
    line: IgnoredImportLine
  ): Partial<Record<ImportFieldKey, string>> {
    const overrides: Partial<Record<ImportFieldKey, string>> = {};
    const contactKind =
      line.contactKind ??
      (line.enterpriseName?.trim() || line.siret?.trim() ? 'company' : 'individual');

    const overrideEmail = line.email?.trim();
    if (overrideEmail) {
      overrides.email = overrideEmail;
    }

    if (contactKind === 'company') {
      const overrideEnterpriseName = line.enterpriseName?.trim();
      const overrideSiret = line.siret?.trim();
      if (overrideEnterpriseName) {
        overrides.enterpriseName = overrideEnterpriseName;
      }
      if (overrideSiret) {
        overrides.siret = overrideSiret;
      }
      const overrideContactFirstname = line.firstname?.trim();
      const overrideContactLastname = line.lastname?.trim();
      if (overrideContactFirstname) {
        overrides.contactFirstname = overrideContactFirstname;
      }
      if (overrideContactLastname) {
        overrides.contactLastname = overrideContactLastname;
      }
    } else {
      const overrideFirstname = line.firstname?.trim();
      const overrideLastname = line.lastname?.trim();
      if (overrideFirstname) {
        overrides.firstname = overrideFirstname;
      }
      if (overrideLastname) {
        overrides.lastname = overrideLastname;
      }
    }

    return overrides;
  }

  private resolveImportTagIds = (tagNames: string[]): string[] => {
    const renamed = applyTagRenameMap(tagNames, this.tagRenameMap());
    const ids: string[] = [];
    for (const name of renamed) {
      const tag = this.tagStore.findByName(name);
      if (tag && !ids.includes(tag.id)) {
        ids.push(tag.id);
      }
    }
    return ids;
  };

  private parseContactImportRow(
    index: number,
    row: string[],
    bindings: ImportFieldKey[],
    overrides?: Partial<Record<ImportFieldKey, string>>
  ): { input: NewContactInput | null; ignored: IgnoredImportLine | null } {
    const options = this.contactImportOptions();
    const bag = buildContactImportBag(row, bindings, overrides, options);
    const skipReason = assessContactImportRowSkipReason(bag, options);
    const input = mapRowToNewContactInput(
      row,
      bindings,
      overrides,
      options,
      this.resolveImportTagIds
    );
    if (input) {
      return { input, ignored: null };
    }
    const enterpriseName = String(bag.enterpriseName ?? '').trim();
    const siret = String(bag.siret ?? '').trim();
    const intendedKind = enterpriseName || siret ? 'company' : 'individual';
    const firstname =
      intendedKind === 'company'
        ? String(bag.contactFirstname ?? '').trim()
        : String(bag.firstname ?? '').trim();
    const lastname =
      intendedKind === 'company'
        ? String(bag.contactLastname ?? '').trim()
        : String(bag.lastname ?? '').trim();
    return {
      input: null,
      ignored: {
        rowNumber: index + 1,
        contactKind: intendedKind,
        reason: skipReason ?? 'Ligne invalide',
        email: String(bag.email ?? '').trim() || undefined,
        enterpriseName: intendedKind === 'company' ? enterpriseName || undefined : undefined,
        siret: intendedKind === 'company' ? siret || undefined : undefined,
        firstname: firstname || undefined,
        lastname: lastname || undefined
      }
    };
  }

  private importContacts(rows: string[][], bindings: ImportFieldKey[]) {
    let skipped = 0;
    const ignored: IgnoredImportLine[] = [];
    const prepared: PreparedContactImportRow[] = [];

    for (const [index, row] of rows.entries()) {
      const parsed = this.parseContactImportRow(index, row, bindings);
      if (!parsed.input) {
        skipped++;
        if (parsed.ignored) {
          ignored.push(parsed.ignored);
        }
        continue;
      }
      const existing = this.contactStore.findExistingContactForImport(parsed.input);
      prepared.push({
        index,
        input: parsed.input,
        existingId: existing?.id
      });
    }

    return this.persistPreparedContactChunks(prepared).pipe(
      map(({ created, updated }) => {
        if (created === 0 && updated === 0) {
          this.toast.show(
            'Aucun profil importé : chaque particulier doit avoir un prénom et un nom ; chaque entreprise une raison sociale.',
            'alert',
            6500
          );
          this.openIgnoredLinesPopup(ignored, null);
          return;
        }
        const addedPart = created > 0 ? `${created} profil(s) ajouté(s)` : '';
        const updatedPart = updated > 0 ? `${updated} profil(s) mis à jour` : '';
        const counts = [addedPart, updatedPart].filter(Boolean).join(' - ');
        this.toast.show(
          `${counts}${skipped > 0 ? ` - ${skipped} ligne(s) ignorée(s)` : ''}.`,
          'success',
          5000
        );
        this.dashboardNotificationStore.refresh();
        this.openIgnoredLinesPopup(ignored, () => this.openDonationsImportPrompt());
      }),
      catchError(() => {
        this.toast.show("L'import des profils a échoué. Réessayez.", 'alert', 5000);
        return of(undefined);
      })
    );
  }

  private importDonationsOnly(rows: string[][], bindings: DonationImportFieldKey[]) {
    let skipped = 0;
    const ignored: IgnoredImportLine[] = [];
    let missingContact = 0;
    const donations: PendingImportDonation[] = [];

    for (const [index, row] of rows.entries()) {
      const bag = collectDonationImportBag(row, bindings);
      const contactEmail = (bag.contactEmail ?? '').trim();
      const donationAmountRaw = (bag.donationAmount ?? '').trim();
      const donationDateRaw = (bag.donationDate ?? '').trim();
      const donationTypeRaw = (bag.donationType ?? '').trim();
      const donationType = donationTypeRaw ? parseDonationTypeFromCell(donationTypeRaw) : ('financial' as const);
      const amount = donationAmountRaw ? parseAmountFromCell(donationAmountRaw) : null;
      const date = donationDateRaw ? parseDateFromCell(donationDateRaw) : null;

      const reason =
        !contactEmail
          ? 'Email du profil manquant'
          : !date
            ? 'Date invalide'
            : donationType === 'financial' && (amount === null || amount <= 0)
              ? 'Montant invalide (doit être > 0)'
              : 'Ligne invalide';

      const parsed = mapRowToDonationImport(row, bindings);
      if (!parsed) {
        skipped++;
        ignored.push({
          rowNumber: index + 1,
          reason,
          email: contactEmail || undefined,
          donationAmount: donationAmountRaw || undefined,
          donationDate: donationDateRaw || undefined
        });
        continue;
      }
      const contact = this.contactStore.findContactByLink(parsed.contactEmail);
      if (!contact) {
        missingContact++;
        skipped++;
        ignored.push({
          rowNumber: index + 1,
          reason: 'Email du profil introuvable dans Kalon',
          email: parsed.contactEmail
        });
        continue;
      }
      donations.push({
        contactId: contact.id,
        amount: parsed.amount,
        date: parsed.date,
        paymentMethod: parsed.paymentMethod,
        donationType: parsed.donationType
      });
    }

    this.setImportProgress(0, donations.length || 1);
    return this.persistDonationsBulk(donations).pipe(
      map((created) => {
        this.setImportProgress(donations.length, donations.length || 1);
        if (created === 0) {
          this.toast.show(
            `Aucun don importé. Vérifiez les montants, les dates et que l’email correspond à un profil existant${
              missingContact > 0 ? ` (${missingContact} email(s) introuvable(s))` : ''
            }.`,
            'alert',
            7500
          );
          this.openIgnoredLinesPopup(ignored, null);
          return;
        }
        this.toast.show(
          `${created} don(s) enregistré(s)${skipped > 0 ? ` - ${skipped} ligne(s) ignorée(s)` : ''}.`,
          'success',
          5000
        );
        this.dashboardNotificationStore.refresh();
        this.openIgnoredLinesPopup(ignored, () => void this.router.navigate(['/profils']));
      }),
      catchError(() => {
        this.toast.show("L'import des dons a échoué. Réessayez.", 'alert', 5000);
        return of(undefined);
      })
    );
  }

  private importCombined(rows: string[][], bindings: CombinedImportFieldKey[]) {
    let skipped = 0;
    const ignored: IgnoredImportLine[] = [];
    const prepared: PreparedContactImportRow[] = [];
    const pendingDonations: PendingImportDonation[] = [];

    const contactBindings = bindings.map((b) =>
      b === 'donationDate' || b === 'donationAmount' || b === 'donationType' || b === 'paymentMethod'
        ? ('skip' as ImportFieldKey)
        : (b as ImportFieldKey)
    );

    for (const [index, row] of rows.entries()) {
      const options = this.contactImportOptions();
      const { contactInput, donation } = mapCombinedRowToActions(
        row,
        bindings,
        options,
        this.resolveImportTagIds
      );
      if (!contactInput) {
        skipped++;
        const parsed = this.parseContactImportRow(index, row, contactBindings);
        if (parsed.ignored) {
          ignored.push(parsed.ignored);
        }
        continue;
      }
      const existing = this.contactStore.findExistingContactForImport(contactInput);
      prepared.push({
        index,
        input: contactInput,
        existingId: existing?.id
      });
      if (donation) {
        pendingDonations.push({
          contactId: existing?.id,
          contactInput,
          amount: donation.amount,
          date: donation.date,
          paymentMethod: donation.paymentMethod,
          donationType: donation.donationType
        });
      }
    }

    return this.persistPreparedContactChunks(prepared).pipe(
      switchMap(({ created, updated }) =>
        this.persistDonationsBulk(pendingDonations).pipe(
          map((donationsCreated) => ({ created, updated, donationsCreated }))
        )
      ),
      map(({ created, updated, donationsCreated }) => {
        if (created === 0 && updated === 0) {
          this.toast.show(
            'Aucune ligne importée : chaque particulier doit avoir un prénom et un nom ; chaque entreprise une raison sociale.',
            'alert',
            6500
          );
          this.openIgnoredLinesPopup(ignored, null);
          return;
        }
        const createdPart =
          created > 0 ? `${created} ${created === 1 ? 'profil' : 'profils'} créé${created === 1 ? '' : 's'}` : '';
        const updatedPart =
          updated > 0
            ? `${updated} ${updated === 1 ? 'profil' : 'profils'} mis à jour${updated === 1 ? '' : 's'}`
            : '';
        const contactsPart = [createdPart, updatedPart].filter(Boolean).join(' - ');
        this.toast.show(
          `${contactsPart}${
            donationsCreated > 0
              ? `, ${donationsCreated} ${donationsCreated === 1 ? 'contribution' : 'contributions'} associé${
                  donationsCreated === 1 ? '' : 's'
                }`
              : ''
          }${skipped > 0 ? ` - ${skipped} ${skipped === 1 ? 'ligne' : 'lignes'} ignorée${skipped === 1 ? '' : 's'}` : ''}.`,
          'success',
          5500
        );
        this.dashboardNotificationStore.refresh();
        this.openIgnoredLinesPopup(ignored, () => void this.router.navigate(['/profils']));
      }),
      catchError(() => {
        this.toast.show("L'import combiné a échoué. Réessayez.", 'alert', 5000);
        return of(undefined);
      })
    );
  }

  private persistPreparedContactChunks(prepared: PreparedContactImportRow[]) {
    if (!prepared.length) {
      this.setImportProgress(0, 0);
      return of({ created: 0, updated: 0 });
    }

    const chunks = chunkArray(prepared, IMPORT_CONTACT_CHUNK_SIZE);
    const total = prepared.length;
    let processed = 0;
    let cumulativeEntries: Array<{ index: number; input: NewContactInput }> = [];
    this.setImportProgress(0, total);

    return from(chunks).pipe(
      concatMap((chunk) => {
        const split = splitPreparedContactChunk(chunk);
        cumulativeEntries = cumulativeEntries.concat(split.entries);
        const linkingEntries = [...cumulativeEntries];
        const childIndexes = split.childIndexSet;
        return this.persistContactsBulk(split.creates, split.updates).pipe(
          switchMap((result) =>
            this.applyImportLinking(linkingEntries, childIndexes).pipe(map(() => result))
          ),
          map((result) => {
            processed += chunk.length;
            this.setImportProgress(processed, total);
            return result;
          })
        );
      }),
      reduce(
        (acc, result) => ({
          created: acc.created + result.created,
          updated: acc.updated + result.updated
        }),
        { created: 0, updated: 0 }
      )
    );
  }

  private applyImportLinking(
    importedEntries: Array<{ index: number; input: NewContactInput }>,
    onlyChildIndexes?: Set<number>
  ) {
    const mode = this.contactLinkingMode();
    if (!shouldRunPostImportLinking(mode) || !this.showContactLinkingSetup()) {
      return of(0);
    }

    const plans = planPostImportLinkUpdates({
      mode,
      importedEntries,
      rows: this.allRows(),
      linkingColumnIndex: this.linkingColumnIndex(),
      manualAssignments: this.manualLinkAssignments(),
      resolveContactId: (input) => this.contactStore.findExistingContactForImport(input)?.id,
      onlyChildIndexes
    });

    if (!plans.length) {
      return of(0);
    }

    const linkUpdates = plans.map((plan) => ({
      id: plan.childContactId,
      input: { ...plan.childInput, mainContactId: plan.parentContactId }
    }));

    return this.contactStore.updateContactsSequential(linkUpdates);
  }

  private persistContactsBulk(
    creates: NewContactInput[],
    updates: Array<{ id: string; input: NewContactInput }>
  ) {
    return this.contactStore.updateContactsSequential(updates).pipe(
      switchMap((updated) =>
        this.contactStore.createContactsBulk(creates).pipe(
          map((created) => ({
            created: created.createdCount,
            updated
          }))
        )
      )
    );
  }

  private persistDonationsBulk(pending: PendingImportDonation[]) {
    if (!pending.length) {
      return of(0);
    }
    const items = pending
      .map((item) => {
        const contactId =
          item.contactId ??
          (item.contactInput
            ? this.contactStore.findExistingContactForImport(item.contactInput)?.id
            : undefined);
        if (!contactId) {
          return null;
        }
        return {
          contactId,
          amount: item.amount,
          date: item.date,
          paymentMethod: item.paymentMethod,
          donationType: item.donationType
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    return this.donationStore.createDonationsBulk(items).pipe(map((res) => res.createdCount));
  }

  private async loadFile(file: File, preferredSheetName?: string): Promise<void> {
    this.importFlow.setParsing(true);
    this.currentFile = file;
    try {
      const parsed = await parseImportFile(file, preferredSheetName ?? this.sheetName() ?? undefined);
      if (!parsed.headers.length) {
        this.toast.show(
          parsed.sheetNames && parsed.sheetNames.length > 1
            ? 'Aucune colonne détectée sur cette feuille. Essayez une autre feuille Excel.'
            : 'Aucune colonne détectée dans ce fichier.',
          'alert'
        );
        this.allRows.set([]);
        return;
      }
      this.fileName.set(file.name);
      this.excelSheetNames.set(parsed.sheetNames ?? []);
      this.sheetName.set(parsed.sheetName ?? null);
      this.rowCount.set(parsed.rows.length);
      this.headers.set(parsed.headers);
      const mode = this.importMode();
      let raw: string[];
      if (mode === 'contacts') {
        raw = guessMappingForHeaders(parsed.headers);
      } else if (mode === 'donations') {
        raw = guessDonationMappingForHeaders(parsed.headers) as unknown as string[];
      } else {
        raw = guessCombinedMappingForHeaders(parsed.headers) as unknown as string[];
      }
      this.bindings.set(this.normalizeBindingsOneColumnPerField(raw));
      this.allRows.set(parsed.rows);
      this.sampleRows.set(parsed.rows.slice(0, 8));
      this.linkingColumnIndex.set(parsed.headers.length ? 0 : null);
      this.manualLinkAssignments.set({});
    } catch {
      this.toast.show('Impossible de lire ce fichier. Vérifiez le format (CSV ou Excel).', 'alert');
    } finally {
      this.importFlow.setParsing(false);
    }
  }
}
