export const PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE = 8.57;

export function calculateMonthlyRate(annualInterestRate: number) {
  return annualInterestRate / 100 / 12;
}

export function calculateMonthlyInterest(remainingBalance: number, annualInterestRate: number) {
  return remainingBalance * calculateMonthlyRate(annualInterestRate);
}

export function calculateMonthlyPrincipal(
  remainingBalance: number,
  annualInterestRate: number,
  monthlyPayment: number
) {
  return monthlyPayment - calculateMonthlyInterest(remainingBalance, annualInterestRate);
}

export function calculateMonthlyPayment(
  balance: number,
  annualInterestRate: number,
  months: number
) {
  const r = calculateMonthlyRate(annualInterestRate);

  if (months <= 0) return 0;
  if (r === 0) return balance / months;

  return (balance * (r * Math.pow(1 + r, months))) / (Math.pow(1 + r, months) - 1);
}

export function calculateMonthsToPayoff(
  balance: number,
  annualInterestRate: number,
  monthlyPayment: number
) {
  const r = calculateMonthlyRate(annualInterestRate);

  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return 1;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return 1;

  return Math.ceil(-Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r));
}

export function calculateBalanceFromPayment(
  monthlyPayment: number,
  annualInterestRate: number,
  months: number
) {
  const r = calculateMonthlyRate(annualInterestRate);

  if (months <= 0 || monthlyPayment <= 0) return 0;
  if (r === 0) return monthlyPayment * months;

  return monthlyPayment * (1 - Math.pow(1 + r, -months)) / r;
}

export function getMonthlyPrincipalError(
  remainingBalance: number,
  annualInterestRate: number,
  monthlyPayment: number
) {
  const principal = calculateMonthlyPrincipal(
    remainingBalance,
    annualInterestRate,
    monthlyPayment
  );

  if (principal <= 0) {
    return "Your monthly payment is not enough to reduce the loan balance with this interest rate.";
  }

  return null;
}
