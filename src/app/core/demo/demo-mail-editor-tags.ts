import { MailEditorVariableTagApiModel } from '../api/backend-api.model';

export const DEMO_MAIL_EDITOR_TAGS: MailEditorVariableTagApiModel[] = [
  { id: 'prenom', label: 'Prénom', token: '{{prenom}}' },
  { id: 'nom', label: 'Nom', token: '{{nom}}' },
  { id: 'totalDonation', label: 'Total des contributions', token: '{{totalDonation}}' },
  { id: 'firstDonationAt', label: 'Date première contribution', token: '{{firstDonationAt}}' },
  { id: 'lastDonation', label: 'Date dernière contribution', token: '{{lastDonation}}' },
  { id: 'averageDonationAmount', label: 'Moyenne des contributions', token: '{{averageDonationAmount}}' },
  { id: 'donationCount', label: 'Nombre de contributions', token: '{{donationCount}}' }
];
