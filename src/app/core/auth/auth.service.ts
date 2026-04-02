import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { LoginResponseBody } from './auth-api.model';

const AUTH_KEY = 'kalon.auth';

export type AssociationPlan = 'free' | 'basic' | 'premium';

export interface AuthUser {
  id?: number;
  firstname: string;
  lastname: string;
  email: string;
  associationName: string;
  plan: AssociationPlan;
}

interface StoredSession {
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly initial = this.readFromStorage();
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.initial.user);
  private tokenValue: string | null = this.initial.token;

  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenValue;
  }

  get currentPlan(): AssociationPlan {
    return this.currentUser?.plan ?? 'free';
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && !!this.tokenValue;
  }

  login(email: string, password: string): Observable<AuthUser> {
    const url = `${API_BASE_URL.replace(/\/$/, '')}/api/auth/login`;
    return this.http.post<LoginResponseBody>(url, { email: email.trim(), password }).pipe(
      map((body) => {
        const user = this.mapApiUserToAuthUser(body.user);
        this.persistSession(body.token, user);
        this.tokenValue = body.token;
        this.currentUserSubject.next(user);
        return user;
      }),
      catchError((err) =>
        throwError(() => err)
      )
    );
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this.tokenValue = null;
    this.currentUserSubject.next(null);
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

  private persistSession(token: string, user: AuthUser): void {
    const payload: StoredSession = { token, user };
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  }

  private readFromStorage(): { user: AuthUser | null; token: string | null } {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredSession | AuthUser | null;
        if (parsed && typeof parsed === 'object' && 'token' in parsed && 'user' in parsed) {
          const s = parsed as StoredSession;
          if (s.token && s.user) {
            return { user: s.user, token: s.token };
          }
        }
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }

    const legacy = localStorage.getItem('kalon.currentUser');
    if (legacy) {
      localStorage.removeItem('kalon.currentUser');
    }

    return { user: null, token: null };
  }
}
