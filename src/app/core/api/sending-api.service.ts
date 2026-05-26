import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { API_ENDPOINTS } from './api.endpoints';
import { SendDocumentDtoApiModel, SendDocumentResultDtoApiModel } from './backend-api.model';
import { UserStore } from '../auth/user.store';

export function buildSendingSendFormData(
  payload: SendDocumentDtoApiModel,
  files: readonly File[]
): FormData {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  for (const file of files) {
    formData.append('attachments', file, file.name);
  }
  return formData;
}

@Injectable({ providedIn: 'root' })
export class SendingApiService {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  sendEmail(
    payload: SendDocumentDtoApiModel,
    attachmentFiles: readonly File[] = []
  ): Observable<SendDocumentResultDtoApiModel> {
    if (!attachmentFiles.length) {
      return this.http.post<SendDocumentResultDtoApiModel>(API_ENDPOINTS.sending.send(), payload);
    }
    return from(this.postSendMultipart(payload, attachmentFiles));
  }

  private async postSendMultipart(
    payload: SendDocumentDtoApiModel,
    attachmentFiles: readonly File[]
  ): Promise<SendDocumentResultDtoApiModel> {
    const url = API_ENDPOINTS.sending.send();
    const headers = new Headers();
    const token = this.userStore.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: buildSendingSendFormData(payload, attachmentFiles)
    });
    const raw = await response.text();
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
    if (!response.ok) {
      throw new HttpErrorResponse({
        error: parsed,
        status: response.status,
        statusText: response.statusText,
        url
      });
    }
    return (parsed ?? {}) as SendDocumentResultDtoApiModel;
  }
}
