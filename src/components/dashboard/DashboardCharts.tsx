import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Expense } from '@/types/expense'
import {
  CHART_COLORS,
  getCategorySummaries,
  getMonthlySummaries,
  getTotalSpent,
} from '@/lib/analytics'

interface DashboardChartsProps {
  expenses: Expense[]
  currency?: string 
}

export function DashboardCharts({ expenses, currency = 'INR' }: DashboardChartsProps) {
  const categoryData = getCategorySummaries(expenses)
  const monthlyData = getMonthlySummaries(expenses)
  const totalSpent = getTotalSpent(expenses)

  // 💡 Local currency formatter using the passed prop
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Early return if no data exists
  if (expenses.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-slate-500">Add expenses to see your spending analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Total spent</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Transactions</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{expenses.length}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Categories</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{categoryData.length}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Pie Chart */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Spending by category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ category, percent }) =>
                  `${category} ${(percent * 100).toFixed(0)}%`
                }
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Bar Chart */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Monthly spending</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(v) => currency === 'INR' ? `₹${v}` : `$${v}`} 
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Category breakdown</h3>
        <div className="space-y-3">
          {categoryData.map((item, index) => {
            const percentage = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0
            return (
              <div key={item.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.category}</span>
                  <span className="text-slate-600">
                    {formatCurrency(item.total)} ({item.count} items)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}