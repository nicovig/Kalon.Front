import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { TableComponent, TableColumn } from '../../layout/table/table.component';
import { IContact } from '../../core/models/contact.model';
import { ContactCreateLauncherComponent } from './contact-create-launcher.component';
import { EmptyContactsWelcomeComponent } from './empty-contacts-welcome/empty-contacts-welcome.component';
import { ImportBannerComponent } from '../import/components/import-banner/import-banner.component';
import { ContactDonationsPopupComponent } from './popup/contact-donations/contact-donations-popup.component';
import { ContactEditPopupComponent } from './popup/edit-contact/edit-contact-popup.component';
import { ContactStoreService } from './contact.store';
import { ContactSettingsComponent } from './settings/contact-settings.component';
import { ContactSettingsStore } from './settings/contact-settings.store';

@Component({
  selector: 'contact-page',
  standalone: true,
  templateUrl: './contact-list.page.html',
  styleUrls: ['./contact-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToastComponent,
    TopbarComponent,
    TableComponent,
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

  protected readonly contactsComputed = computed(() => {
    const now = new Date();
    return this.contactStore.contacts().map((d) => ({
      ...d,
      status: this.contactSettings.statusOf(d, now)
    }));
  });

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

  protected closeViewDonations(): void {
    this.contactToViewDonations.set(null);
  }

  protected readonly contactColumns: TableColumn[] = [
    { key: 'firstname', header: 'Prénom', searchable: true },
    { key: 'lastname', header: 'Nom', searchable: true },
    { key: 'kind', header: 'Type', type: 'contactKind', searchable: true },
    { key: 'email', header: 'Email', searchable: true },
    { key: 'phone', header: 'Téléphone', searchable: true },
    { key: 'status', header: 'Statut', type: 'badge' },
    { key: 'totalDonation', header: 'Total dons', type: 'number', align: 'right' }
  ];
}

