import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Expense } from '@/types/expense'

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  currency: string // 💡 Strict type constraint forcing synchronization
}

export function ExpenseList({ expenses, onEdit, onDelete, currency }: ExpenseListProps) {
  
  // 💸 Localized currency format handler engine
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency || 'INR'
    }).format(amount)
  }

  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden mt-6">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        
        <tbody className="divide-y divide-slate-100 bg-white">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-slate-50/30 transition">
              <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                {new Date(expense.date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                {expense.description}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                  {expense.category}
                </span>
              </td>
              
              {/* 🎯 Automatically formats instantly via props state updates */}
              <td className="px-6 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formatCurrency(expense.amount)}
              </td>

              <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap space-x-2">
                <button 
                  onClick={() => onEdit(expense)} 
                  className="text-slate-400 hover:text-slate-600 inline-flex p-1"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => onDelete(expense.id)} 
                  className="text-slate-400 hover:text-red-600 inline-flex p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
