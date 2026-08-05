import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseFormData } from '@/types/expense'

export function useExpenses(userId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    if (!userId) {
      setExpenses([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setExpenses([])
    } else {
      setExpenses(data ?? [])
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const addExpense = async (formData: ExpenseFormData) => {
    if (!userId) throw new Error('Not authenticated')

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({ ...formData, user_id: userId })
      .select()
      .single()

    if (insertError) throw insertError

    setExpenses((prev) => [data, ...prev])
    return data
  }

  const updateExpense = async (id: string, formData: Partial<ExpenseFormData>) => {
    const { data, error: updateError } = await supabase
      .from('expenses')
      .update(formData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)))
    return data
  }

  const deleteExpense = async (id: string) => {
    const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id)
    if (deleteError) throw deleteError
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  return {
    expenses,
    loading,
    error,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
