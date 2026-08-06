import React, { useState } from 'react'
import type { ExpenseCategory } from '@/types/expense'

interface BudgetFormProps {
  onSubmit: (data: { category: ExpenseCategory; amount: number }) => Promise<void>
  categories: ExpenseCategory[]
}

export function BudgetForm({ onSubmit, categories }: BudgetFormProps) {
  const [category, setCategory] = useState<ExpenseCategory>(categories[0])
  const [limit, setLimit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!limit || submitting) return

    try {
      setSubmitting(true)
      
      // 💡 Sends 'amount' directly so your hook catches it seamlessly
      await onSubmit({
        category,
        amount: Number(limit)
      })
      
      setLimit('') // Clear input box on success
    } catch (err) {
      console.error("❌ Form Submission Failed:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-1 w-full space-y-1.5">
        <label className="text-xs font-semibold text-slate-600">Category Select</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 w-full space-y-1.5">
        <label className="text-xs font-semibold text-slate-600">Target Limit Amount</label>
        <input
          type="number"
          placeholder="e.g. 5000"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors duration-150 disabled:opacity-50 whitespaces-nowrap"
      >
        {submitting ? 'Saving...' : 'Set Category Budget'}
      </button>
    </form>
  )
}