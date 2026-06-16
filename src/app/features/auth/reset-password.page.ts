import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';

@Component({
  selector: 'reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormTextComponent],
  templateUrl: './reset-password.page.html',
  styleUrls: ['./login.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cd = inject(ChangeDetectorRef);

  protected token: string | null = null;
  protected newPassword = '';
  protected confirmPassword = '';
  protected submitting = false;
  protected errorMessage = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.cd.markForCheck();
  }

  protected onSubmit(): void {
    if (this.submitting || !this.token) {
      return;
    }
    const password = this.newPassword;
    const confirm = this.confirmPassword;
    if (!password.trim()) {
      this.errorMessage = 'Veuillez saisir un nouveau mot de passe.';
      this.cd.markForCheck();
      return;
    }
    if (password !== confirm) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      this.cd.markForCheck();
      return;
    }
    this.errorMessage = '';
    this.submitting = true;
    this.cd.markForCheck();
    this.authService
      .resetPassword(this.token, password)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/auth/login'], { queryParams: { reset: 'success' } });
        },
        error: (err: unknown) => {
          this.errorMessage = this.parseError(err);
        }
      });
  }

  private parseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string } | null;
      const message = body?.message?.trim() ?? '';
      if (message.includes('invalide') || message.includes('expiré')) {
        return 'Ce lien n’est plus valide. Demandez un nouveau lien de réinitialisation.';
      }
      if (message) {
        return message;
      }
      if (err.status === 0) {
        return 'Impossible de contacter le serveur, réessayez plus tard.';
      }
    }
    return 'Une erreur est survenue. Réessayez.';
  }
}
