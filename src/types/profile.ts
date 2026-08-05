export type CurrencyType = 'USD' | 'INR' | 'EUR' | 'GBP';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  occupation: string;
  monthly_income: number;
  currency: CurrencyType;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  full_name: string;
  phone: string;
  occupation: string;
  monthly_income: number;
  currency: CurrencyType;
}

export const CURRENCIES: CurrencyType[] = ['USD', 'INR', 'EUR', 'GBP'];