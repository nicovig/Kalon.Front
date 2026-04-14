export interface ApiMessageResponse {
  message?: string | null;
  detail?: string | null;
}

export interface ContactApiAddress {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ContactApiEnterprise {
  name?: string | null;
  siret?: string | null;
  supportKind?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  contactFirstname?: string | null;
  contactLastname?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface ContactApiModel {
  id?: string;
  organizationId?: string;
  kind?: string | null;
  status?: string | null;
  isOut?: boolean;
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  notes?: string | null;
  department?: string | null;
  preferredFrequencySendingReceipt?: string | null;
  address?: ContactApiAddress | null;
  enterprise?: ContactApiEnterprise | null;
  createdAt?: string;
  updatedAt?: string | null;
  totalDonation?: number;
  lastDonation?: string | null;
  donationCount?: number;
}

export interface GeneratedDocumentSummaryApiModel {
  id?: string;
  documentType?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  pdfPath?: string | null;
}

export interface GeneratedDocumentApiModel extends GeneratedDocumentSummaryApiModel {
  organizationId?: string;
  sentAt?: string | null;
  generatedAt?: string | null;
  sendError?: string | null;
  createdAt?: string;
}

export interface MailLogApiModel {
  id?: string;
  organizationId?: string;
  contactId?: string;
  generatedDocumentId?: string | null;
  isEmail?: boolean;
  sentToEmail?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  printedAt?: string | null;
  mailedAt?: string | null;
  mailedBy?: string | null;
  createdAt?: string;
}

export interface DonationApiModel {
  id?: string;
  organizationId?: string;
  contactId?: string;
  contactDisplayName?: string | null;
  amount?: number;
  date?: string;
  donationType?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  isAnonymous?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  generatedDocumentId?: string | null;
  generatedDocument?: GeneratedDocumentSummaryApiModel | GeneratedDocumentApiModel | null;
}

export interface DonationListResponse {
  items?: DonationApiModel[] | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface ContactStatusSettingsApiModel {
  id?: string;
  organizationId?: string;
  newDurationDays?: number;
  toRemindAfterMonths?: number;
  inactiveAfterMonths?: number;
  createdAt?: string;
  updatedAt?: string | null;
}
