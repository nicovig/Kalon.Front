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
  auth: {
    login: () => toUrl('/api/Auth/login')
  },
  contact: {
    create: ({ userId }: { userId?: string }) => toUrl(withQuery('/api/Contact', { userId })),
    list: ({ userId }: { userId?: string }) => toUrl(withQuery('/api/Contact', { userId })),
    getById: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/Contact/${encodeURIComponent(id)}`, { userId })),
    update: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/Contact/${encodeURIComponent(id)}`, { userId }))
  },
  contactStatusSettings: {
    get: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/contact-status-settings', { userId })),
    update: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/contact-status-settings', { userId })),
    reset: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/contact-status-settings/reset', { userId }))
  },
  donation: {
    create: ({ userId }: { userId?: string }) => toUrl(withQuery('/api/Donation', { userId })),
    list: ({
      userId,
      fromDate,
      toDate,
      donationType,
      contactId,
      minAmount,
      maxAmount,
      page,
      pageSize
    }: {
      userId?: string;
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
          userId,
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
    getById: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/Donation/${encodeURIComponent(id)}`, { userId })),
    update: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/Donation/${encodeURIComponent(id)}`, { userId }))
  },
  health: {
    check: () => toUrl('/api/Health')
  },
  emailTemplate: {
    create: ({ userId }: { userId?: string }) => toUrl(withQuery('/api/EmailTemplate', { userId })),
    list: ({ userId }: { userId?: string }) => toUrl(withQuery('/api/EmailTemplate', { userId })),
    getById: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/EmailTemplate/${encodeURIComponent(id)}`, { userId })),
    update: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/EmailTemplate/${encodeURIComponent(id)}`, { userId })),
    remove: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/EmailTemplate/${encodeURIComponent(id)}`, { userId }))
  },
  contentBlock: {
    create: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/OrganizationCustomContent/content-blocks', { userId })),
    list: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/OrganizationCustomContent/content-blocks', { userId })),
    getById: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/OrganizationCustomContent/content-blocks/${encodeURIComponent(id)}`, { userId })),
    update: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/OrganizationCustomContent/content-blocks/${encodeURIComponent(id)}`, { userId })),
    remove: ({ id, userId }: { id: string; userId?: string }) =>
      toUrl(withQuery(`/api/OrganizationCustomContent/content-blocks/${encodeURIComponent(id)}`, { userId }))
  },
  organizationDocuments: {
    listGenerated: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/OrganizationDocuments/generated-documents', { userId })),
    getGeneratedById: ({ id, userId, light }: { id: string; userId?: string; light?: boolean }) =>
      toUrl(withQuery(`/api/OrganizationDocuments/generated-documents/${encodeURIComponent(id)}`, { userId, light })),
    listMailLogs: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/OrganizationDocuments/mail-logs', { userId })),
    getMailLogById: ({ id, userId, light }: { id: string; userId?: string; light?: boolean }) =>
      toUrl(withQuery(`/api/OrganizationDocuments/mail-logs/${encodeURIComponent(id)}`, { userId, light }))
  },
  mailLog: {
    list: ({ userId }: { userId?: string }) =>
      toUrl(withQuery('/api/OrganizationDocuments/mail-logs', { userId }))
  }
};
