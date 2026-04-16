import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';
import { FormTextareaComponent } from '../../../layout/forms/textarea/form-textarea.component';
import { CardComponent } from '../../../layout/card/card.component';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import {
  MailTextBlock,
  MailTextBlockRole,
  OrganizationCustomContentStore
} from '../organization-custom-content.store';
import { ToastService } from '../../../layout/toast/toast.service';

@Component({
  selector: 'account-mail-manager',
  standalone: true,
  imports: [CommonModule, CardComponent, PopupShellComponent, ButtonLabelComponent, FormTextComponent, FormTextareaComponent],
  templateUrl: './account-mail-manager.component.html',
  styleUrls: ['./account-mail-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountMailManagerComponent {
  private readonly store = inject(OrganizationCustomContentStore);
  private readonly toast = inject(ToastService);
}

