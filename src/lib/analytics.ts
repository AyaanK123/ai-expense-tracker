import { format, parseISO, startOfMonth, subMonths } from 'date-fns'
import type { Expense, CategorySummary, MonthlySummary } from '@/types/expense'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy')
}

export function getCategorySummaries(expenses: Expense[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>()

  for (const expense of expenses) {
    const existing = map.get(expense.category)
    if (existing) {
      existing.total += expense.amount
      existing.count += 1
    } else {
      map.set(expense.category, {
        category: expense.category,
        total: expense.amount,
        count: 1,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export function getMonthlySummaries(expenses: Expense[], months = 6): MonthlySummary[] {
  const now = new Date()
  const monthKeys: string[] = []

  for (let i = months - 1; i >= 0; i--) {
    const month = startOfMonth(subMonths(now, i))
    monthKeys.push(format(month, 'yyyy-MM'))
  }

  const totals = new Map(monthKeys.map((key) => [key, 0]))

  for (const expense of expenses) {
    const key = format(parseISO(expense.date), 'yyyy-MM')
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + expense.amount)
    }
  }

  return monthKeys.map((key) => ({
    month: format(parseISO(`${key}-01`), 'MMM yyyy'),
    total: totals.get(key) ?? 0,
  }))
}

export function getTotalSpent(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

export const CHART_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#64748b',
]
