// Reasonable starting set of preset charges for a small clinic. Used by
// the "Add starter charges" empty-state button on the Preset Charges tab
// and by the dev seed script. Amounts are integer paise.

import type { ExpenseCategory } from "@/lib/constants";

export type DefaultPreset = {
  title: string;
  amount: number; // paise
};

export const DEFAULT_PRESET_CHARGES: ReadonlyArray<DefaultPreset> = [
  { title: "Consultation", amount: 50000 },
  { title: "Follow-up", amount: 30000 },
  { title: "Injection", amount: 15000 },
  { title: "Dressing", amount: 20000 },
  { title: "Dental Cleaning", amount: 120000 },
  { title: "X-Ray", amount: 80000 },
];

// Same idea as DEFAULT_PRESET_CHARGES, but for the "Add starter presets"
// empty-state on the Expense Presets tab.
export type DefaultExpensePreset = {
  title: string;
  category: ExpenseCategory;
  amount: number; // paise
};

export const DEFAULT_EXPENSE_PRESETS: ReadonlyArray<DefaultExpensePreset> = [
  { title: "Staff Salary", category: "staff_salary", amount: 2000000 },
  { title: "Rent", category: "rent", amount: 3000000 },
  { title: "Electricity Bill", category: "electricity", amount: 500000 },
  { title: "Internet Bill", category: "internet", amount: 150000 },
  { title: "Medicine Stock", category: "medicines", amount: 1000000 },
  { title: "Cleaning Supplies", category: "cleaning", amount: 100000 },
];
