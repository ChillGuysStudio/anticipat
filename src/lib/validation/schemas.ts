import { z } from "zod";

const money = z.coerce.number().finite().min(0);
const positiveMoney = z.coerce.number().finite().positive();
const percent = z.coerce.number().finite().min(0).max(100);
const months = z.coerce.number().int().positive();
const repaymentStrategy = z.enum(["reduce_term", "reduce_payment"]);

const BaseLoanProfile = z.object({
  remainingBalance: positiveMoney,
  originalBalance: positiveMoney,
  annualInterestRate: percent,
  monthlyPayment: positiveMoney,
  monthsLeft: months,
  currentEmergencyFund: money,
  repaymentStrategy: repaymentStrategy.default("reduce_term"),
  startDate: z.string().optional(),
  originalTermMonths: z.coerce.number().int().positive().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const LoanProfileSchema = BaseLoanProfile.refine(
  (data) => data.originalBalance >= data.remainingBalance,
  {
    message: "Original mortgage balance cannot be less than the remaining balance.",
    path: ["originalBalance"]
  }
);

export const MonthlyActionSchema = z.object({
  id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  actualEmergencyAdded: money.default(0),
  actualEarlyPayment: money.default(0),
  paidScheduledMonth: z.boolean().default(false),
  earlyPaymentType: repaymentStrategy.optional(),
  createdAt: z.string()
});

export const AppStateSchema = z.object({
  loanProfile: LoanProfileSchema.nullable(),
  monthlyActions: z.array(MonthlyActionSchema),
  version: z.literal(1)
});

export const SetupProfileSchema = BaseLoanProfile.omit({
  annualInterestRate: true,
  repaymentStrategy: true,
  createdAt: true,
  updatedAt: true,
  startDate: true,
  originalTermMonths: true
}).refine(
  (data) => data.originalBalance >= data.remainingBalance,
  {
    message: "Original mortgage balance cannot be less than the remaining balance.",
    path: ["originalBalance"]
  }
);

export type SetupProfileInput = z.infer<typeof SetupProfileSchema>;
