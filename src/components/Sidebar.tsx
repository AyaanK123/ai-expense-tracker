import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Receipt, 
  PiggyBank, 
  TrendingUp, 
  User, 
  LogOut,
  Zap,
  Menu,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function Sidebar() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Budgets', path: '/budgets', icon: PiggyBank },
    { label: 'Insights', path: '/insights', icon: TrendingUp }, // <-- Added Insights Tab
    { label: 'Profile', path: '/profile', icon: User },
  ]

  const handleSignOut = async () => {
    try {
      setIsOpen(false)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigate('/login')
    } catch (err: unknown) {
      console.error('Error signing out:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out'
      alert(errorMessage)
    }
  }

  return (
    <>
      {/* Mobile Header Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between bg-[#0B132B] text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">AI Expense Tracker</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B132B] min-h-screen flex flex-col justify-between p-4 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight">AI Expense Tracker</h1>
              <p className="text-xs text-slate-400">Personal Finance</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const IconComponent = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)} // Close sidebar on mobile item click
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <IconComponent className="w-5 h-5 stroke-[1.75]" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Sign Out Button */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-5 h-5 stroke-[1.75]" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar