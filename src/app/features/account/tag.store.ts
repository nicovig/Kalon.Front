import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import {
  TagCreateRequestApiModel,
  TagResponseApiModel,
  TagUpdateRequestApiModel
} from '../../core/api/backend-api.model';
import { IContactTag } from '../../core/models/contact.model';
import { UserStore } from '../../core/auth/user.store';

export type OrganizationTag = IContactTag;

@Injectable({ providedIn: 'root' })
export class TagStoreService {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);
  private readonly tagsSignal = signal<OrganizationTag[]>([]);
  private loaded = false;

  tags(): OrganizationTag[] {
    return this.tagsSignal();
  }

  ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    this.loadTags().subscribe({ error: () => undefined });
  }

  loadTags(): Observable<OrganizationTag[]> {
    if (!this.userStore.isAuthenticated()) {
      return of(this.tagsSignal());
    }
    return this.http.get<TagResponseApiModel[]>(API_ENDPOINTS.tag.list()).pipe(
      map((rows) => rows.map((row) => this.mapTag(row))),
      tap((tags) => this.tagsSignal.set(tags))
    );
  }

  createTag(name: string, color?: string | null): Observable<OrganizationTag> {
    const body: TagCreateRequestApiModel = {
      name: name.trim(),
      color: color?.trim() || null
    };
    return this.http.post<TagResponseApiModel>(API_ENDPOINTS.tag.create(), body).pipe(
      map((row) => this.mapTag(row)),
      tap((tag) => this.tagsSignal.update((list) => [tag, ...list.filter((item) => item.id !== tag.id)]))
    );
  }

  updateTag(id: string, name: string, color?: string | null): Observable<OrganizationTag> {
    const body: TagUpdateRequestApiModel = {
      name: name.trim(),
      color: color?.trim() || null
    };
    return this.http.put<TagResponseApiModel>(API_ENDPOINTS.tag.update({ id }), body).pipe(
      map((row) => this.mapTag(row)),
      tap((tag) =>
        this.tagsSignal.update((list) => list.map((item) => (item.id === id ? tag : item)))
      )
    );
  }

  removeTag(id: string): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.tag.remove({ id })).pipe(
      tap(() => this.tagsSignal.update((list) => list.filter((item) => item.id !== id)))
    );
  }

  findByName(name: string): OrganizationTag | undefined {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    return this.tagsSignal().find((tag) => tag.name.trim().toLowerCase() === normalized);
  }

  private mapTag(row: TagResponseApiModel): OrganizationTag {
    return {
      id: String(row.id ?? ''),
      name: String(row.name ?? '').trim(),
      color: row.color ? String(row.color).trim() : undefined
    };
  }
}
