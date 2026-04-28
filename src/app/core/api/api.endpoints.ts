import { API_BASE_URL } from '../config/api.config';

function withQuery(
  path: string,
  query: Record<string, string | number | boolean | null | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const suffix = qs.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function toUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

export const API_ENDPOINTS = {
  aiMail: {
    generateMail: () => toUrl('/api/AIMail/generate-mail')
  },
  auth: {
    login: () => toUrl('/api/Auth/login')
  },
  contact: {
    create: () => toUrl('/api/Contact'),
    list: () => toUrl('/api/Contact'),
    getById: ({ id }: { id: string }) => toUrl(`/api/Contact/${encodeURIComponent(id)}`),
    update: ({ id }: { id: string }) => toUrl(`/api/Contact/${encodeURIComponent(id)}`)
  },
  contactStatusSettings: {
    get: () => toUrl('/api/contact-status-settings'),
    update: () => toUrl('/api/contact-status-settings'),
    reset: () => toUrl('/api/contact-status-settings/reset')
  },
  donation: {
    create: () => toUrl('/api/Donation'),
    list: ({
      fromDate,
      toDate,
      donationType,
      contactId,
      minAmount,
      maxAmount,
      page,
      pageSize
    }: {
      fromDate?: string;
      toDate?: string;
      donationType?: string;
      contactId?: string;
      minAmount?: number;
      maxAmount?: number;
      page?: number;
      pageSize?: number;
    }) =>
      toUrl(
        withQuery('/api/Donation', {
          fromDate,
          toDate,
          donationType,
          contactId,
          minAmount,
          maxAmount,
          page,
          pageSize
        })
      ),
    getById: ({ id }: { id: string }) => toUrl(`/api/Donation/${encodeURIComponent(id)}`),
    update: ({ id }: { id: string }) => toUrl(`/api/Donation/${encodeURIComponent(id)}`)
  },
  health: {
    check: () => toUrl('/api/Health')
  },
  organization: {
    get: () => toUrl('/api/Organization'),
    update: () => toUrl('/api/Organization'),
    updateStatusSettings: () => toUrl('/api/Organization/status-settings')
  },
  emailTemplate: {
    create: () => toUrl('/api/EmailTemplate'),
    list: () => toUrl('/api/EmailTemplate'),
    getById: ({ id }: { id: string }) => toUrl(`/api/EmailTemplate/${encodeURIComponent(id)}`),
    update: ({ id }: { id: string }) => toUrl(`/api/EmailTemplate/${encodeURIComponent(id)}`),
    remove: ({ id }: { id: string }) => toUrl(`/api/EmailTemplate/${encodeURIComponent(id)}`)
  },
  contentBlock: {
    create: () => toUrl('/api/OrganizationCustomContent/content-blocks'),
    list: () => toUrl('/api/OrganizationCustomContent/content-blocks'),
    getById: ({ id }: { id: string }) =>
      toUrl(`/api/OrganizationCustomContent/content-blocks/${encodeURIComponent(id)}`),
    update: ({ id }: { id: string }) =>
      toUrl(`/api/OrganizationCustomContent/content-blocks/${encodeURIComponent(id)}`),
    remove: ({ id }: { id: string }) =>
      toUrl(`/api/OrganizationCustomContent/content-blocks/${encodeURIComponent(id)}`)
  },
  organizationCustomContent: {
    logo: () => toUrl('/api/OrganizationCustomContent/logo')
  },
  organizationDocuments: {
    listGenerated: () => toUrl('/api/OrganizationDocuments/generated-documents'),
    getGeneratedById: ({ id, light }: { id: string; light?: boolean }) =>
      toUrl(withQuery(`/api/OrganizationDocuments/generated-documents/${encodeURIComponent(id)}`, { light })),
    regenerateGeneratedById: ({ id }: { id: string }) =>
      toUrl(`/api/OrganizationDocuments/generated-documents/${encodeURIComponent(id)}/regenerate`),
    listMailLogs: () => toUrl('/api/OrganizationDocuments/mail-logs'),
    getMailLogById: ({ id, light }: { id: string; light?: boolean }) =>
      toUrl(withQuery(`/api/OrganizationDocuments/mail-logs/${encodeURIComponent(id)}`, { light }))
  },
  notification: {
    dashboard: () => toUrl('/api/Notification/dashboard')
  },
  mailLog: {
    list: () => toUrl('/api/OrganizationDocuments/mail-logs')
  },
  sending: {
    mailEditorTags: ({ hasCompanyRecipient }: { hasCompanyRecipient?: boolean }) =>
      toUrl(withQuery('/api/Sending/mail-editor-tags', { hasCompanyRecipient })),
    send: () => toUrl('/api/Sending/send'),
    print: () => toUrl('/api/Sending/print'),
    confirmMailed: ({ mailLogId }: { mailLogId: string }) =>
      toUrl(`/api/Sending/confirm-mailed/${encodeURIComponent(mailLogId)}`)
  }
};
