export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  token: string;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    associationName: string;
    plan: string;
  };
}
