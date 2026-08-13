// src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useExpenses } from '@/hooks/useExpenses'
import { supabase } from '@/lib/supabase'

type ProfileView = 'menu' | 'edit' | 'insights' | 'currency' | 'export_confirm' | 'privacy'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const { expenses } = useExpenses(user?.id)
  
  const [currentView, setCurrentView] = useState<ProfileView>('menu')

  // Date selection states
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())

  // Form states
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [occupation, setOccupation] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Security States
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Fetch current details from Supabase
  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (data) {
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setOccupation(data.occupation || '')
        setMonthlyIncome(data.monthly_income || '')
        setCurrency(data.currency || 'INR')
      }
    }
    loadProfile()
  }, [user?.id])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    const userId = user.id

    try {
      setLoading(true)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          full_name: fullName,
          phone: phone,
          occupation: occupation,
          monthly_income: Number(monthlyIncome),
          currency: currency,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (error) throw error

      setCurrentView('menu')
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Password Reset Request
  const handlePasswordReset = async () => {
    if (!user?.email) return
    try {
      setResetLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin
      })
      if (error) throw error
      setPasswordResetSent(true)
    } catch (err) {
      console.error('Failed to trigger reset email:', err)
      alert('Could not send password reset email. Please try again later.')
    } finally {
      setResetLoading(false)
    }
  }

  // Handle Account Data Deletion
  const handleDeleteAccount = async () => {
    if (!user?.id) return
    const userId = user.id

    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      alert('Please type "DELETE" to confirm account deletion.')
      return
    }

    try {
      setDeleting(true)

      // 1. Delete user expenses from database
      const { error: expError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', userId)

      if (expError) console.error('Error purging expenses:', expError)

      // 2. Delete user profile
      const { error: profError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId)

      if (profError) console.error('Error purging profile:', profError)

      // 3. Log out user
      await signOut()
      alert('Your data has been successfully deleted.')
    } catch (err) {
      console.error('Error during deletion:', err)
      alert('Failed to delete account data. Please contact support.')
    } finally {
      setDeleting(false)
    }
  }

  // --- CSV Export Engine ---
  const triggerExport = (mode: 'selected' | 'all') => {
    let recordsToExport = expenses || []

    if (mode === 'selected') {
      recordsToExport = recordsToExport.filter((exp) => {
        const expDate = new Date(exp.date)
        return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear
      })
    }

    if (recordsToExport.length === 0) {
      alert(
        mode === 'selected'
          ? `No expenses found for ${MONTH_NAMES[selectedMonth]} ${selectedYear}!`
          : 'No expenses found to export!'
      )
      return
    }

    try {
      setExporting(true)
      const headers = ['Date', 'Category', 'Description', `Amount (${currency})`]
      const rows = recordsToExport.map((exp) => [
        `"${exp.date}"`,
        `"${exp.category}"`,
        `"${(exp.description || '').replace(/"/g, '""')}"`,
        exp.amount
      ])

      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      const fileName =
        mode === 'selected'
          ? `Expenses_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`
          : `Expenses_All_Time_${new Date().toISOString().split('T')[0]}.csv`

      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setCurrentView('menu')
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export expenses.')
    } finally {
      setExporting(false)
    }
  }

  // --- Calculations for Monthly Insights ---
  const filteredExpenses = (expenses || []).filter((exp) => {
    const expDate = new Date(exp.date)
    return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear
  })

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const incomeNum = Number(monthlyIncome) || 0
  const netSavings = incomeNum - totalSpent
  const savingsRate = incomeNum > 0 ? Math.max(0, Math.round((netSavings / incomeNum) * 100)) : 0

  const categoryTotals: Record<string, number> = {}
  filteredExpenses.forEach((exp) => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount
  })

  // Force explicit type casting using 'as'
  let topCategory = null as { name: string; amount: number } | null
  let maxAmount = 0
  
  Object.entries(categoryTotals).forEach(([cat, amt]) => {
    if (amt > maxAmount) {
      maxAmount = amt
      topCategory = { name: cat, amount: amt }
    }
  })
  
  const spentRatio = incomeNum > 0 ? (totalSpent / incomeNum) * 100 : 0
  let healthStatus = 'Healthy'
  let healthColor = 'text-emerald-600 bg-emerald-50 border-emerald-200'

  if (spentRatio > 100) {
    healthStatus = 'Critical'
    healthColor = 'text-rose-600 bg-rose-50 border-rose-200'
  } else if (spentRatio >= 75) {
    healthStatus = 'Moderate'
    healthColor = 'text-amber-600 bg-amber-50 border-amber-200'
  }

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile & Settings</h1>
        <p className="text-sm text-slate-600">Manage your profile details and preferences</p>
      </div>

      {/* ------------------ VIEW 1: MAIN MENU ------------------ */}
      {currentView === 'menu' && (
        <div className="space-y-3">
          <div 
            onClick={() => setCurrentView('edit')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Personal Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">Edit name, occupation, phone, and income</p>
            </div>
            <span className="text-emerald-600 font-medium text-xs">Edit →</span>
          </div>

          <div 
            onClick={() => setCurrentView('insights')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Monthly Summary & Insights</h3>
              <p className="text-xs text-slate-500 mt-0.5">Check savings rate, net balance, and health status</p>
            </div>
            <span className="text-emerald-600 font-medium text-xs">View →</span>
          </div>

          <div 
            onClick={() => setCurrentView('currency')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Currency & Display</h3>
              <p className="text-xs text-slate-500 mt-0.5">Change primary currency symbol ({currencySymbol} {currency})</p>
            </div>
            <span className="text-emerald-600 font-medium text-xs">Change →</span>
          </div>

          <div 
            onClick={() => setCurrentView('export_confirm')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Export Expenses (CSV)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Choose date range and download spreadsheet</p>
            </div>
            <span className="text-emerald-600 font-medium text-xs">Configure →</span>
          </div>

          <div 
            onClick={() => setCurrentView('privacy')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Account Privacy & Access</h3>
              <p className="text-xs text-slate-500 mt-0.5">Security, password reset, and account deletion</p>
            </div>
            <span className="text-emerald-600 font-medium text-xs">Manage →</span>
          </div>
        </div>
      )}

      {/* ------------------ VIEW 2: ACCOUNT PRIVACY & ACCESS ------------------ */}
      {currentView === 'privacy' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base">Account Privacy & Access</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control password, active sessions, and data deletion</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Logged Account Session</span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-800">{user?.email || 'Authenticated User'}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700">Security & Authentication</h3>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-medium text-slate-800 block">Change Password</span>
                <span className="text-xs text-slate-500">Send password recovery link to your registered email</span>
              </div>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading || passwordResetSent}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : passwordResetSent ? 'Link Sent ✓' : 'Send Link'}
              </button>
            </div>
            {passwordResetSent && (
              <p className="text-[11px] text-emerald-600 font-medium px-1">
                ✓ Password reset email sent to {user?.email}. Check your inbox or spam folder.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-rose-600">Danger Zone</h3>

            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between p-3.5 bg-rose-50/50 rounded-xl border border-rose-200">
                <div>
                  <span className="text-xs font-semibold text-rose-800 block">Delete Account & Data</span>
                  <span className="text-xs text-rose-600/80">Permanently wipe all logged expenses and profile records</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition"
                >
                  Delete Data
                </button>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-rose-800 block">⚠️ Are you absolutely sure?</span>
                <p className="text-xs text-rose-700">
                  This action is permanent and cannot be undone. Type <strong className="font-bold uppercase">DELETE</strong> below to confirm.
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-rose-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting ? 'Purging...' : 'Confirm Permanent Deletion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="px-3 bg-white border border-slate-300 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('menu')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl transition text-sm mt-4"
          >
            ← Back to Menu
          </button>
        </div>
      )}

      {/* ------------------ VIEW 3: EXPORT EXPENSES (CSV) ------------------ */}
      {currentView === 'export_confirm' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base">Select Export Scope</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose which time period you want to export to CSV</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Active Target Month:</span>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={exporting}
              onClick={() => triggerExport('selected')}
              className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 text-left transition"
            >
              <span className="font-semibold text-slate-800 text-xs block">
                Export Selected Month
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Only download records for {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={() => triggerExport('all')}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400 text-left transition"
            >
              <span className="font-semibold text-slate-800 text-xs block">
                Export All Time History
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Download all recorded expenses across every month
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('menu')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl transition text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ------------------ VIEW 4: MONTHLY INSIGHTS ------------------ */}
      {currentView === 'insights' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Monthly Health & Insights</h2>
              <p className="text-xs text-slate-500">Auto-detected summary for your recorded expenses</p>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium block">Monthly Income</span>
              <span className="text-lg font-bold text-slate-800 mt-1 block">
                {currencySymbol}{incomeNum.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium block">Total Spent</span>
              <span className="text-lg font-bold text-slate-800 mt-1 block">
                {currencySymbol}{totalSpent.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium block">Net Savings</span>
              <span className={`text-lg font-bold mt-1 block ${netSavings < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {currencySymbol}{netSavings.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Financial Health Status</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${healthColor}`}>
                {healthStatus}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Income Saved</span>
                <span className="font-semibold text-slate-700">{savingsRate}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, savingsRate)}%` }}
                />
              </div>
            </div>

            {topCategory && (
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                <span className="text-slate-500">Top Expense Category:</span>
                <span className="font-semibold text-slate-800">
                  {topCategory.name} ({currencySymbol}{topCategory.amount.toLocaleString()})
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('menu')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl transition text-sm"
          >
            ← Back to Menu
          </button>
        </div>
      )}

      {/* ------------------ VIEW 5: CURRENCY SETTINGS ------------------ */}
      {currentView === 'currency' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Currency Preferences</h2>
              <p className="text-xs text-slate-500 mt-0.5">Choose your default currency symbol for all figures across the app</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Select Active Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Saving...' : 'Save Preference'}
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-xl transition text-sm"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------ VIEW 6: EDIT PROFILE ------------------ */}
      {currentView === 'edit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Edit Personal Information</h2>
            <button 
              type="button"
              onClick={() => setCurrentView('menu')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Contact</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Occupation Domain</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Baseline Monthly Income</label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition duration-150 disabled:opacity-50 text-sm"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-xl transition duration-150 text-sm"
              >
                Back to Menu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}