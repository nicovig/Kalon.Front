import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';
import { AUTH_MOCK_ENABLED } from '../config/api.config';
import { LoginResponseBody } from './auth-api.model';
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

  private mapApiUserToAuthUser(
    u: LoginResponseBody['user'],
    meran: LoginResponseBody['meran']
  ): AuthUser {
    return {
      id: u.id,
      organizationId: u.organization?.id,
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
