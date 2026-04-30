import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api.endpoints';
import { AiMailRequestDtoApiModel, AiMailResultDtoApiModel } from '../api/backend-api.model';

@Injectable({ providedIn: 'root' })
export class AiMailStore {
  private readonly http = inject(HttpClient);

  generateMail(payload: AiMailRequestDtoApiModel): Observable<AiMailResultDtoApiModel> {
    return this.http.post<AiMailResultDtoApiModel>(API_ENDPOINTS.aiMail.generateMail(), payload);
  }
}
