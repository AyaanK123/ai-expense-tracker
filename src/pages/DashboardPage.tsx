import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useExpenses } from '@/hooks/useExpenses'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DeficitAlertBanner } from '@/components/DeficitAlertBanner'
import { supabase } from '@/lib/supabase'

export function DashboardPage() {
  const { user } = useAuth()
  const { expenses, loading, error } = useExpenses(user?.id)
  const [currency, setCurrency] = useState('INR')
  const [monthlyIncome, setMonthlyIncome] = useState<number>(50000)

  // Automatically get the current month & year
  const currentDate = new Date()
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' })
  const currentYearVal = currentDate.getFullYear().toString()
  
  // Fetch user profile data (income and currency) in a single request
  useEffect(() => {
    if (!user?.id) return

    async function fetchUserProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('monthly_income, currency')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching user profile:', error.message)
        return
      }

      if (data) {
        if (data.monthly_income != null) {
          setMonthlyIncome(Number(data.monthly_income))
        }
        if (data.currency) {
          setCurrency(data.currency)
        }
      }
    }

    fetchUserProfile()
  }, [user?.id]) 

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center text-red-600 p-6 bg-white rounded-xl shadow-sm">
        <p>Failed to load expenses: {error}</p>
      </div>
    )
  }

  // Calculate total expenses specifically for the active/current month
  const totalExpenses = (expenses || [])
    .filter((exp: Record<string, unknown>) => {
      const expDate = new Date(exp.date as string)
      const expMonth = expDate.toLocaleString('default', { month: 'long' })
      const expYear = expDate.getFullYear().toString()
      return expMonth === currentMonthName && expYear === currentYearVal
    })
    .reduce((acc: number, curr: Record<string, unknown>) => acc + Number(curr.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-1 text-slate-600">Overview of your spending habits and financial health</p>
      </div>

      {/* Deficit Alert Banner: Automatically surfaces if spending exceeds monthly income */}
      <DeficitAlertBanner 
        income={monthlyIncome}
        totalExpenses={totalExpenses}
        selectedMonth={currentMonthName}
        selectedYear={currentYearVal}
      />

      {/* Passing currency as a prop to keep the layout synchronized */}
      <DashboardCharts expenses={expenses} currency={currency} />
    </div>
  )
}

export default DashboardPage