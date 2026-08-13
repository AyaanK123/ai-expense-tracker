// src/hooks/useDashboard.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface ExpenseItem {
  id?: string
  title?: string
  description?: string
  amount: number
  category: string
  date: string
  receipt_url?: string
}

interface DashboardData {
  monthlyIncome: number
  totalExpenses: number
  remainingBalance: number
  currency: string
  recentExpenses: ExpenseItem[]
}

export function useDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>({
    monthlyIncome: 0,
    totalExpenses: 0,
    remainingBalance: 0,
    currency: 'INR',
    recentExpenses: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Optional chaining already guards against null/undefined user
    if (!user?.id) return
    const userId = user.id

    async function fetchDashboardData() {
      try {
        setLoading(true)

        // 1. Fetch Profile Data
        const { data: profile } = await supabase
          .from('profiles')
          .select('monthly_income, currency')
          .eq('user_id', userId) // Fixed: using typed local variable userId
          .single()

        // 2. Fetch Expenses Data
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId) // Fixed: using typed local variable userId
          .order('date', { ascending: false })

        const income = profile?.monthly_income || 0
        const currencySymbol = profile?.currency || 'INR'
        
        const totalExp = expenses?.reduce((sum, item) => sum + Number(item.amount), 0) || 0

        setData({
          monthlyIncome: income,
          totalExpenses: totalExp,
          remainingBalance: income - totalExp,
          currency: currencySymbol,
          recentExpenses: expenses || [],
        })
      } catch (error) {
        console.error('Error loading dashboard metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  return { data, loading }
}