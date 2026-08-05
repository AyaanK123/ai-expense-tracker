import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/expense'
import { supabase } from '@/lib/supabase'

interface CategorizeResponse {
  category: ExpenseCategory
}

export async function categorizeExpense(
  description: string,
  amount: number
): Promise<ExpenseCategory> {
  const { data, error } = await supabase.functions.invoke<CategorizeResponse>(
    'categorize-expense',
    {
      body: { description, amount },
    }
  )

  if (error) {
    console.warn('AI categorization failed, using fallback:', error.message)
    return fallbackCategorize(description)
  }

  if (data?.category && EXPENSE_CATEGORIES.includes(data.category)) {
    return data.category
  }

  return fallbackCategorize(description)
}

function fallbackCategorize(description: string): ExpenseCategory {
  const text = description.toLowerCase()

  const rules: Array<[ExpenseCategory, string[]]> = [
    ['Food', ['food', 'restaurant', 'grocery', 'coffee', 'lunch', 'dinner', 'uber eats', 'doordash']],
    ['Transport', ['uber', 'lyft', 'gas', 'fuel', 'parking', 'metro', 'bus', 'train', 'taxi']],
    ['Shopping', ['amazon', 'store', 'clothes', 'shopping', 'mall', 'target', 'walmart']],
    ['Entertainment', ['netflix', 'spotify', 'movie', 'game', 'concert', 'theater']],
    ['Bills', ['rent', 'electric', 'water', 'internet', 'phone', 'insurance', 'utility']],
    ['Healthcare', ['doctor', 'pharmacy', 'hospital', 'medical', 'dental', 'health']],
    ['Travel', ['flight', 'hotel', 'airbnb', 'vacation', 'airline']],
    ['Education', ['course', 'book', 'tuition', 'school', 'udemy', 'coursera']],
  ]

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category
    }
  }

  return 'Other'
}
