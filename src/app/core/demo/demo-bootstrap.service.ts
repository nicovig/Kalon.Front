import { Injectable, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { isDemoMode } from './demo-mode';
import { ContactStoreService } from '../../features/contact/contact.store';
import { DonationStoreService } from '../../features/donation/donation.store';
import { ContactSettingsStore } from '../../features/contact/settings/contact-settings.store';
import { OrganizationCustomContentStore } from '../../features/account/organization-custom-content.store';
import { OrganizationDocumentsStore } from '../../features/archives/organization-documents.store';
import { DashboardNotificationStore } from '../notification/dashboard-notification.store';

@Injectable({ providedIn: 'root' })
export class DemoBootstrapService {
  private readonly auth = inject(AuthService);
  private readonly contactStore = inject(ContactStoreService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);
  private readonly customContent = inject(OrganizationCustomContentStore);
  private readonly documents = inject(OrganizationDocumentsStore);
  private readonly notifications = inject(DashboardNotificationStore);

  init(): Promise<void> {
    if (!isDemoMode()) {
      return Promise.resolve();
    }
    this.auth.ensureDemoSession();
    return new Promise((resolve) => {
      forkJoin([
        this.contactStore.loadContactsFromApi(),
        this.donationStore.loadDonationsFromApi(),
        this.contactSettings.loadFromApi()
      ]).subscribe({
        next: () => {
          this.customContent.ensureLoaded();
          this.documents.load();
          this.notifications.refresh();
          resolve();
        },
        error: () => {
          this.customContent.ensureLoaded();
          this.documents.load();
          this.notifications.refresh();
          resolve();
        }
      });
    });
  }
}
