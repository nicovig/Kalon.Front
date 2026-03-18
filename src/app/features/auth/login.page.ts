import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';

@Component({
  selector: 'kalon-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FormTextComponent],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  email = '';

  onSubmit(): void {
    this.authService.login(this.email || 'benevole@example.org', 'basic');
    this.router.navigateByUrl('/');
  }
}

