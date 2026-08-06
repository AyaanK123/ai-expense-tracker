import React, { useState } from 'react'
import { X, PlusCircle, Sparkles } from 'lucide-react'

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: { title: string; amount: number; category: string; date: string }) => void;
}

// Smart keyword detector for auto-categorization


export function AddExpenseModal({ isOpen, onClose, onAddExpense }: AddExpenseModalProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isAutoCategorized, setIsAutoCategorized] = useState(false)

  if (!isOpen) return null

  // Handle title input and trigger smart auto-categorization
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    
    const predicted = detectCategory(val)
    if (predicted !== 'Other') {
      setCategory(predicted)
      setIsAutoCategorized(true)
    } else {
      setIsAutoCategorized(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !amount) return

    onAddExpense({
      title,
      amount: parseFloat(amount),
      category,
      date,
    })

    // Reset fields & close
    setTitle('')
    setAmount('')
    setCategory('Food')
    setIsAutoCategorized(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-base">Add New Expense</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Description / Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g., Uber ride, Groceries from supermarket" 
              value={title}
              onChange={handleTitleChange}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Amount (₹)</label>
              <input 
                type="number" 
                required
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
                {isAutoCategorized && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-3 h-3" /> Auto
                  </span>
                )}
              </div>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800">
  <option value="Food">Food</option>
  <option value="Entertainment">Entertainment</option>
  <option value="Shopping">Shopping</option>
  <option value="Bills">Bills</option>
  <option value="Other">Other</option>
</select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Date</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-colors"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}