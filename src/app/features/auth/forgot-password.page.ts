import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';

@Component({
  selector: 'forgot-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormTextComponent],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./login.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordPageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cd = inject(ChangeDetectorRef);

  protected email = '';
  protected submitting = false;
  protected sent = false;
  protected errorMessage = '';

  protected readonly sentMessage =
    'Si un compte est associé à cette adresse, vous recevrez un e-mail avec un lien de réinitialisation (valable 60 minutes).';

  protected onSubmit(): void {
    if (this.submitting || this.sent) {
      return;
    }
    const normalizedEmail = this.email.trim();
    if (!normalizedEmail) {
      this.errorMessage = 'Veuillez saisir votre adresse e-mail.';
      this.cd.markForCheck();
      return;
    }
    this.errorMessage = '';
    this.submitting = true;
    this.cd.markForCheck();
    this.authService
      .forgotPassword(normalizedEmail)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.sent = true;
        },
        error: (err: unknown) => {
          this.errorMessage = this.parseError(err);
        }
      });
  }

  private parseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string } | null;
      if (body && typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (err.status === 0) {
        return 'Impossible de contacter le serveur, réessayez plus tard.';
      }
    }
    return 'Impossible de contacter le serveur, réessayez plus tard.';
  }
}
