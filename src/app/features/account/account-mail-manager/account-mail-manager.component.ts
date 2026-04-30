import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'account-mail-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-mail-manager.component.html',
  styleUrls: ['./account-mail-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountMailManagerComponent {}

