import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useBudgets(userId: string | undefined, month: string, year: string) {
  const [budgets, setBudgets] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    if (!userId) {
      setBudgets([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)

      if (error) throw error
      setBudgets(data || [])
    } catch (err: unknown) {
      console.error('Error fetching budgets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }, [userId, month, year])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const saveBudget = async (budgetData: { category: string; monthly_limit: number }) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('budgets')
        .upsert(
          [
            {
              user_id: userId,
              category: budgetData.category,
              monthly_limit: budgetData.monthly_limit,
              month: month,
              year: year,
            },
          ],
          { onConflict: 'user_id,category,month,year' }
        )

      if (error) throw error
      await fetchBudgets()
    } catch (err) {
      console.error('Error saving budget in hook:', err)
      throw err
    }
  }

  const deleteBudget = async (id: string) => {
    if (!userId) return

    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
      await fetchBudgets()
    } catch (err) {
      console.error('Error deleting budget in hook:', err)
      throw err
    }
  }

  return { budgets, loading, error, saveBudget, deleteBudget, refetch: fetchBudgets }
}