export type AssociationPlan = 'free' | 'basic' | 'premium';

export interface AuthUser {
  id?: number;
  firstname: string;
  lastname: string;
  email: string;
  associationName: string;
  plan: AssociationPlan;
}
