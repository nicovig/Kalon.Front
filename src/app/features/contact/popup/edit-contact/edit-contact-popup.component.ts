import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IContact } from '../../../../core/models/contact.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ToastService } from '../../../../layout/toast/toast.service';
import { ContactFormComponent, ContactFormUpdatePayload } from '../../form/contact-form.component';
import { ContactStoreService } from '../../contact.store';

@Component({
  selector: 'contact-edit-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ContactFormComponent],
  templateUrl: './edit-contact-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactEditPopupComponent {
  private readonly contactStore = inject(ContactStoreService);
  private readonly toast = inject(ToastService);

  readonly contact = input.required<IContact>();

  @Output() closed = new EventEmitter<void>();

  protected onDismiss(): void {
    this.closed.emit();
  }

  protected onUpdate(payload: ContactFormUpdatePayload): void {
    this.contactStore.updateContact(payload.contactId, payload.value);
    this.toast.show('Fiche profil mise à jour.', 'success');
    this.closed.emit();
  }
}
