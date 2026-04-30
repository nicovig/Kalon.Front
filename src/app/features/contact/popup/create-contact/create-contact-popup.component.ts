import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { IContact } from '../../../../core/models/contact.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ContactFormComponent, NewContactFormValue } from '../../form/contact-form.component';
import { ContactStoreService } from '../../contact.store';
import { InlineLoaderComponent } from '../../../../layout/inline-loader/inline-loader.component';
import { ToastService } from '../../../../layout/toast/toast.service';

@Component({
  selector: 'contact-create-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ContactFormComponent, InlineLoaderComponent],
  templateUrl: './create-contact-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactCreatePopupComponent {
  private readonly contactStore = inject(ContactStoreService);
  private readonly toast = inject(ToastService);

  @Output() closed = new EventEmitter<void>();
  @Output() contactCreated = new EventEmitter<IContact>();
  protected creating = false;

  protected onDismiss(): void {
    this.closed.emit();
  }

  protected onCreate(value: NewContactFormValue): void {
    if (this.creating) return;
    this.creating = true;
    this.contactStore
      .createContactAsync(value)
      .pipe(finalize(() => (this.creating = false)))
      .subscribe({
        next: (contact) => {
          this.contactCreated.emit(contact);
          this.closed.emit();
        },
        error: () => {
          this.toast.show("Impossible d'enregistrer le profil pour le moment.", 'alert');
        }
      });
  }
}
