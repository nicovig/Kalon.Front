import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IContact } from '../../../../core/models/contact.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ContactFormComponent, NewContactFormValue } from '../../form/contact-form.component';
import { ContactStoreService } from '../../contact.store';

@Component({
  selector: 'contact-create-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ContactFormComponent],
  templateUrl: './create-contact-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactCreatePopupComponent {
  private readonly contactStore = inject(ContactStoreService);

  @Output() closed = new EventEmitter<void>();
  @Output() contactCreated = new EventEmitter<IContact>();

  protected onDismiss(): void {
    this.closed.emit();
  }

  protected onCreate(value: NewContactFormValue): void {
    const contact = this.contactStore.createContact(value);
    this.contactCreated.emit(contact);
    this.closed.emit();
  }
}
