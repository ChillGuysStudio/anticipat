import { calculateMonthlyPayment, calculateMonthlyPrincipal, calculateMonthlyRate } from "./mortgage";
import type { ReducePaymentResult, ReduceTermResult, ScheduleResult } from "@/types/app";

type ScheduleInput = {
  balance: number;
  annualInterestRate: number;
  monthlyPayment: number;
  monthsLeft: number;
};

export function simulateSchedule({
  balance,
  annualInterestRate,
  monthlyPayment,
  monthsLeft
}: ScheduleInput): ScheduleResult {
  let currentBalance = Math.max(0, balance);
  const monthlyRate = calculateMonthlyRate(annualInterestRate);
  const schedule: ScheduleResult["schedule"] = [];

  for (let month = 1; month <= monthsLeft && currentBalance > 0.005; month += 1) {
    const interest = currentBalance * monthlyRate;
    const principal = Math.min(monthlyPayment - interest, currentBalance);

    if (principal <= 0) {
      throw new Error(
        "Your monthly payment is not enough to reduce the loan balance with this interest rate."
      );
    }

    currentBalance = Math.max(0, currentBalance - principal);
    schedule.push({
      monthNumber: month,
      payment: principal + interest,
      interest,
      principal,
      remainingBalance: currentBalance
    });
  }

  return {
    monthsToPayoff: schedule.length,
    totalInterest: schedule.reduce((sum, month) => sum + month.interest, 0),
    totalPrincipal: schedule.reduce((sum, month) => sum + month.principal, 0),
    schedule
  };
}

export function compareReduceTerm({
  balance,
  annualInterestRate,
  monthlyPayment,
  monthsLeft,
  earlyRepaymentAmount
}: ScheduleInput & { earlyRepaymentAmount: number }): ReduceTermResult {
  const original = simulateSchedule({ balance, annualInterestRate, monthlyPayment, monthsLeft });
  const reducedBalance = Math.max(0, balance - earlyRepaymentAmount);
  const reduced = simulateSchedule({
    balance: reducedBalance,
    annualInterestRate,
    monthlyPayment,
    monthsLeft
  });

  return {
    newMonthsLeft: reduced.monthsToPayoff,
    monthsSaved: Math.max(0, original.monthsToPayoff - reduced.monthsToPayoff),
    newTotalInterest: reduced.totalInterest,
    interestSaved: Math.max(0, original.totalInterest - reduced.totalInterest),
    newPayoffEstimateMonths: reduced.monthsToPayoff
  };
}

export function compareReducePayment({
  balance,
  annualInterestRate,
  monthlyPayment,
  monthsLeft,
  earlyRepaymentAmount
}: ScheduleInput & { earlyRepaymentAmount: number }): ReducePaymentResult {
  const original = simulateSchedule({ balance, annualInterestRate, monthlyPayment, monthsLeft });
  const reducedBalance = Math.max(0, balance - earlyRepaymentAmount);
  const newMonthlyPayment = calculateMonthlyPayment(reducedBalance, annualInterestRate, monthsLeft);
  const reduced = simulateSchedule({
    balance: reducedBalance,
    annualInterestRate,
    monthlyPayment: newMonthlyPayment,
    monthsLeft
  });

  return {
    newMonthlyPayment,
    paymentReduction: Math.max(0, monthlyPayment - newMonthlyPayment),
    newTotalInterest: reduced.totalInterest,
    interestSaved: Math.max(0, original.totalInterest - reduced.totalInterest)
  };
}

export function estimateMonthsLeftAfterPrincipalPayment(
  balance: number,
  annualInterestRate: number,
  monthlyPayment: number,
  monthsLeft: number,
  earlyRepaymentAmount: number
) {
  return compareReduceTerm({
    balance,
    annualInterestRate,
    monthlyPayment,
    monthsLeft,
    earlyRepaymentAmount
  }).newMonthsLeft;
}

export function estimateInterestSavedForActions(
  balance: number,
  annualInterestRate: number,
  monthlyPayment: number,
  monthsLeft: number,
  earlyRepaymentAmount: number
) {
  if (earlyRepaymentAmount <= 0) {
    return { interestSaved: 0, monthsSaved: 0 };
  }

  const principal = calculateMonthlyPrincipal(balance, annualInterestRate, monthlyPayment);

  if (principal <= 0) {
    return { interestSaved: 0, monthsSaved: 0 };
  }

  const term = compareReduceTerm({
    balance,
    annualInterestRate,
    monthlyPayment,
    monthsLeft,
    earlyRepaymentAmount
  });

  return {
    interestSaved: term.interestSaved,
    monthsSaved: term.monthsSaved
  };
}
