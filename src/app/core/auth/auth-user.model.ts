export type AssociationPlan = 'free' | 'basic' | 'premium';

export interface AuthUser {
  id?: string;
  organizationId?: string;
  firstname: string;
  lastname: string;
  email: string;
  associationName: string;
  plan: AssociationPlan;
}
