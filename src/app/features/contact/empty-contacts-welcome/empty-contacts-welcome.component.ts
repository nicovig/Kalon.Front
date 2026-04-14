import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { ContactCreatePopupComponent } from '../popup/create-contact/create-contact-popup.component';
import { AddDonationPopupComponent } from '../../donation/add-donation/add-donation-popup.component';
import { ContactStoreService } from '../contact.store';
import { ToastService } from '../../../layout/toast/toast.service';
import { contactDisplayName, IContact } from '../../../core/models/contact.model';

@Component({
  selector: 'empty-contacts-welcome',
  standalone: true,
  imports: [
    PopupShellComponent,
    ButtonLabelComponent,
    ContactCreatePopupComponent,
    AddDonationPopupComponent
  ],
  templateUrl: './empty-contacts-welcome.component.html',
  styleUrls: ['./empty-contacts-welcome.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyContactsWelcomeComponent implements OnInit, OnChanges {
  private readonly contactStore = inject(ContactStoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @Input() loading = false;

  protected readonly showWelcome = signal(false);
  protected readonly createOpen = signal(false);
  protected readonly donationFollowUpOpen = signal(false);
  protected readonly createdContact = signal<IContact | null>(null);

  ngOnInit(): void {
    this.syncWelcomeVisibility();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loading']) {
      this.syncWelcomeVisibility();
    }
  }

  protected onDismissWelcome(): void {
    this.showWelcome.set(false);
  }

  protected goImport(): void {
    this.showWelcome.set(false);
    void this.router.navigate(['/import']);
  }

  protected openCreate(): void {
    this.showWelcome.set(false);
    this.createOpen.set(true);
  }

  protected onCreateClosed(): void {
    this.createOpen.set(false);
    this.syncWelcomeVisibility();
  }

  protected onContactCreated(contact: IContact): void {
    this.createdContact.set(contact);
    this.toast.show(`Profil ${contactDisplayName(contact)} créé.`, 'success', 4500);
    this.donationFollowUpOpen.set(true);
    this.showWelcome.set(false);
  }

  protected onDonationFollowUpClosed(): void {
    this.donationFollowUpOpen.set(false);
    this.createdContact.set(null);
  }

  private syncWelcomeVisibility(): void {
    if (this.loading) {
      this.showWelcome.set(false);
      return;
    }
    this.showWelcome.set(this.contactStore.contacts().length === 0);
  }
}
