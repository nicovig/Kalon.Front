import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccountMailManagerComponent } from './account-mail-manager/account-mail-manager.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

@Component({
  selector: 'account-page',
  standalone: true,
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountMailManagerComponent, TopbarComponent]
})
export class AccountPageComponent {}

