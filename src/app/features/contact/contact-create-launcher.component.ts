import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ToastService } from '../../layout/toast/toast.service';
import { contactDisplayName, IContact } from '../../core/models/contact.model';
import { AddDonationPopupComponent } from './popup/add-donation/add-donation-popup.component';
import { ContactCreatePopupComponent } from './popup/create-contact/create-contact-popup.component';

@Component({
  selector: 'contact-create-launcher',
  standalone: true,
  imports: [ButtonLabelComponent, ContactCreatePopupComponent, AddDonationPopupComponent],
  templateUrl: './contact-create-launcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactCreateLauncherComponent {
  private readonly toast = inject(ToastService);

  protected readonly contactModalOpen = signal(false);
  protected readonly donationFollowUpOpen = signal(false);
  protected readonly createdContact = signal<IContact | null>(null);

  protected openContactModal(): void {
    this.contactModalOpen.set(true);
  }

  protected onContactPopupClosed(): void {
    this.contactModalOpen.set(false);
  }

  protected onContactCreated(contact: IContact): void {
    this.createdContact.set(contact);
    this.toast.show(`Profil ${contactDisplayName(contact)} créé.`, 'success', 4500);
    this.donationFollowUpOpen.set(true);
  }

  protected onDonationFollowUpClosed(): void {
    this.donationFollowUpOpen.set(false);
    this.createdContact.set(null);
  }
}
