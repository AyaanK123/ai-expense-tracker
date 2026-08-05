import type { ExpenseCategory } from '@/types/expense'

export interface Budget {
  id: string
  user_id: string
  category: ExpenseCategory
  monthly_limit: number
  created_at: string
  updated_at: string
}

export interface BudgetFormData {
  category: ExpenseCategory
  monthly_limit: number
}

export interface BudgetStatus {
  category: ExpenseCategory
  limit: number
  spent: number
  remaining: number
  usagePercent: number
  exceeded: boolean
}
