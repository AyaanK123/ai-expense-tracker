import { AlertTriangle, TrendingDown, ArrowUpRight } from 'lucide-react'

interface DeficitAlertBannerProps {
  income: number;
  totalExpenses: number;
  selectedMonth: string;
  selectedYear: string;
}

export function DeficitAlertBanner({ 
  income, 
  totalExpenses, 
  selectedMonth, 
  selectedYear 
}: DeficitAlertBannerProps) {
  // Only trigger if expenses exceed income
  const isDeficit = totalExpenses > income
  if (!isDeficit) return null

  const deficitAmount = totalExpenses - income
  const overspentPercentage = income > 0 ? Math.round((deficitAmount / income) * 100) : 100

  return (
    <div className="bg-rose-50/95 border border-rose-200/80 rounded-2xl p-5 shadow-sm space-y-3 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-rose-900 text-sm tracking-tight">Monthly Budget Deficit Detected</h3>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full">
                +{overspentPercentage}% Over Income
              </span>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">
              Your expenses for {selectedMonth} {selectedYear} have exceeded your total monthly income by <span className="font-bold">₹{deficitAmount.toLocaleString()}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs font-medium text-rose-800 bg-white/80 px-3 py-1.5 rounded-xl border border-rose-200/50">
            Income: ₹{income.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-rose-900 bg-rose-100 px-3 py-1.5 rounded-xl">
            Spent: ₹{totalExpenses.toLocaleString()}
          </span>
        </div>
      </div>

      {/* AI Recovery Recommendation Sub-Bar */}
      <div className="pt-2.5 border-t border-rose-200/60 flex items-center justify-between text-xs text-rose-800">
        <div className="flex items-center gap-1.5 font-medium">
          <TrendingDown className="w-4 h-4 text-rose-600" />
          <span><strong>AI Financial Tip:</strong> Consider trimming non-essential category limits or reallocating savings to cover the shortfall.</span>
        </div>
        <button 
          onClick={() => alert('AI Recovery Plan: Review your top spending category and cut back by 15% next week.')}
          className="hidden sm:inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 transition-colors shrink-0"
        >
          <span>View Recovery Plan</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default DeficitAlertBanner