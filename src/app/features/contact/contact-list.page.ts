import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { TableComponent, TableColumn, TableRowAction } from '../../layout/table/table.component';
import { IContact } from '../../core/models/contact.model';
import { ContactCreateLauncherComponent } from './contact-create-launcher.component';
import { EmptyContactsWelcomeComponent } from './empty-contacts-welcome/empty-contacts-welcome.component';
import { ImportBannerComponent } from '../import/components/import-banner/import-banner.component';
import { ContactDonationsPopupComponent } from './popup/contact-donations/contact-donations-popup.component';
import { ContactEditPopupComponent } from './popup/edit-contact/edit-contact-popup.component';
import { ContactStoreService } from './contact.store';
import { ContactSettingsComponent } from './settings/contact-settings.component';
import { ContactSettingsStore } from './settings/contact-settings.store';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { FormNumberComponent } from '../../layout/forms/number/form-number.component';

@Component({
  selector: 'contact-page',
  standalone: true,
  templateUrl: './contact-list.page.html',
  styleUrls: ['./contact-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ToastComponent,
    FormsModule,
    TopbarComponent,
    TableComponent,
    FormTextComponent,
    FormSelectComponent,
    FormNumberComponent,
    ContactCreateLauncherComponent,
    EmptyContactsWelcomeComponent,
    ContactEditPopupComponent,
    ContactDonationsPopupComponent,
    ImportBannerComponent,
    ContactSettingsComponent
  ]
})
export class ContactListPageComponent {
  private readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);
  protected readonly filterName = signal('');
  protected readonly filterKind = signal('all');
  protected readonly filterEmail = signal('');
  protected readonly filterPhone = signal('');
  protected readonly filterStatus = signal('all');
  protected readonly filterTotalDonationMin = signal('');
  protected readonly filterTotalDonationMax = signal('');

  private readonly contactsWithStatus = computed(() => {
    const now = new Date();
    return this.contactStore.contacts().map((d) => ({
      ...d,
      status: this.contactSettings.statusOf(d, now)
    }));
  });
  protected readonly contactsComputed = computed(() => {
    const name = this.filterName().trim().toLowerCase();
    const kind = this.filterKind();
    const email = this.filterEmail().trim().toLowerCase();
    const phone = this.filterPhone().trim().toLowerCase();
    const status = this.filterStatus();
    const min = this.parseOptionalNumber(this.filterTotalDonationMin());
    const max = this.parseOptionalNumber(this.filterTotalDonationMax());
    return this.contactsWithStatus().filter((row) => {
      const fullName = `${row.lastname ?? ''} ${row.firstname ?? ''}`.trim().toLowerCase();
      if (name && !fullName.includes(name)) return false;
      if (kind !== 'all' && row.kind !== kind) return false;
      if (email && !String(row.email ?? '').toLowerCase().includes(email)) return false;
      const phoneValue = String(row.phone ?? row.enterprise?.contactPhone ?? '').toLowerCase();
      if (phone && !phoneValue.includes(phone)) return false;
      if (status !== 'all' && row.status !== status) return false;
      const total = Number(row.totalDonation ?? 0);
      if (min != null && total < min) return false;
      if (max != null && total > max) return false;
      return true;
    });
  });

  protected readonly kindFilterOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous les types' },
    { value: 'donor', label: 'Donateur' },
    { value: 'member', label: 'Membre' },
    { value: 'helper', label: 'Bénévole' },
    { value: 'company', label: 'Entreprise' }
  ];

  protected readonly statusFilterOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'to_remind', label: 'À relancer' },
    { value: 'new', label: 'Nouveau' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'out', label: 'Sorti' }
  ];

  protected readonly contactToEdit = signal<IContact | null>(null);

  protected readonly contactToViewDonations = signal<IContact | null>(null);

  protected onEditContact(row: unknown): void {
    this.contactToEdit.set(row as IContact);
  }

  protected closeEditContact(): void {
    this.contactToEdit.set(null);
  }

  protected onViewDonations(row: unknown): void {
    this.contactToViewDonations.set(row as IContact);
  }

  protected onContactRowAction(event: { actionId: string; row: unknown }): void {
    if (event.actionId === 'edit') {
      this.onEditContact(event.row);
      return;
    }
    if (event.actionId === 'donations') {
      this.onViewDonations(event.row);
    }
  }

  protected closeViewDonations(): void {
    this.contactToViewDonations.set(null);
  }

  protected readonly contactColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true, sortable: true },
    { key: 'lastname', header: 'Nom', searchable: true, sortable: true },
    { key: 'kind', header: 'Type', type: 'contactKind', searchable: true, sortable: true },
    { key: 'email', header: 'Email', searchable: true, sortable: true },
    { key: 'phone', header: 'Téléphone', searchable: true, sortable: true },
    { key: 'status', header: 'Statut', type: 'badge', sortable: true },
    { key: 'totalDonation', header: 'Total contributions', type: 'number', align: 'right', sortable: true }
  ];
  protected readonly contactRowActions: TableRowAction[] = [
    { id: 'edit', label: '✏️', type: 'ghost' },
    { id: 'donations', label: '💰', type: 'ghost' }
  ];

  protected onFilterNameChange(value: string): void {
    this.filterName.set(String(value ?? ''));
  }

  protected onFilterKindChange(value: string): void {
    this.filterKind.set(value ?? 'all');
  }

  protected onFilterEmailChange(value: string): void {
    this.filterEmail.set(String(value ?? ''));
  }

  protected onFilterPhoneChange(value: string): void {
    this.filterPhone.set(String(value ?? ''));
  }

  protected onFilterStatusChange(value: string): void {
    this.filterStatus.set(value ?? 'all');
  }

  protected onFilterTotalDonationMinChange(value: string): void {
    this.filterTotalDonationMin.set(String(value ?? ''));
  }

  protected onFilterTotalDonationMaxChange(value: string): void {
    this.filterTotalDonationMax.set(String(value ?? ''));
  }

  private parseOptionalNumber(value: string): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
}

