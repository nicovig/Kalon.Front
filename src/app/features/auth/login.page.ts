import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';

@Component({
  selector: 'login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FormTextComponent],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cd = inject(ChangeDetectorRef);

  email = '';
  password = '';
  protected submitting = false;
  protected errorMessage = '';

  onSubmit(): void {
    if (this.submitting) {
      return;
    }
    this.errorMessage = '';
    this.submitting = true;
    this.cd.markForCheck();
    this.authService
      .login(this.email.trim(), this.password)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (err: unknown) => {
          this.errorMessage = this.parseLoginError(err);
        }
      });
  }

  private parseLoginError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string } | null;
      if (body && typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (err.status === 401) {
        return 'Identifiants incorrects.';
      }
    }
    return 'Connexion impossible. Réessayez.';
  }
}
