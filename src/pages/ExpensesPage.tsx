import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useExpenses } from '@/hooks/useExpenses'
import { supabase } from '@/lib/supabase'

export function ExpensesPage() {
  const { user } = useAuth()
  const { expenses, loading, error } = useExpenses(user?.id)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('date-desc')
  
  // Date State
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())

  // Add Expense Modal State & Receipt Scanning States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState('Shopping')
  const [newDate, setNewDate] = useState(currentDate.toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Receipt States
  const [isScanning, setIsScanning] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState('')

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ]

  // Handle Receipt Upload & AI OCR Parsing
  const handleScanReceipt = async (file: File) => {
    setIsScanning(true)
    try {
      const fileName = `${user?.id || 'anon'}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      const uploadedUrl = publicUrlData.publicUrl
      setReceiptUrl(uploadedUrl)

      // Invoke Supabase Edge Function
      const { data: extractedData, error: functionError } = await supabase.functions.invoke('categorize-expense', {
        body: { imageUrl: uploadedUrl }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Error calling AI categorization function')
      }

      // Auto-fill form state fields
      if (extractedData?.amount) setNewAmount(String(extractedData.amount))
      if (extractedData?.category) setNewCategory(extractedData.category)
      if (extractedData?.date) setNewDate(extractedData.date)
      if (extractedData?.merchant) setNewTitle(extractedData.merchant)

    } catch (err: unknown) {
      console.error('Error scanning receipt:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      alert(`Could not automatically read the receipt: ${errorMessage}. Please fill details manually.`)
    } finally {
      setIsScanning(false)
    }
  }

  // Auto-Categorization Helper function
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setNewTitle(text)
    const lowerText = text.toLowerCase()
    
    let matchedCategory = 'Other'

    if (!lowerText) {
      setNewCategory(matchedCategory)
      return
    }

    if (['food', 'lunch', 'dinner', 'grocery', 'milk', 'fruit', 'brunch', 'cafe', 'coffee', 'restaurant'].some(k => lowerText.includes(k))) {
      matchedCategory = 'Food'
    } else if (['electricity', 'water', 'wifi', 'bill', 'utility', 'power', 'rent', 'apartment', 'fees'].some(k => lowerText.includes(k))) {
      matchedCategory = 'Bills'
    } else if (['netflix', 'spotify', 'movie', 'show', 'workshop', 'concert'].some(k => lowerText.includes(k))) {
      matchedCategory = 'Entertainment'
    } else if (['shop', 'machine', 'amazon', 'flipkart', 'clothes', 'zara', 'jacket'].some(k => lowerText.includes(k))) {
      matchedCategory = 'Shopping'
    }

    setNewCategory(matchedCategory)
  }

  // Filter & Sort Logic
  const filteredAndSortedExpenses = useMemo(() => {
    const list = (expenses || []).filter((exp: Record<string, unknown>) => {
      const expDate = new Date(exp.date as string)
      const expMonth = (expDate.getMonth() + 1).toString().padStart(2, '0')
      const expYear = expDate.getFullYear().toString()

      const matchesDate = expMonth === selectedMonth && expYear === selectedYear
      const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory
      
      const title = String(exp.title || exp.description || '').toLowerCase()
      const matchesSearch = title.includes(searchQuery.toLowerCase())

      return matchesDate && matchesCategory && matchesSearch
    })

    return list.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      if (sortBy === 'date-desc') return new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
      if (sortBy === 'date-asc') return new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
      if (sortBy === 'amount-desc') return Number(b.amount || 0) - Number(a.amount || 0)
      if (sortBy === 'amount-asc') return Number(a.amount || 0) - Number(b.amount || 0)
      return 0
    })
  }, [expenses, selectedMonth, selectedYear, selectedCategory, searchQuery, sortBy])

  const filteredTotal = useMemo(() => {
    return filteredAndSortedExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  }, [filteredAndSortedExpenses])

  // Handle Add Expense Submit
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newAmount || !newDate) {
      alert('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update({
            description: newTitle,
            amount: Number(newAmount),
            category: newCategory,
            date: newDate,
            receipt_url: receiptUrl || null,
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('expenses').insert([
          {
            user_id: user?.id,
            description: newTitle,
            amount: Number(newAmount),
            category: newCategory,
            date: newDate,
            receipt_url: receiptUrl || null,
          },
        ])

        if (error) throw error
      }

      setNewTitle('')
      setNewAmount('')
      setReceiptUrl('')
      setEditingId(null)
      setIsAddModalOpen(false)
      window.location.reload()
    } catch (err: unknown) {
      console.error('Error saving expense:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save expense.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      window.location.reload()
    } catch (err) {
      console.error('Error deleting expense:', err)
    }
  }

  const handleEdit = (exp: Record<string, unknown>) => {
    setEditingId(exp.id as string)
    setNewTitle(String(exp.description || exp.title || ''))
    setNewAmount(String(exp.amount || ''))
    setNewCategory(String(exp.category || 'Food'))
    setNewDate(String(exp.date || currentDate.toISOString().split('T')[0]))
    setReceiptUrl(String(exp.receipt_url || ''))
    setIsAddModalOpen(true)
  }

  if (loading) return <div className="text-center py-12 text-slate-500 font-medium">Loading expenses...</div>
  if (error) return <div className="text-center text-red-600 py-12 font-medium">Error: {error}</div>

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and filter your transaction history</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null)
            setNewTitle('')
            setNewAmount('')
            setReceiptUrl('')
            setIsAddModalOpen(true)
          }}
          className="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-sm transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="All">All Categories</option>
          <option value="Food">Food</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Shopping">Shopping</option>
          <option value="Bills">Bills</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      {/* Monthly Total Summary Banner */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">Total Filtered Spending</span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">₹{filteredTotal.toLocaleString()}</h2>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredAndSortedExpenses.length} transaction(s)
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredAndSortedExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No expenses found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAndSortedExpenses.map((exp: Record<string, unknown>) => (
              <div key={exp.id as string} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    {String(exp.title || exp.description || 'Unnamed Expense')}
                    {exp.receipt_url && (
                      <a href={exp.receipt_url as string} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md hover:underline font-medium">
                        📄 View Receipt
                      </a>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{String(exp.date)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {String(exp.category)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{Number(exp.amount || 0).toLocaleString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(exp)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(exp.id as string)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Modal Popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Receipt Upload UI */}
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Scan Receipt with AI (Optional)
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl cursor-pointer border border-brand-200 transition-colors">
                    <span>📷 Take Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleScanReceipt(e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer border border-slate-300 transition-colors">
                    <span>📁 Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleScanReceipt(e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {isScanning && (
                  <p className="text-xs text-brand-600 font-medium text-center animate-pulse mt-1">
                    ✨ Analyzing receipt image and extracting details...
                  </p>
                )}
                {receiptUrl && !isScanning && (
                  <p className="text-xs text-green-600 font-medium text-center mt-1">
                    ✓ Receipt uploaded & parsed successfully!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description / Title / Merchant</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grocery or Store Name"
                  value={newTitle}
                  onChange={handleTitleChange}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Food">Food</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills">Bills</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpensesPage