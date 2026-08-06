import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Session } from '@supabase/supabase-js'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { BudgetsPage } from '@/pages/BudgetsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LoginPage } from '@/pages/LoginPage'
import { Insights } from '@/pages/Insights' 
import { OnboardingModal } from '@/components/OnboardingModal'
import { supabase } from '@/lib/supabase'

function MainLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [expenses, setExpenses] = useState([]) 
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0)
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsAuthenticated(!!session)
      if (session) fetchUserData(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsAuthenticated(!!session)
      if (session) {
        fetchUserData(session.user.id)
      } else {
        setMonthlyIncome(0)
        setIsProfileComplete(null)
        setExpenses([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchUserData(userId: string) {
    try {
      const { data: expenseData } = await supabase.from('expenses').select('*').eq('user_id', userId)
      if (expenseData) setExpenses(expenseData as [])

      // Fetch profile data including onboarding status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('monthly_income, onboarding_completed')
        .eq('user_id', userId)
        .single()

      if (profileData) {
        setMonthlyIncome(profileData.monthly_income || 0)
        // If onboarding_completed is true, they have already finished it. 
        // If it's false/null/missing, they need onboarding.
        setIsProfileComplete(profileData.onboarding_completed === true)
      } else {
        setIsProfileComplete(false)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      setIsProfileComplete(false)
    }
  }

  if (isAuthenticated === null || (isAuthenticated && isProfileComplete === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-medium">
        Loading session...
      </div>
    )
  }

  return (
    <>
      {/* Show Onboarding Modal overlay ONLY if authenticated AND onboarding has NOT been completed yet */}
      {isAuthenticated && session && isProfileComplete === false && (
        <OnboardingModal 
          userId={session.user.id} 
          onComplete={() => {
            setIsProfileComplete(true) // Hides modal immediately upon successful submission
          }} 
        />
      )}

      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />

        {/* Protected Dashboard Routes */}
        <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/insights" element={<Insights expenses={expenses} monthlyIncome={monthlyIncome} />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  )
}

export default App