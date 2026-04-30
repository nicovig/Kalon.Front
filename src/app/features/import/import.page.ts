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
  collectImportFieldBag,
  mapDataRowToCombinedPreview,
  mapDataRowToPreview
} from './core/import-map-preview';
import { ImportFieldKey } from './core/model/import-field.model';
import { parseAmountFromCell, parseDateFromCell } from './core/import-parse-cells';
import { parseImportFile } from './core/import-file-parse';
import { mapRowToNewContactInput } from './core/import-row-to-contact';
import {
  mapRowToDonationImport,
  collectDonationImportBag,
  parseDonationTypeFromCell,
  parsePaymentMethodFromCell
} from './core/import-row-donation';
import { mapCombinedRowToActions } from './core/import-row-combined';
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
    PopupShellComponent,
    FormSelectComponent
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
        return 'Import de dons';
      case 'combined':
        return 'Import de profils et dons';
      default:
        return 'Import de données';
    }
  });

  protected readonly fileName = signal<string | null>(null);
  protected readonly sheetName = signal<string | null>(null);
  protected readonly rowCount = signal(0);
  protected readonly headers = signal<string[]>([]);
  protected readonly bindings = signal<string[]>([]);
  protected readonly sampleRows = signal<string[][]>([]);
  protected readonly allRows = signal<string[][]>([]);

  protected readonly ignoredPopupOpen = signal(false);
  protected readonly ignoredLines = signal<IgnoredImportLine[]>([]);
  private ignoredAfterSuccess: (() => void) | null = null;

  protected readonly donationsImportPromptOpen = signal(false);

  protected readonly previewRows = computed(() => {
    if (this.importMode() !== 'contacts') {
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
      const email = (bag.contactEmail ?? '').trim();
      const contact = email ? this.contactStore.findContactByLink(email) : undefined;
      const contactName = contact ? contactDisplayName(contact) : '—';
      return {
        date: bag.donationDate ?? '—',
        amount: bag.donationAmount ?? '—',
        contactEmail: email || '—',
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
    const opts: FormSelectOption[] = [{ value: '', label: '— Aucune colonne —' }];
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

  protected labelForMappedField(key: string): string {
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
    const hasAnyMappedField = this.bindings().some((b) => b !== 'skip');
    if (!hasAnyMappedField) {
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
    const hasAnyMappedField = this.bindings().some((b) => b !== 'skip');
    if (!hasAnyMappedField) {
      return 'Associez au moins une colonne du fichier à un champ Kalon pour continuer';
    }
    if (!this.donationsMappingComplete()) {
      return 'Mappez au moins une colonne pour la date, le montant et le lien avec Kalon (email ou nom/prénom du profil)';
    }
    return '';
  });

  ngOnInit(): void {
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

    let stillIgnored: IgnoredImportLine[] = [];
    let importedCount = 0;

    if (mode === 'contacts') {
      const res = this.importIgnoredContacts(editedLines, rows, b as ImportFieldKey[]);
      stillIgnored = res.stillIgnored;
      importedCount = res.importedCount;
    } else if (mode === 'donations') {
      const res = this.importIgnoredDonations(editedLines, rows, b as DonationImportFieldKey[]);
      stillIgnored = res.stillIgnored;
      importedCount = res.importedCount;
    } else {
      const res = this.importIgnoredCombined(editedLines, rows, b as CombinedImportFieldKey[]);
      stillIgnored = res.stillIgnored;
      importedCount = res.importedCount;
    }

    if (importedCount > 0) {
      this.toast.show(`${importedCount} ligne(s) corrigée(s) importée(s).`, 'success', 3500);
      this.dashboardNotificationStore.refresh();
    }

    const next = this.ignoredAfterSuccess;
    this.ignoredPopupOpen.set(false);
    this.ignoredAfterSuccess = null;

    if (stillIgnored.length > 0) {
      this.toast.show(`${stillIgnored.length} ligne(s) encore ignorée(s).`, 'info', 3500);
    }

    next?.();
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
  ): { stillIgnored: IgnoredImportLine[]; importedCount: number } {
    const stillIgnored: IgnoredImportLine[] = [];
    let importedCount = 0;

    for (const line of editedLines) {
      const rowIndex = line.rowNumber - 1;
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }

      const bag = collectImportFieldBag(row, bindings);

      const contactKind = line.contactKind ?? (((bag.enterpriseName ?? '').trim() || (bag.siret ?? '').trim()) ? 'company' : 'individual');

      const overrides: Partial<Record<ImportFieldKey, string>> = {};
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

      const input = mapRowToNewContactInput(row, bindings, overrides);
      if (!input) {
        const email = (overrides.email ?? (bag.email ?? '')).trim();

        const enterpriseName = (overrides.enterpriseName ?? (bag.enterpriseName ?? '')).trim();
        const siret = (overrides.siret ?? (bag.siret ?? '')).trim();

        const intendedKind = enterpriseName || siret ? 'company' : 'individual';

        const firstname =
          intendedKind === 'company'
            ? (overrides.contactFirstname ?? bag.contactFirstname ?? '').trim()
            : (overrides.firstname ?? bag.firstname ?? '').trim();
        const lastname =
          intendedKind === 'company'
            ? (overrides.contactLastname ?? bag.contactLastname ?? '').trim()
            : (overrides.lastname ?? bag.lastname ?? '').trim();

        const reason = !email
          ? 'Email manquant'
          : intendedKind === 'company'
            ? !enterpriseName
              ? 'Nom entreprise manquant'
              : !siret
                ? 'SIRET manquant'
                : !firstname && !lastname
                  ? 'Nom ou prénom contact manquant'
                  : 'Ligne invalide'
            : !firstname && !lastname
              ? 'Nom ou prénom manquant'
              : 'Ligne invalide';

        stillIgnored.push({
          ...line,
          contactKind: intendedKind,
          email: email || undefined,
          enterpriseName: intendedKind === 'company' ? enterpriseName || undefined : undefined,
          siret: intendedKind === 'company' ? siret || undefined : undefined,
          firstname: firstname || undefined,
          lastname: lastname || undefined,
          reason
        });
        continue;
      }

      const existing = this.contactStore.findContactByEmail(input.email);
      if (existing) {
        this.contactStore.updateContact(existing.id, input) ?? this.contactStore.createContact(input);
      } else {
        this.contactStore.createContact(input);
      }

      importedCount++;
    }

    return { stillIgnored, importedCount };
  }

  private importIgnoredDonations(
    editedLines: IgnoredImportLine[],
    rows: string[][],
    bindings: DonationImportFieldKey[]
  ): { stillIgnored: IgnoredImportLine[]; importedCount: number } {
    const stillIgnored: IgnoredImportLine[] = [];
    let importedCount = 0;

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
      this.donationStore.addDonationForContact(contact, amount, date, paymentMethod, donationType);
      importedCount++;
    }

    return { stillIgnored, importedCount };
  }

  private importIgnoredCombined(
    editedLines: IgnoredImportLine[],
    rows: string[][],
    bindings: CombinedImportFieldKey[]
  ): { stillIgnored: IgnoredImportLine[]; importedCount: number } {
    const stillIgnored: IgnoredImportLine[] = [];
    let importedCount = 0;

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

      const bag = collectImportFieldBag(row, contactBindings);
      const contactKind =
        line.contactKind ??
        ((((bag.enterpriseName ?? '').trim() || (bag.siret ?? '').trim()) ? 'company' : 'individual') as
          | 'company'
          | 'individual');

      const overrides: Partial<Record<ImportFieldKey, string>> = {};

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

      const contactInput = mapRowToNewContactInput(row, contactBindings, overrides);
      if (!contactInput) {
        const email = (overrides.email ?? (bag.email ?? '')).trim();
        const enterpriseName = (overrides.enterpriseName ?? (bag.enterpriseName ?? '')).trim();
        const siret = (overrides.siret ?? (bag.siret ?? '')).trim();
        const intendedKind = enterpriseName || siret ? 'company' : 'individual';

        const firstname =
          intendedKind === 'company'
            ? (overrides.contactFirstname ?? bag.contactFirstname ?? '').trim()
            : (overrides.firstname ?? bag.firstname ?? '').trim();
        const lastname =
          intendedKind === 'company'
            ? (overrides.contactLastname ?? bag.contactLastname ?? '').trim()
            : (overrides.lastname ?? bag.lastname ?? '').trim();

        const reason = !email
          ? 'Email manquant'
          : intendedKind === 'company'
            ? !enterpriseName
              ? 'Nom entreprise manquant'
              : !siret
                ? 'SIRET manquant'
                : !firstname && !lastname
                  ? 'Nom ou prénom contact manquant'
                  : 'Ligne invalide'
            : !firstname && !lastname
              ? 'Nom ou prénom manquant'
              : 'Ligne invalide';

        stillIgnored.push({
          ...line,
          contactKind: intendedKind,
          email: email || undefined,
          enterpriseName: intendedKind === 'company' ? enterpriseName || undefined : undefined,
          siret: intendedKind === 'company' ? siret || undefined : undefined,
          firstname: firstname || undefined,
          lastname: lastname || undefined,
          reason
        });
        continue;
      }

      const existing = this.contactStore.findContactByEmail(contactInput.email);
      const contact = existing
        ? this.contactStore.updateContact(existing.id, contactInput) ?? this.contactStore.createContact(contactInput)
        : this.contactStore.createContact(contactInput);

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
        this.donationStore.addDonationForContact(contact, amountRaw, date, paymentMethod, donationType);
      }

      if (date && donationType !== 'financial') {
        const amount = amountRaw && amountRaw > 0 ? amountRaw : 0;
        this.donationStore.addDonationForContact(contact, amount, date, paymentMethod, donationType);
      }

      importedCount++;
    }

    return { stillIgnored, importedCount };
  }

  protected clearAndRestart(nextStep: ImportOnboardingStep = 'type'): void {
    this.fileName.set(null);
    this.sheetName.set(null);
    this.rowCount.set(0);
    this.headers.set([]);
    this.bindings.set([]);
    this.sampleRows.set([]);
    this.allRows.set([]);
    this.onboardingStep.set(nextStep);
  }

  protected importToKalon(): void {
    if (this.importButtonDisabled()) {
      return;
    }
    const mode = this.importMode();
    const rows = this.allRows();
    const b = this.bindings();
    if (mode === 'contacts') {
      this.importContacts(rows, b as ImportFieldKey[]);
      return;
    }
    if (mode === 'donations') {
      this.importDonationsOnly(rows, b as DonationImportFieldKey[]);
      return;
    }
    this.importCombined(rows, b as CombinedImportFieldKey[]);
  }

  private importContacts(rows: string[][], bindings: ImportFieldKey[]): void {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const ignored: IgnoredImportLine[] = [];
    for (const [index, row] of rows.entries()) {
      const bag = collectImportFieldBag(row, bindings);
      const email = (bag.email ?? '').trim();
      const enterpriseName = (bag.enterpriseName ?? '').trim();
      const siret = (bag.siret ?? '').trim();

      const intendedKind = enterpriseName || siret ? 'company' : 'individual';

      const firstname =
        intendedKind === 'company'
          ? (bag.contactFirstname ?? '').trim()
          : (bag.firstname ?? '').trim();
      const lastname =
        intendedKind === 'company'
          ? (bag.contactLastname ?? '').trim()
          : (bag.lastname ?? '').trim();

      const reason = !email
        ? 'Email manquant'
        : intendedKind === 'company'
          ? !enterpriseName
            ? 'Nom entreprise manquant'
            : !siret
              ? 'SIRET manquant'
              : !firstname && !lastname
                ? 'Nom ou prénom contact manquant'
                : 'Ligne invalide'
          : !firstname && !lastname
            ? 'Nom ou prénom manquant'
            : 'Ligne invalide';

      const input = mapRowToNewContactInput(row, bindings);
      if (!input) {
        skipped++;
        ignored.push({
          rowNumber: index + 1,
          contactKind: intendedKind,
          reason,
          email: email || undefined,
          enterpriseName: intendedKind === 'company' ? (enterpriseName || undefined) : undefined,
          siret: intendedKind === 'company' ? (siret || undefined) : undefined,
          firstname,
          lastname
        });
        continue;
      }
      const existing = this.contactStore.findContactByEmail(input.email);
      if (existing) {
        const updatedContact = this.contactStore.updateContact(existing.id, input);
        if (updatedContact) {
          updated++;
        } else {
          this.contactStore.createContact(input);
          created++;
        }
      } else {
        this.contactStore.createContact(input);
        created++;
      }
    }
    if (created === 0 && updated === 0) {
      this.toast.show(
        'Aucun profil importé : chaque ligne doit avoir au moins un email et un nom ou un prénom.',
        'alert',
        6500
      );
      this.openIgnoredLinesPopup(ignored, null);
      return;
    }
    const addedPart = created > 0 ? `${created} profil(s) ajouté(s)` : '';
    const updatedPart = updated > 0 ? `${updated} profil(s) mis à jour` : '';
    const counts = [addedPart, updatedPart].filter(Boolean).join(' — ');
    this.toast.show(
      `${counts}${skipped > 0 ? ` — ${skipped} ligne(s) ignorée(s)` : ''}.`,
      'success',
      5000
    );
    this.dashboardNotificationStore.refresh();
    this.openIgnoredLinesPopup(
      ignored,
      () => this.openDonationsImportPrompt()
    );
  }

  private importDonationsOnly(rows: string[][], bindings: DonationImportFieldKey[]): void {
    let created = 0;
    let skipped = 0;
    const ignored: IgnoredImportLine[] = [];
    let missingContact = 0;
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
      this.donationStore.addDonationForContact(
        contact,
        parsed.amount,
        parsed.date,
        parsed.paymentMethod,
        parsed.donationType
      );
      created++;
    }
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
      `${created} don(s) enregistré(s)${skipped > 0 ? ` — ${skipped} ligne(s) ignorée(s)` : ''}.`,
      'success',
      5000
    );
    this.dashboardNotificationStore.refresh();
    this.openIgnoredLinesPopup(ignored, () => void this.router.navigate(['/profils']));
  }

  private importCombined(rows: string[][], bindings: CombinedImportFieldKey[]): void {
    let contactsCreated = 0;
    let contactsUpdated = 0;
    let donationsCreated = 0;
    let skipped = 0;
    const ignored: IgnoredImportLine[] = [];

    const contactBindings = bindings.map((b) =>
      b === 'donationDate' || b === 'donationAmount' || b === 'donationType' || b === 'paymentMethod'
        ? ('skip' as ImportFieldKey)
        : (b as ImportFieldKey)
    );

    for (const [index, row] of rows.entries()) {
      const bag = collectImportFieldBag(row, contactBindings);
      const email = (bag.email ?? '').trim();
      const enterpriseName = (bag.enterpriseName ?? '').trim();
      const siret = (bag.siret ?? '').trim();
      const intendedKind = enterpriseName || siret ? 'company' : 'individual';

      const firstname =
        intendedKind === 'company'
          ? (bag.contactFirstname ?? '').trim()
          : (bag.firstname ?? '').trim();
      const lastname =
        intendedKind === 'company'
          ? (bag.contactLastname ?? '').trim()
          : (bag.lastname ?? '').trim();

      const reason = !email
        ? 'Email manquant'
        : intendedKind === 'company'
          ? !enterpriseName
            ? 'Nom entreprise manquant'
            : !siret
              ? 'SIRET manquant'
              : !firstname && !lastname
                ? 'Nom ou prénom contact manquant'
                : 'Ligne invalide'
          : !firstname && !lastname
            ? 'Nom ou prénom manquant'
            : 'Ligne invalide';

      const { contactInput, donation } = mapCombinedRowToActions(row, bindings);
      if (!contactInput) {
        skipped++;
        ignored.push({
          rowNumber: index + 1,
          contactKind: intendedKind,
          reason,
          email: email || undefined,
          enterpriseName: intendedKind === 'company' ? (enterpriseName || undefined) : undefined,
          siret: intendedKind === 'company' ? (siret || undefined) : undefined,
          firstname,
          lastname
        });
        continue;
      }
      const existing = this.contactStore.findContactByEmail(contactInput.email);
      const contact = existing
        ? this.contactStore.updateContact(existing.id, contactInput) ?? this.contactStore.createContact(contactInput)
        : this.contactStore.createContact(contactInput);
      if (existing) {
        contactsUpdated++;
      } else {
        contactsCreated++;
      }
      if (donation) {
        this.donationStore.addDonationForContact(
          contact,
          donation.amount,
          donation.date,
          donation.paymentMethod,
          donation.donationType
        );
        donationsCreated++;
      }
    }
    if (contactsCreated === 0 && contactsUpdated === 0) {
      this.toast.show(
        'Aucune ligne importée : chaque ligne doit avoir au moins un email et un nom ou un prénom.',
        'alert',
        6500
      );
      this.openIgnoredLinesPopup(ignored, null);
      return;
    }
    const createdPart = contactsCreated > 0 ? `${contactsCreated} ${contactsCreated === 1 ? 'profil' : 'profils'} créé${contactsCreated === 1 ? '' : 's'}` : '';
    const updatedPart = contactsUpdated > 0 ? `${contactsUpdated} ${contactsUpdated === 1 ? 'profil' : 'profils'} mis à jour${contactsUpdated === 1 ? '' : 's'}` : '';
    const contactsPart = [createdPart, updatedPart].filter(Boolean).join(' — ');
    this.toast.show(
      `${contactsPart}${
        donationsCreated > 0 ? `, ${donationsCreated} ${donationsCreated === 1 ? 'don' : 'dons'} associé${donationsCreated === 1 ? '' : 's'}` : ''
      }${skipped > 0 ? ` — ${skipped} ${skipped === 1 ? 'ligne' : 'lignes'} ignorée${skipped === 1 ? '' : 's'}` : ''}.`,
      'success',
      5500
    );
    this.dashboardNotificationStore.refresh();
    this.openIgnoredLinesPopup(
      ignored,
      () => void this.router.navigate(['/profils'])
    );
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
    } catch {
      this.toast.show('Impossible de lire ce fichier. Vérifiez le format (CSV ou Excel).', 'alert');
    } finally {
      this.importFlow.setParsing(false);
    }
  }
}
