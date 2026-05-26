import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { buildSendingSendFormData, SendingApiService } from './sending-api.service';
import { UserStore } from '../auth/user.store';

describe('SendingApiService', () => {
  it('buildSendingSendFormData met payload et attachments', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    const fd = buildSendingSendFormData(
      { documentType: 'message', channel: 'email', recipientIds: ['id-1'] },
      [file]
    );
    expect(typeof fd.get('payload')).toBe('string');
    expect(fd.getAll('attachments').length).toBe(1);
  });

  it('sendEmail sans fichier utilise HttpClient json', () => {
    let postedBody: unknown;
    TestBed.configureTestingModule({
      providers: [
        SendingApiService,
        {
          provide: HttpClient,
          useValue: {
            post: (_url: string, body: unknown) => {
              postedBody = body;
              return of({ successCount: 1 });
            }
          }
        },
        { provide: UserStore, useValue: { token: null } }
      ]
    });
    const service = TestBed.inject(SendingApiService);
    service.sendEmail({ documentType: 'message', channel: 'email' }).subscribe();
    expect(postedBody).toEqual({ documentType: 'message', channel: 'email' });
  });
});
