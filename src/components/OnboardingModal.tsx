import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OnboardingModalProps {
  userId: string
  onComplete: () => void
}

export function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [occupation, setOccupation] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericIncome = parseFloat(monthlyIncome)

    if (isNaN(numericIncome) || numericIncome <= 0) {
      setError('Please enter a valid monthly income greater than 0.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          { 
            user_id: userId, 
            full_name: fullName,
            phone: phone,
            occupation: occupation,
            monthly_income: numericIncome,
            currency: currency, 
            onboarding_completed: true, 
            updated_at: new Date() 
          },
          { onConflict: 'user_id' }
        )

      if (upsertError) throw upsertError

      onComplete()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error saving profile:', errorMessage)
      setError('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
        <div className="mb-5 border-b border-slate-100 pb-3">
          <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
          <p className="text-xs text-slate-500 mt-0.5">Please set up your profile details to get started.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder=""
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Phone Contact
            </label>
            <input
              type="text"
              placeholder=""
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Occupation Domain
            </label>
            <input
              type="text"
              placeholder=""
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
                <option value="CAD">$ CAD</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Monthly Income
              </label>
              <input
                type="number"
                required
                placeholder=""
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? 'Saving Profile...' : 'Save & Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}