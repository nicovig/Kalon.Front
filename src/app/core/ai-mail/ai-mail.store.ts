import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../api/api.endpoints';
import { AiMailRequestDtoApiModel, AiMailResultDtoApiModel } from '../api/backend-api.model';
import { isDemoMode } from '../demo/demo-mode';
import { IaAgentCore, ReminderTemplateTone } from '../ia-agent/ia_agent.core';

const REMINDER_TONES = new Set<ReminderTemplateTone>([
  'chill_reminder',
  'fidelity_reminder',
  'thank_you_reminder',
  'urgency_reminder',
  'seasonal_reminder',
  'adhesion_renewal_reminder',
  'anniversary_reminder',
  'birthday_reminder',
  'other'
]);

@Injectable({ providedIn: 'root' })
export class AiMailStore {
  private readonly http = inject(HttpClient);
  private readonly iaAgent = inject(IaAgentCore);

  generateMail(payload: AiMailRequestDtoApiModel): Observable<AiMailResultDtoApiModel> {
    if (!isDemoMode()) {
      return this.http.post<AiMailResultDtoApiModel>(API_ENDPOINTS.aiMail.generateMail(), payload);
    }
    const tone = String(payload.emailType ?? '').trim() as ReminderTemplateTone;
    if (REMINDER_TONES.has(tone)) {
      return this.iaAgent.generateReminderTemplate({ tone }).pipe(
        delay(400),
        map((result) => ({
          subject: result.subject,
          bodyHtml: result.body
        }))
      );
    }
    const context = String(payload.userContext ?? '').trim();
    const body = context
      ? `<p>Bonjour {{prenom}},</p><p>${context}</p>`
      : `<p>Bonjour {{prenom}},</p><p>Nous vous remercions pour votre engagement à nos côtés.</p>`;
    return of({
      subject: 'Un message de {{nom_association}}',
      bodyHtml: `${body}{{signature_footer}}`
    }).pipe(delay(400));
  }
}
