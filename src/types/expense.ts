export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Travel',
  'Education',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Expense {
  id: string
  user_id: string
  amount: number
  description: string
  category: ExpenseCategory
  date: string
  created_at: string
  updated_at: string
}

export interface ExpenseFormData {
  amount: number
  description: string
  category: ExpenseCategory
  date: string
}

export interface CategorySummary {
  category: ExpenseCategory
  total: number
  count: number
}

export interface MonthlySummary {
  month: string
  total: number
}
