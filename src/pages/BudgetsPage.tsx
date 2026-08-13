import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useExpenses } from '@/hooks/useExpenses'
import { useBudgets } from '@/hooks/useBudgets'
import { supabase } from '@/lib/supabase'

export interface Expense {
  id?: string;
  title?: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORIES = ['Food', 'Entertainment', 'Shopping', 'Bills', 'Other']

export function BudgetsPage() {
  const { user } = useAuth()
  const { expenses } = useExpenses(user?.id)

  // State for dynamic monthly income/revenue with a default fallback
  const [estimatedMonthlyIncome, setEstimatedMonthlyIncome] = useState(50000)

  // Fetch actual monthly income from Supabase profile table
  useEffect(() => {
    async function fetchProfileIncome() {
      if (!user?.id) return
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('monthly_income')
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        if (data && data.monthly_income) {
          setEstimatedMonthlyIncome(Number(data.monthly_income))
        }
      } catch (err) {
        console.error('Error fetching profile monthly income:', err)
      }
    }

    fetchProfileIncome()
  }, [user?.id])

  // Date setup for current & upcoming months generation
  const today = new Date()
  const currentMonthNum = today.getMonth()
  const currentYearNum = today.getFullYear()

  const monthOptions = useMemo(() => {
    const list = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentYearNum, currentMonthNum + i, 1)
      const mVal = (d.getMonth() + 1).toString().padStart(2, '0')
      const yVal = d.getFullYear().toString()
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
      list.push({ value: `${yVal}-${mVal}`, label, month: mVal, year: yVal })
    }
    return list
  }, [currentMonthNum, currentYearNum])

  const [selectedMonthYear, setSelectedMonthYear] = useState(monthOptions[0].value)
  const activeMonth = monthOptions.find(m => m.value === selectedMonthYear)?.month || '01'
  const activeYear = monthOptions.find(m => m.value === selectedMonthYear)?.year || '2026'

  const { budgets, loading, error, saveBudget, deleteBudget } = useBudgets(user?.id, activeMonth, activeYear)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('Food')
  const [newLimit, setNewLimit] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // Inline banner states for confirmation and status messages
  const [showConfirmBanner, setShowConfirmBanner] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Calculate actual spending per category strictly for the selected month/year
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {}
    CATEGORIES.forEach(cat => { spending[cat] = 0 })

    ;((expenses as Expense[]) || []).forEach((exp: Expense) => {
      const expDate = new Date(exp.date)
      const expMonth = (expDate.getMonth() + 1).toString().padStart(2, '0')
      const expYear = expDate.getFullYear().toString()

      if (expMonth === activeMonth && expYear === activeYear) {
        const cat = exp.category || 'Other'
        const amount = Number(exp.amount || 0)
        spending[cat] = (spending[cat] || 0) + amount
      }
    })

    return spending
  }, [expenses, activeMonth, activeYear])

  // Calculate Historical Category Averages (Rolling Averages across past logged months)
  const projectedCategoryAverages = useMemo(() => {
    const totals: Record<string, number> = {}
    const activeMonthsPerCategory: Record<string, Set<string>> = {}

    CATEGORIES.forEach(cat => {
      totals[cat] = 0
      activeMonthsPerCategory[cat] = new Set()
    })

    ;((expenses as Expense[]) || []).forEach((exp: Expense) => {
      const expDate = new Date(exp.date)
      const expMonth = (expDate.getMonth() + 1).toString().padStart(2, '0')
      const expYear = expDate.getFullYear().toString()
      const yearMonthKey = `${expYear}-${expMonth}`

      if (yearMonthKey !== `${activeYear}-${activeMonth}`) {
        const cat = exp.category || 'Other'
        const amount = Number(exp.amount || 0)
        if (totals[cat] !== undefined) {
          totals[cat] += amount
          activeMonthsPerCategory[cat].add(yearMonthKey)
        }
      }
    })

    const averages: Record<string, number> = {}
    CATEGORIES.forEach(cat => {
      const monthsCount = activeMonthsPerCategory[cat].size
      averages[cat] = monthsCount > 0 ? Math.round(totals[cat] / monthsCount) : 0
    })

    return averages
  }, [expenses, activeMonth, activeYear])

  // Step 1: Trigger inline confirmation banner for auto-fill
  const handleInitiateAutoFill = () => {
    setStatusMessage(null)
    setShowConfirmBanner(true)
  }

  // Step 2: Execute actual application after user clicks "Confirm" in the inline banner
  const handleConfirmAutoFill = async () => {
    setShowConfirmBanner(false)
    setIsAutoFilling(true)
    try {
      for (const cat of CATEGORIES) {
        const suggestedLimit = projectedCategoryAverages[cat] || 0
        await saveBudget({
          category: cat,
          monthly_limit: suggestedLimit
        })
      }
      setStatusMessage({ type: 'success', text: 'Suggested budget limits successfully applied for this month!' })
    } catch (err) {
      console.error('Error applying suggested budgets:', err)
      setStatusMessage({ type: 'error', text: 'Failed to apply suggested budgets. Please try again.' })
    } finally {
      setIsAutoFilling(false)
    }
  }

  // Handle Reset / Delete All Budgets for the active month
  const handleResetAllBudgets = async () => {
    if (!confirm('Are you sure you want to clear all budget limits for this month?')) return

    setStatusMessage(null)
    setIsResetting(true)
    try {
      for (const budget of budgets) {
        if (budget.id) {
          await deleteBudget(budget.id as string)
        }
      }
      setStatusMessage({ type: 'success', text: 'All budget limits for this month have been reset successfully.' })
    } catch (err) {
      console.error('Error resetting budgets:', err)
      setStatusMessage({ type: 'error', text: 'Failed to reset budgets. Please try again.' })
    } finally {
      setIsResetting(false)
    }
  }

  // Calculate Total Budget Allocated vs Total Spent
  const totalAllocatedBudget = useMemo(() => {
    return budgets.reduce((acc, b) => acc + Number(b.monthly_limit || 0), 0)
  }, [budgets])

  const totalMonthlySpent = useMemo(() => {
    return Object.values(categorySpending).reduce((acc, val) => acc + val, 0)
  }, [categorySpending])

  const remainingSavingsPotential = estimatedMonthlyIncome - totalAllocatedBudget

  const handleOpenModal = (category: string) => {
    setSelectedCategory(category)
    const existing = budgets.find((b: Record<string, unknown>) => b.category === category)
    setNewLimit(existing ? String(existing.monthly_limit || '') : '')
    setIsModalOpen(true)
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLimit) return alert('Please enter a budget limit')

    setIsSubmitting(true)
    try {
      await saveBudget({
        category: selectedCategory,
        monthly_limit: Number(newLimit)
      })

      setIsModalOpen(false)
      setNewLimit('')
      setStatusMessage({ type: 'success', text: `Budget for ${selectedCategory} updated successfully!` })
    } catch (err: unknown) {
      console.error('Error saving budget:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save budget.'
      setStatusMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBudget = async (category: string) => {
    try {
      const existing = budgets.find((b: Record<string, unknown>) => b.category === category)
      if (existing && existing.id) {
        await deleteBudget(existing.id as string)
        setStatusMessage({ type: 'success', text: `Budget for ${category} removed successfully.` })
      }
    } catch (err) {
      console.error('Error deleting budget:', err)
      setStatusMessage({ type: 'error', text: 'Failed to delete budget.' })
    }
  }

  if (loading) return <div className="text-center py-12">Loading budgets...</div>
  if (error) return <div className="text-center text-red-600 py-12">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category Budgets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track your spending limits per month</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAllBudgets}
            disabled={isResetting || budgets.length === 0}
            className="bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs px-3.5 py-2 rounded-xl border border-red-200 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            title="Clear all budget limits for this month"
          >
            <span>🗑️</span> {isResetting ? 'Resetting...' : 'Reset All'}
          </button>

          <button
            onClick={handleInitiateAutoFill}
            disabled={isAutoFilling || showConfirmBanner}
            className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium text-xs px-3.5 py-2 rounded-xl border border-brand-200 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>✨</span> {isAutoFilling ? 'Applying...' : 'Auto-Fill from History'}
          </button>
          
          <select
            value={selectedMonthYear}
            onChange={(e) => {
              setSelectedMonthYear(e.target.value)
              setStatusMessage(null)
              setShowConfirmBanner(false)
            }}
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inline Confirmation Prompt Banner */}
      {showConfirmBanner && (
        <div className="p-4 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          <span className="font-medium">
            Are you sure you want to automatically set budget limits for this month based on your historical spending averages?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleConfirmAutoFill}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowConfirmBanner(false)}
              className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline Status Message Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between border shadow-sm ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{statusMessage.text}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-semibold text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Revenue</span>
          <div className="text-2xl font-bold text-slate-900">₹{estimatedMonthlyIncome.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Total monthly cash inflows</div>
        </div>
        <div className="space-y-1 sm:border-x sm:border-slate-100 sm:px-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Allocated Budget</span>
          <div className="text-2xl font-bold text-brand-600">₹{totalAllocatedBudget.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Actual Outflow: ₹{totalMonthlySpent.toLocaleString()}</div>
        </div>
        <div className="space-y-1 sm:pl-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Net Savings</span>
          <div className={`text-2xl font-bold ${remainingSavingsPotential >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ₹{remainingSavingsPotential.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Revenue minus allocated limits</div>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => {
          const budgetItem = budgets.find((b: Record<string, unknown>) => b.category === cat)
          const limit = budgetItem ? Number(budgetItem.monthly_limit || 0) : 0
          const spent = categorySpending[cat] || 0
          const projectedAvg = projectedCategoryAverages[cat] || 0
          const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0
          const isOverBudget = limit > 0 && spent > limit

          return (
            <div key={cat} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{cat}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(cat)}
                      className="px-2.5 py-1 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      {limit > 0 ? 'Edit' : 'Set Budget'}
                    </button>
                    {limit > 0 && (
                      <button
                        onClick={() => handleDeleteBudget(cat)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Budget"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-500">Spent: <strong className="text-slate-800">₹{spent.toLocaleString()}</strong></span>
                  <span className="text-slate-500">Limit: <strong className="text-slate-800">₹{limit.toLocaleString()}</strong></span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      isOverBudget ? 'bg-red-500' : percentage > 85 ? 'bg-amber-500' : 'bg-brand-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>{percentage}% utilized</span>
                  {isOverBudget && <span className="text-red-600 font-semibold">Over Budget!</span>}
                </div>
                {limit === 0 && projectedAvg > 0 && (
                  <div className="bg-brand-50/60 text-brand-700 px-2 py-1 rounded-lg font-medium text-[11px] flex items-center justify-between">
                    <span>Suggested Limit based on past 3 months:</span>
                    <strong className="font-bold">₹{projectedAvg.toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Set / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Budget for {selectedCategory}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Limit Amount (₹) {projectedCategoryAverages[selectedCategory] ? `(Suggested avg: ₹${projectedCategoryAverages[selectedCategory].toLocaleString()})` : ''}
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 5000"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}