import { IncomeEntry, ExpenseEntry, SavingsAccount, DebtEntry } from '@/store/financeStore';

export const calculateMonthlyIncome = (income: IncomeEntry[]): number => {
  return income.reduce((total, entry) => {
    let monthlyAmount = 0;
    switch (entry.frequency) {
      case 'Weekly':
        monthlyAmount = entry.amount * 4.33;
        break;
      case 'Biweekly':
        monthlyAmount = entry.amount * 2.17;
        break;
      case 'Monthly':
        monthlyAmount = entry.amount;
        break;
      case 'Quarterly':
        monthlyAmount = entry.amount / 3;
        break;
      case 'Yearly':
        monthlyAmount = entry.amount / 12;
        break;
      default:
        monthlyAmount = 0;
    }
    return total + monthlyAmount;
  }, 0);
};

export const calculatePostTaxIncome = (income: IncomeEntry[]): number => {
  return income
    .filter(entry => !entry.preTax)
    .reduce((total, entry) => {
      let monthlyAmount = 0;
      switch (entry.frequency) {
        case 'Weekly':
          monthlyAmount = entry.amount * 4.33;
          break;
        case 'Biweekly':
          monthlyAmount = entry.amount * 2.17;
          break;
        case 'Monthly':
          monthlyAmount = entry.amount;
          break;
        case 'Quarterly':
          monthlyAmount = entry.amount / 3;
          break;
        case 'Yearly':
          monthlyAmount = entry.amount / 12;
          break;
        default:
          monthlyAmount = 0;
      }
      return total + monthlyAmount;
    }, 0);
};

export const calculateTitheAmount = (postTaxIncome: number): number => {
  return postTaxIncome * 0.1;
};

export const calculateMonthlyExpenses = (expenses: ExpenseEntry[]): number => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    })
    .reduce((total, expense) => total + expense.amount, 0);
};

export const calculateNetWorth = (
  savings: SavingsAccount[],
  debts: DebtEntry[]
): number => {
  const totalAssets = savings.reduce((sum, acc) => sum + acc.currentAmount, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  return totalAssets - totalDebts;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateCategoryTotals = (expenses: ExpenseEntry[]): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
};
