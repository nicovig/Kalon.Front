import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';
import { AUTH_MOCK_ENABLED } from '../config/api.config';
import {
  ChangePasswordRequestApiModel,
  ForgotPasswordRequestApiModel,
  LoginResponseBody,
  ResetPasswordRequestApiModel
} from './auth-api.model';
import { AssociationPlan, AuthUser } from './auth-user.model';
import { UserStore } from './user.store';
import { API_ENDPOINTS } from '../api/api.endpoints';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  readonly currentUser$ = this.userStore.currentUser$;

  get currentUser(): AuthUser | null {
    return this.userStore.currentUser;
  }

  getToken(): string | null {
    return this.userStore.token;
  }

  get currentPlan(): AssociationPlan {
    return this.userStore.currentPlan;
  }

  isAuthenticated(): boolean {
    return this.userStore.isAuthenticated();
  }

  login(email: string, password: string): Observable<AuthUser> {
    if (AUTH_MOCK_ENABLED) {
      return this.mockLogin(email, password);
    }
    const url = API_ENDPOINTS.auth.login();
    return this.http.post<LoginResponseBody>(url, { email: email.trim(), password }).pipe(
      map((body) => {
        const user = this.mapApiUserToAuthUser(body.user, body.meran ?? null);
        this.userStore.setSession(body.token, user);
        return user;
      }),
      catchError((err) =>
        throwError(() => err)
      )
    );
  }

  logout(): void {
    this.userStore.clearSession();
  }

  forgotPassword(email: string): Observable<void> {
    const normalizedEmail = email.trim();
    if (AUTH_MOCK_ENABLED) {
      if (!normalizedEmail) {
        return throwError(() => ({ status: 400, error: { message: 'Email is required.' } }));
      }
      return of(undefined).pipe(delay(300));
    }
    const payload: ForgotPasswordRequestApiModel = { email: normalizedEmail };
    return this.http.post<void>(API_ENDPOINTS.auth.forgotPassword(), payload);
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    const normalizedToken = token.trim();
    const normalizedPassword = String(newPassword ?? '');
    if (AUTH_MOCK_ENABLED) {
      if (!normalizedToken || !normalizedPassword) {
        return throwError(() => ({ status: 400, error: { message: 'Token and new password are required.' } }));
      }
      if (normalizedToken === 'expired') {
        return throwError(() => ({
          status: 400,
          error: { message: 'Lien de réinitialisation invalide ou expiré.' }
        }));
      }
      return of(undefined).pipe(delay(300));
    }
    const payload: ResetPasswordRequestApiModel = {
      token: normalizedToken,
      newPassword: normalizedPassword
    };
    return this.http.post<void>(API_ENDPOINTS.auth.resetPassword(), payload);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const current = String(currentPassword ?? '');
    const next = String(newPassword ?? '');
    if (AUTH_MOCK_ENABLED) {
      if (!current || !next) {
        return throwError(() => ({ status: 400, error: { message: 'Mot de passe actuel et nouveau requis.' } }));
      }
      if (current !== 'password') {
        return throwError(() => ({ status: 401, error: { message: 'Mot de passe actuel incorrect.' } }));
      }
      return of(undefined).pipe(delay(300));
    }
    const payload: ChangePasswordRequestApiModel = {
      currentPassword: current,
      newPassword: next
    };
    return this.http.post<void>(API_ENDPOINTS.auth.changePassword(), payload);
  }

  private mapApiUserToAuthUser(
    u: LoginResponseBody['user'],
    meran: LoginResponseBody['meran']
  ): AuthUser {
    return {
      id: u.id,
      organizationId: u.organization?.id,
      role: u.role ?? null,
      firstname: u.firstname ?? '',
      lastname: u.lastname ?? '',
      email: u.email ?? '',
      associationName: u.organization?.name ?? '',
      plan: this.normalizePlan(meran?.plan ?? '')
    };
  }

  private normalizePlan(raw: string): AssociationPlan {
    const v = String(raw ?? '').toLowerCase();
    if (v === 'free' || v === 'basic' || v === 'premium') {
      return v;
    }
    return 'free';
  }

  private mockLogin(email: string, password: string): Observable<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = String(password ?? '').trim();
    if (!normalizedEmail || !normalizedPassword) {
      return throwError(() => ({ status: 401, error: { message: 'Invalid credentials.' } }));
    }
    const user: AuthUser = {
      id: '11111111-1111-1111-1111-111111111111',
      organizationId: '22222222-2222-2222-2222-222222222222',
      role: 'admin',
      firstname: 'Marie',
      lastname: 'Dupont',
      email: normalizedEmail,
      associationName: 'Asso Parents d eleves',
      plan: 'basic'
    };
    const token = `mock-${Date.now()}`;
    this.userStore.setSession(token, user);
    return of(user).pipe(delay(300));
  }
}
