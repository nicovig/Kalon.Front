export type AssociationPlan = 'free' | 'basic' | 'premium';
export type UserRole = 'organization_master' | string;

export interface AuthUser {
  id?: string;
  organizationId?: string;
  role?: UserRole | null;
  firstname: string;
  lastname: string;
  email: string;
  associationName: string;
  plan: AssociationPlan;
}
