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
  firstDonationAt?: string | null;
  lastDonation?: string | null;
  lastDonationAmount?: number | null;
  averageDonationAmount?: number;
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

export interface ContactStatusSettingsSummaryApiModel {
  newDurationDays?: number;
  toRemindAfterMonths?: number;
  inactiveAfterMonths?: number;
}

export interface OrganizationApiModel {
  id?: string;
  name?: string | null;
  fiscalStatus?: string | null;
  senderName?: string | null;
}

export interface OrganizationLoginResponseApiModel {
  id?: string;
  name?: string | null;
  fiscalStatus?: string | null;
  contactStatusSettings?: ContactStatusSettingsSummaryApiModel | null;
}

export interface OrganizationLogoUpsertRequestApiModel {
  fileName?: string | null;
  storedPath?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number;
}

export interface OrganizationLogoResponseApiModel {
  id?: string;
  organizationId?: string;
  fileName?: string | null;
  storedPath?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface EmailTemplateUpsertRequestApiModel {
  name?: string | null;
  subject?: string | null;
  body?: string | null;
  emailTemplateType?: string | null;
}

export interface EmailTemplateResponseApiModel {
  id?: string;
  organizationId?: string;
  name?: string | null;
  subject?: string | null;
  body?: string | null;
  emailTemplateType?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ContentBlockUpsertRequestApiModel {
  name?: string | null;
  kind?: string | null;
  content?: string | null;
  storedPath?: string | null;
  mimeType?: string | null;
  usableInEmail?: boolean;
  usableInReceipt?: boolean;
}

export interface ContentBlockResponseApiModel {
  id?: string;
  organizationId?: string;
  name?: string | null;
  kind?: string | null;
  content?: string | null;
  storedPath?: string | null;
  mimeType?: string | null;
  usableInEmail?: boolean;
  usableInReceipt?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface GeneratedDocumentLightResponseApiModel {
  id?: string;
  organizationId?: string;
  documentType?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  createdAt?: string;
}

export interface GeneratedDocumentDetailsResponseApiModel {
  id?: string;
  organizationId?: string;
  documentType?: string | null;
  orderNumber?: string | null;
  taxReductionRate?: number | null;
  snapshotOrgName?: string | null;
  snapshotContactDisplayName?: string | null;
  snapshotAmount?: number;
  snapshotDonationDate?: string;
  snapshotDonationType?: string | null;
  pdfPath?: string | null;
  status?: string | null;
  generatedAt?: string | null;
  sentToEmail?: string | null;
  sentAt?: string | null;
  sendError?: string | null;
  createdAt?: string;
}

export interface MailLogListResponseApiModel {
  id?: string;
  type?: string | null;
  date?: string;
  isEmail?: boolean;
  sendAt?: string | null;
  status?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface MailLogDetailsResponseApiModel {
  id?: string;
  organizationId?: string;
  contactId?: string;
  contactDisplayName?: string | null;
  contactEmail?: string | null;
  generatedDocumentId?: string | null;
  generatedDocumentType?: string | null;
  generatedDocumentOrderNumber?: string | null;
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

export type SendingDocumentTypeApiModel =
  | 'message'
  | 'tax_receipt'
  | 'membership_certificate'
  | 'payment_attestation';

export type SendingChannelApiModel = 'email' | 'print';

export interface SendDocumentDtoApiModel {
  documentType?: SendingDocumentTypeApiModel | null;
  channel?: SendingChannelApiModel | null;
  subject?: string | null;
  bodyHtml?: string | null;
  documentBodyHtml?: string | null;
  recipientIds?: string[] | null;
  signatureBlockId?: string | null;
  donationIds?: string[] | null;
}

export interface SendDocumentErrorDtoApiModel {
  contactId?: string;
  contactName?: string | null;
  reason?: string | null;
}

export interface SendDocumentResultDtoApiModel {
  successCount?: number;
  errorCount?: number;
  errors?: SendDocumentErrorDtoApiModel[] | null;
}

export interface MailEditorVariableTagApiModel {
  id?: string | null;
  label?: string | null;
  token?: string | null;
}

export interface PrintDocumentResultDtoApiModel {
  pdfBytes?: number[] | null;
  pageCount?: number;
  generatedDocumentIds?: string[] | null;
}

export type SendPrintResponseApiModel = Blob | PrintDocumentResultDtoApiModel;

export type ConfirmMailedResponseApiModel = void;

export interface NotificationContactToRemindItemApiModel {
  id?: string;
  displayName?: string | null;
}

export interface NotificationDashboardResponseApiModel {
  contactsToRemind?: NotificationContactToRemindItemApiModel[] | null;
  taxReceiptsToSendCount?: number;
  physicalLettersToSendCount?: number;
}
