import React from 'react'
import type { ExpenseCategory } from '@/types/expense'

interface BudgetProgressProps {
  category: ExpenseCategory
  spent: number
  allocated: number
  currency: string
}

export function BudgetProgress({ category, spent, allocated, currency }: BudgetProgressProps) {
  const percentage = allocated > 0 ? (spent / allocated) * 100 : 0
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // 💡 Compute indicators dynamically (80%+ warning, 100%+ exceeded)
  let progressBarColor = 'bg-emerald-500'
  let textColor = 'text-slate-700'
  let badgeText = ''

  if (percentage >= 100) {
    progressBarColor = 'bg-rose-500'
    textColor = 'text-rose-700 font-semibold'
    badgeText = 'Exceeded'
  } else if (percentage >= 80) {
    progressBarColor = 'bg-amber-500'
    textColor = 'text-amber-700 font-medium'
    badgeText = 'Warning'
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-slate-900 capitalize">{category}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatCurrency(spent)} of {formatCurrency(allocated)} spent
          </p>
        </div>
        <div className="text-right">
          <span className={`text-sm ${textColor}`}>{percentage.toFixed(0)}%</span>
          {badgeText && (
            <span className={`block text-[10px] uppercase tracking-wider font-bold mt-0.5 ${percentage >= 100 ? 'text-rose-500' : 'text-amber-500'}`}>
              {badgeText}
            </span>
          )}
        </div>
      </div>

      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}