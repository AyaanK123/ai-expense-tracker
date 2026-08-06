import React, { useMemo } from 'react';
import { Award, TrendingUp, TrendingDown, ShieldCheck, AlertCircle } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
}

interface InsightsProps {
  expenses: Expense[];
  monthlyIncome: number;
}

export const Insights: React.FC<InsightsProps> = ({ expenses, monthlyIncome }) => {
  // Get current month and previous month metrics
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const prevMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth - 1 && expDate.getFullYear() === currentYear;
    });

    // 1. Highest spending category
    const categoryTotals: { [key: string]: number } = {};
    let totalCurrentSpending = 0;

    currentMonthExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      totalCurrentSpending += exp.amount;
    });

    let highestCategory = 'None';
    let highestAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestCategory = cat;
      }
    });

    // 2. Monthly comparison (Total spending change)
    let totalPrevSpending = 0;
    prevMonthExpenses.forEach(exp => {
      totalPrevSpending += exp.amount;
    });

    const spendingDiffPercent = totalPrevSpending === 0 ? 0 : 
      Math.round(((totalCurrentSpending - totalPrevSpending) / totalPrevSpending) * 100);

    // 3. Savings percentage calculation based on user profile income
    const savingsAmount = monthlyIncome - totalCurrentSpending;
    const savingsRate = monthlyIncome > 0 ? Math.round((savingsAmount / monthlyIncome) * 100) : 0;

    // 4. Financial health status
    let healthStatus = 'Good';
    if (savingsRate < 20) healthStatus = 'Needs Attention';
    if (savingsRate > 40) healthStatus = 'Excellent';

    return {
      highestCategory,
      highestAmount,
      totalCurrentSpending,
      spendingDiffPercent,
      savingsRate,
      healthStatus
    };
  }, [expenses, monthlyIncome]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Financial Insights</h2>
        <p className="text-sm text-slate-500">Automated analysis of your spending habits and financial health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Highest Spending Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Highest Expense Category</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">{currentMonthData.highestCategory}</h4>
            <p className="text-xs text-slate-500 mt-1">
              ₹{currentMonthData.highestAmount} spent this month in this category.
            </p>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${currentMonthData.spendingDiffPercent >= 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {currentMonthData.spendingDiffPercent >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Monthly Comparison</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">
              {Math.abs(currentMonthData.spendingDiffPercent)}% {currentMonthData.spendingDiffPercent >= 0 ? 'increase' : 'decrease'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">Compared to last month's spending pace.</p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Savings Rate</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">{currentMonthData.savingsRate}%</h4>
            <p className="text-xs text-slate-500 mt-1">Percentage of income retained this month.</p>
          </div>
        </div>

        {/* Financial Health Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Financial Health Status</p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">{currentMonthData.healthStatus}</h4>
            <p className="text-xs text-slate-500 mt-1">Based on your monthly savings buffer.</p>
          </div>
        </div>
      </div>
    </div>
  );
};