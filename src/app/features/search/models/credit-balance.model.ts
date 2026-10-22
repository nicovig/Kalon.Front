export type SearchCreditBalance = {
  availableCredits: number;
  canSearch: boolean;
  canOpenDetail: boolean;
};

export type SearchCreditsInsufficientError = {
  error?: string;
  availableCredits?: number;
  canPurchase?: boolean;
};
