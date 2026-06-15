export type RepaymentStrategy = "reduce_term" | "reduce_payment";

export type LoanProfile = {
  remainingBalance: number;
  originalBalance?: number;
  annualInterestRate: number;
  monthlyPayment: number;
  monthsLeft: number;
  currentEmergencyFund: number;
  repaymentStrategy: RepaymentStrategy;
  startDate?: string;
  originalTermMonths?: number;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyAction = {
  id: string;
  month: string;
  actualEmergencyAdded: number;
  actualEarlyPayment: number;
  paidScheduledMonth: boolean;
  earlyPaymentType?: RepaymentStrategy;
  createdAt: string;
};

export type AppState = {
  loanProfile: LoanProfile | null;
  monthlyActions: MonthlyAction[];
  version: number;
};

export type ScheduleMonth = {
  monthNumber: number;
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
};

export type ScheduleResult = {
  monthsToPayoff: number;
  totalInterest: number;
  totalPrincipal: number;
  schedule: ScheduleMonth[];
};

export type ReduceTermResult = {
  newMonthsLeft: number;
  monthsSaved: number;
  newTotalInterest: number;
  interestSaved: number;
  newPayoffEstimateMonths: number;
};

export type ReducePaymentResult = {
  newMonthlyPayment: number;
  paymentReduction: number;
  newTotalInterest: number;
  interestSaved: number;
};
