import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { IContact } from '../../../../core/models/contact.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ToastService } from '../../../../layout/toast/toast.service';
import { ContactFormComponent, ContactFormUpdatePayload } from '../../form/contact-form.component';
import { ContactStoreService } from '../../contact.store';
import { InlineLoaderComponent } from '../../../../layout/inline-loader/inline-loader.component';

@Component({
  selector: 'contact-edit-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ContactFormComponent, InlineLoaderComponent],
  templateUrl: './edit-contact-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactEditPopupComponent implements OnInit {
  private readonly contactStore = inject(ContactStoreService);
  private readonly toast = inject(ToastService);

  readonly contact = input.required<IContact>();

  @Output() closed = new EventEmitter<void>();
  protected readonly loadingDetails = signal(true);
  protected updating = false;
  protected readonly editableContact = signal<IContact | null>(null);

  ngOnInit(): void {
    const current = this.contact();
    this.editableContact.set(current);
    this.contactStore.getContactByIdAsync(current.id).subscribe({
      next: (detailed) => {
        if (detailed) {
          this.editableContact.set(detailed);
        }
        this.loadingDetails.set(false);
      },
      error: () => {
        this.loadingDetails.set(false);
      }
    });
  }

  protected onDismiss(): void {
    this.closed.emit();
  }

  protected onUpdate(payload: ContactFormUpdatePayload): void {
    if (this.updating) return;
    this.updating = true;
    this.contactStore
      .updateContactAsync(payload.contactId, payload.value)
      .pipe(finalize(() => (this.updating = false)))
      .subscribe({
        next: (updated) => {
          if (!updated) return;
          this.toast.show('Fiche profil mise à jour.', 'success');
          this.closed.emit();
        },
        error: () => {
          this.toast.show("Impossible de mettre à jour le profil pour le moment.", 'alert');
        }
      });
  }
}
