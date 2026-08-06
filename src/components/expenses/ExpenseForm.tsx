import { useState } from 'react'
import { format } from 'date-fns'
import { Sparkles } from 'lucide-react'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseFormData } from '@/types/expense'
import { categorizeExpense } from '@/lib/categorize'


interface ExpenseFormProps {
  initialData?: Expense
  onSubmit: (data: ExpenseFormData) => Promise<void>
  onCancel: () => void
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Shopping: [
    'cloths', 'clothes', 'clothing', 'shirt', 'tshirt', 'jeans', 'pant', 'dress', 'shoes', 'sneakers',
    'shop', 'shopping', 'mall', 'amazon', 'myntra', 'flipkart', 'ajio', 'meesho', 'bag', 'watch',
    'makeup', 'skincare', 'perfume', 'gadget', 'phone', 'laptop', 'electronics', 'gift', 'birthday',
    'jewellery', 'jewelry', 'gold', 'silver', 'diamond', 'ring', 'necklace', 'watch', 'accessories'
  ],
  Food: [
    'groceries', 'grocery', 'vegetable', 'vegetables', 'fruit', 'fruits', 'milk', 'egg', 'eggs', 'bread',
    'lunch', 'dinner', 'breakfast', 'brunch', 'cafe', 'coffee', 'starbucks', 'restaurant', 'swiggy', 
    'zomato', 'pizza', 'burger', 'subway', 'kfc', 'mcdonald', 'snack', 'snacks', 'tea', 'chai', 'maggi',
    'chicken', 'mutton', 'meat', 'fish', 'supermarket', 'mart', 'blinkit', 'zepto', 'instamart'
  ],
  Transport: [
    'uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'metro', 'train', 'flight', 'bus', 'ticket', 'tickets',
    'petrol', 'diesel', 'fuel', 'cng', 'parking', 'toll', 'irctc', 'travel', 'trip', 'hotel', 'stay', 'vacation'
  ],
  Bills: [
    'rent', 'electricity', 'power', 'water', 'gas', 'cylinder', 'recharge', 'jio', 'airtel', 'vi', 'wifi', 
    'broadband', 'internet', 'renovation', 'netflix', 'spotify', 'subscription', 'insurance', 'policy', 'emi', 'loan'
  ],
  Entertainment: [
    'movie', 'movies', 'cinema', 'theatre', 'pvr', 'inox', 'bookmyshow', 'concert', 'event', 'club', 'pub',
    'party', 'bar', 'beer', 'drinks', 'bowling', 'gaming'
  ],
  Medical: [
    'doctor', 'hospital', 'clinic', 'medicine', 'medicines', 'pharmacy', 'tablet', 'checkup', 'test', 'lab'
  ]
};

export function ExpenseForm({ initialData, onSubmit, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [category, setCategory] = useState(initialData?.category ?? 'Other')
  const [date, setDate] = useState(
    initialData?.date ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [loading, setLoading] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCategorize = async () => {
    if (!description.trim() || !amount) return

    setCategorizing(true)
    try {
      const result = await categorizeExpense(description, parseFloat(amount))
      setCategory(result)
    } catch {
      setError('Failed to categorize expense')
    } finally {
      setCategorizing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount')
      setLoading(false)
      return
    }

    try {
      await onSubmit({
        amount: parsedAmount,
        description: description.trim(),
        category,
        date,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label htmlFor="description" className="label">
          Description
        </label>
        <div className="flex gap-2">
         <input
  type="text"
  placeholder="e.g. Lunch at cafe"
  value={description}
  onChange={(e) => {
    const text = e.target.value;
    setDescription(text); // Keep your original state call

    // Clean up input and split into clean individual words
    const lowerText = text.toLowerCase().trim();
    if (!lowerText) return;

    // Use a regex split to clear out punctuation and spaces cleanly
    const wordsInput = lowerText.split(/[\s,.!?]+/);

    let matchedCategory = 'Other';

    // Find if an exact standalone word matches our dataset
    for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matchFound = keywords.some(keyword => 
        wordsInput.includes(keyword) || lowerText === keyword
      );
      
      if (matchFound) {
        matchedCategory = categoryName;
        break; // Stop running once we secure our category match
      }
    }

    // Automatically change the selector to the right category match
    setCategory(matchedCategory);
  }}
  className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 ..."
/>
          <button
            type="button"
            onClick={handleCategorize}
            disabled={categorizing || !description.trim() || !amount}
            className="btn-secondary shrink-0 gap-1.5"
            title="AI categorize"
          >
            <Sparkles className="h-4 w-4" />
            {categorizing ? '...' : 'AI'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="date" className="label">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="label">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="input-field"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : initialData ? 'Update' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
