import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';
import { API_BASE_URL, AUTH_MOCK_ENABLED } from '../config/api.config';
import { LoginResponseBody } from './auth-api.model';
import { AssociationPlan, AuthUser } from './auth-user.model';
import { UserStore } from './user.store';

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
    const url = `${API_BASE_URL.replace(/\/$/, '')}/api/auth/login`;
    return this.http.post<LoginResponseBody>(url, { email: email.trim(), password }).pipe(
      map((body) => {
        const user = this.mapApiUserToAuthUser(body.user);
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
    u: LoginResponseBody['user']
  ): AuthUser {
    return {
      id: u.id,
      firstname: u.firstname ?? '',
      lastname: u.lastname ?? '',
      email: u.email ?? '',
      associationName: u.associationName ?? '',
      plan: this.normalizePlan(u.plan)
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
      id: 1,
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
