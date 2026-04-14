export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  token: string;
  user: {
    id: string;
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    organization?: {
      id?: string;
      name?: string;
      fiscalStatus?: string | null;
      contactStatusSettings?: {
        newDurationDays?: number;
        toRemindAfterMonths?: number;
        inactiveAfterMonths?: number;
      } | null;
    } | null;
    meranId?: string | null;
  };
  meran?: {
    isActive?: boolean;
    plan?: string | null;
  } | null;
}
