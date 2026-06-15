"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { ChartCard } from "@/components/chart-card";
import { EmptyState } from "@/components/empty-state";
import { MoneyInput } from "@/components/money-input";
import { MonthInput } from "@/components/month-input";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateBalanceFromPayment,
  calculateMonthlyInterest,
  calculateMonthlyPayment,
  calculateMonthlyPrincipal,
  PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
  getMonthlyPrincipalError
} from "@/lib/finance/mortgage";
import {
  estimateInterestSavedForActions,
  estimateMonthsLeftAfterPrincipalPayment,
  simulateSchedule
} from "@/lib/finance/schedule";
import { formatMonthKey, formatMonths, formatYearsAndMonths, getCurrentMonthKey } from "@/lib/format/dates";
import { formatMoney, formatPercent } from "@/lib/format/money";
import {
  emptyAppState,
  loadAppState,
  saveAppState
} from "@/lib/storage/local-store";
import { SetupProfileSchema } from "@/lib/validation/schemas";
import type { AppState, LoanProfile, MonthlyAction } from "@/types/app";

type TabValue = "dashboard" | "history" | "settings";
type ProfileFormState = Omit<
  LoanProfile,
  | "annualInterestRate"
  | "repaymentStrategy"
  | "createdAt"
  | "updatedAt"
  | "startDate"
  | "originalTermMonths"
>;

const defaultProfileForm: ProfileFormState = {
  remainingBalance: 800000,
  monthlyPayment: 7000,
  monthsLeft: 240,
  currentEmergencyFund: 0
};

const chartStroke = "#0f766e";
const chartMuted = "#a8a29e";
const chartAccent = "#b45309";

export default function Home() {
  const [state, setState] = React.useState<AppState>(emptyAppState);
  const [hydrated, setHydrated] = React.useState(false);
  const [tab, setTab] = React.useState<TabValue>("dashboard");

  React.useEffect(() => {
    setState(loadAppState());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) {
      saveAppState(state);
    }
  }, [hydrated, state]);

  const updateState = React.useCallback((nextState: AppState) => {
    setState(nextState);
  }, []);

  if (!hydrated) {
    return (
      <AppShell className="flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading Anticipat...</p>
      </AppShell>
    );
  }

  if (!state.loanProfile) {
    return <SetupScreen onCreate={(loanProfile) => updateState({ ...emptyAppState, loanProfile })} />;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Anticipat"
          subtitle="Plan your Prima Casă Plus early repayment."
        />
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {tab === "dashboard" ? <DashboardSection state={state} setState={setState} /> : null}
          </TabsContent>
          <TabsContent value="history">
            {tab === "history" ? <HistorySection state={state} /> : null}
          </TabsContent>
          <TabsContent value="settings">
            {tab === "settings" ? (
              <SettingsSection profile={state.loanProfile} setState={setState} />
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function SetupScreen({ onCreate }: { onCreate: (profile: LoanProfile) => void }) {
  const [form, setForm] = React.useState<ProfileFormState>(defaultProfileForm);
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = SetupProfileSchema.safeParse(form);

    if (!result.success) {
      setError("Check the loan values and try again.");
      return;
    }

    const paymentError = getMonthlyPrincipalError(
      result.data.remainingBalance,
      PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
      result.data.monthlyPayment
    );

    if (paymentError) {
      setError(paymentError);
      return;
    }

    const now = new Date().toISOString();
    onCreate({
      ...result.data,
      annualInterestRate: PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
      repaymentStrategy: "reduce_term",
      originalTermMonths: result.data.monthsLeft,
      createdAt: now,
      updatedAt: now
    });
  }

  return (
    <AppShell className="flex items-center justify-center">
      <form className="w-full max-w-3xl space-y-5" onSubmit={submit}>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Set up your Prima Casă Plus mortgage</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
            Enter the payment from your schedule. The other loan value fills itself in.
          </p>
        </div>
        {error ? <Alert className="border-destructive/30 bg-destructive/5 text-destructive">{error}</Alert> : null}
        <SectionCard title="Loan details">
          <ProfileFields form={form} onChange={setForm} />
          <div className="mt-5 flex justify-end">
            <Button type="submit">Save mortgage profile</Button>
          </div>
        </SectionCard>
      </form>
    </AppShell>
  );
}

function ProfileFields({
  form,
  onChange
}: {
  form: ProfileFormState;
  onChange: (form: ProfileFormState) => void;
}) {
  function updateMonthlyPayment(monthlyPayment: number) {
    const normalizedMonths = Math.max(1, Math.round(form.monthsLeft));
    onChange({
      ...form,
      monthlyPayment,
      remainingBalance: Math.round(
        calculateBalanceFromPayment(
          monthlyPayment,
          PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
          normalizedMonths
        )
      )
    });
  }

  function updateRemainingBalance(remainingBalance: number) {
    const normalizedMonths = Math.max(1, Math.round(form.monthsLeft));
    onChange({
      ...form,
      remainingBalance,
      monthlyPayment: Math.round(
        calculateMonthlyPayment(
          remainingBalance,
          PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
          normalizedMonths
        )
      )
    });
  }

  function updateMonthsLeft(monthsLeft: number) {
    const normalizedMonths = Math.max(1, Math.round(monthsLeft));
    onChange({
      ...form,
      monthsLeft: normalizedMonths,
      remainingBalance: Math.round(
        calculateBalanceFromPayment(
          form.monthlyPayment,
          PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
          normalizedMonths
        )
      )
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyInput
          id="monthlyPayment"
          label="Monthly payment"
          value={form.monthlyPayment}
          onChange={updateMonthlyPayment}
        />
        <MoneyInput
          id="remainingBalance"
          label="Remaining mortgage balance"
          value={form.remainingBalance}
          onChange={updateRemainingBalance}
        />
        <MonthInput
          id="monthsLeft"
          label="Months left"
          value={form.monthsLeft}
          onChange={updateMonthsLeft}
        />
      </div>
    </div>
  );
}

function DashboardSection({
  state,
  setState
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const profile = state.loanProfile;
  const [termAmount, setTermAmount] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [emergencyAmount, setEmergencyAmount] = React.useState(0);
  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  if (!profile) return null;

  const paymentError = getMonthlyPrincipalError(
    profile.remainingBalance,
    profile.annualInterestRate,
    profile.monthlyPayment
  );
  const monthlyInterest = calculateMonthlyInterest(
    profile.remainingBalance,
    profile.annualInterestRate
  );
  const monthlyPrincipal = calculateMonthlyPrincipal(
    profile.remainingBalance,
    profile.annualInterestRate,
    profile.monthlyPayment
  );
  const oneMonthAnticipatAmount = Math.max(0, Math.round(monthlyPrincipal));
  const totalLeftToPay = getRemainingRepaymentTotal(profile);
  const futureInterestLeft = Math.max(0, totalLeftToPay - profile.remainingBalance);

  React.useEffect(() => {
    setTermAmount(oneMonthAnticipatAmount);
  }, [oneMonthAnticipatAmount]);

  function recordAction(input: ActionInput) {
    const createdAt = new Date().toISOString();
    const action: MonthlyAction = {
      id: getId(),
      month: getCurrentMonthKey(),
      actualEmergencyAdded: input.actualEmergencyAdded ?? 0,
      actualEarlyPayment: input.actualEarlyPayment ?? 0,
      paidScheduledMonth: input.paidScheduledMonth ?? false,
      earlyPaymentType: input.earlyPaymentType,
      createdAt
    };

    setState((current) => {
      if (!current.loanProfile) return current;
      const actualEmergency = action.actualEmergencyAdded;
      const actualEarly = action.actualEarlyPayment;
      const scheduledInterest = calculateMonthlyInterest(
        current.loanProfile.remainingBalance,
        current.loanProfile.annualInterestRate
      );
      const scheduledPrincipal = action.paidScheduledMonth
        ? Math.max(
            0,
            Math.min(
              current.loanProfile.monthlyPayment - scheduledInterest,
              current.loanProfile.remainingBalance
            )
          )
        : 0;
      const balanceAfterScheduled = Math.max(
        0,
        current.loanProfile.remainingBalance - scheduledPrincipal
      );
      const monthsAfterScheduled = action.paidScheduledMonth
        ? Math.max(0, current.loanProfile.monthsLeft - 1)
        : current.loanProfile.monthsLeft;
      const newBalance = Math.max(0, balanceAfterScheduled - actualEarly);
      const shouldReducePayment = action.earlyPaymentType === "reduce_payment";
      const newMonthsLeft =
        actualEarly > 0 && !shouldReducePayment
          ? estimateMonthsLeftAfterPrincipalPayment(
              balanceAfterScheduled,
              current.loanProfile.annualInterestRate,
              current.loanProfile.monthlyPayment,
              monthsAfterScheduled,
              actualEarly
            )
          : monthsAfterScheduled;
      const newMonthlyPayment =
        actualEarly > 0 && shouldReducePayment
          ? calculateMonthlyPayment(
              newBalance,
              current.loanProfile.annualInterestRate,
              Math.max(1, monthsAfterScheduled)
            )
          : current.loanProfile.monthlyPayment;

      return {
        ...current,
        loanProfile: {
          ...current.loanProfile,
          remainingBalance: newBalance,
          monthsLeft: newMonthsLeft,
          monthlyPayment: newMonthlyPayment,
          currentEmergencyFund: current.loanProfile.currentEmergencyFund + actualEmergency,
          updatedAt: createdAt
        },
        monthlyActions: [action, ...current.monthlyActions]
      };
    });
    setNotice(input.notice ?? "Saved.");
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const amount = Math.max(0, pendingAction.amount ?? 0);

    if (pendingAction.kind === "monthly") {
      recordAction({
        paidScheduledMonth: true,
        notice: "Monthly payment saved."
      });
    }

    if (pendingAction.kind === "term") {
      recordAction({
        actualEarlyPayment: amount,
        earlyPaymentType: "reduce_term",
        notice: "Anticipat payment saved."
      });
    }

    if (pendingAction.kind === "payment") {
      recordAction({
        actualEarlyPayment: amount,
        earlyPaymentType: "reduce_payment",
        notice: "Payment-reducing anticipat saved."
      });
    }

    if (pendingAction.kind === "emergency") {
      recordAction({
        actualEmergencyAdded: amount,
        notice: "Emergency savings saved."
      });
    }

    setPendingAction(null);
  }

  return (
    <div className="space-y-6">
      {paymentError ? <Alert className="border-destructive/30 bg-destructive/5 text-destructive">{paymentError}</Alert> : null}
      {notice ? <Alert>{notice}</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="Required payment">
            <div className="grid gap-4 sm:grid-cols-3">
              <ActionMetric label="Monthly payment" value={formatMoney(profile.monthlyPayment)} />
              <ActionMetric label="Interest" value={formatMoney(monthlyInterest)} />
              <ActionMetric label="Principal" value={formatMoney(Math.max(0, monthlyPrincipal))} />
            </div>
            <div className="mt-5">
              <Button
                type="button"
                onClick={() =>
                  setPendingAction({
                    kind: "monthly",
                    title: "Pay monthly payment?",
                    description: `${formatMoney(profile.monthlyPayment)} will be recorded. Balance will drop by ${formatMoney(Math.max(0, monthlyPrincipal))}.`
                  })
                }
              >
                Pay monthly payment
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Anticipat payments">
            <div className="divide-y rounded-md border">
              <ActionRow
                title="Pay anticipat one month"
                detail="Keeps the monthly payment and reduces the term."
                actionLabel="Pay one month"
                amountId="termAmount"
                amount={termAmount}
                onAmountChange={setTermAmount}
                onAction={() =>
                  setPendingAction({
                    kind: "term",
                    amount: termAmount,
                    title: "Pay anticipat one month?",
                    description: `${formatMoney(termAmount)} will be paid toward principal and the term will be recalculated.`
                  })
                }
              />
              <ActionRow
                title="Pay anticipat from total sum"
                detail="Reduces the principal and recalculates the monthly payment."
                actionLabel="Pay from total"
                amountId="totalAmount"
                amount={totalAmount}
                onAmountChange={setTotalAmount}
                onAction={() =>
                  setPendingAction({
                    kind: "payment",
                    amount: totalAmount,
                    title: "Pay anticipat from total sum?",
                    description: `${formatMoney(totalAmount)} will be paid toward principal and the monthly payment will be recalculated.`
                  })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Savings">
            <div className="divide-y rounded-md border">
              <ActionRow
                title="Emergency fund"
                detail="Money saved outside the mortgage."
                actionLabel="Add emergency"
                amountId="emergencyAmount"
                amount={emergencyAmount}
                onAmountChange={setEmergencyAmount}
                onAction={() =>
                  setPendingAction({
                    kind: "emergency",
                    amount: emergencyAmount,
                    title: "Add emergency savings?",
                    description: `${formatMoney(emergencyAmount)} will be added to the emergency fund.`
                  })
                }
              />
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Loan">
          <div className="divide-y rounded-md border">
            <SnapshotRow label="Remaining balance" value={formatMoney(profile.remainingBalance)} />
            <SnapshotRow label="Total left to pay" value={formatMoney(totalLeftToPay)} />
            <SnapshotRow label="Future interest" value={formatMoney(futureInterestLeft)} />
            <SnapshotRow label="Months left" value={formatYearsAndMonths(profile.monthsLeft)} />
            <SnapshotRow label="Monthly payment" value={formatMoney(profile.monthlyPayment)} />
            <SnapshotRow label="Program rate" value={formatPercent(PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE)} />
          </div>
        </SectionCard>
      </div>
      <ConfirmActionDialog
        action={pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}

type ActionInput = {
  actualEmergencyAdded?: number;
  actualEarlyPayment?: number;
  paidScheduledMonth?: boolean;
  earlyPaymentType?: MonthlyAction["earlyPaymentType"];
  notice?: string;
};

type PendingActionKind = "monthly" | "term" | "payment" | "emergency";

type PendingAction = {
  kind: PendingActionKind;
  title: string;
  description: string;
  amount?: number;
};

function ActionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function ActionRow({
  title,
  detail,
  actionLabel,
  amountId,
  amount,
  onAmountChange,
  onAction
}: {
  title: string;
  detail: string;
  actionLabel: string;
  amountId: string;
  amount: number;
  onAmountChange: (amount: number) => void;
  onAction: () => void;
}) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
      <MoneyInput
        id={amountId}
        label="Amount"
        value={amount}
        onChange={onAmountChange}
      />
      <Button type="button" variant="outline" disabled={amount <= 0} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function ConfirmActionDialog({
  action,
  onClose,
  onConfirm
}: {
  action: PendingAction | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{action?.title ?? ""}</DialogTitle>
          <DialogDescription>{action?.description ?? ""}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function SnapshotRow({
  label,
  value,
  muted = false
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={muted ? "text-sm text-muted-foreground" : "text-sm font-semibold"}>{value}</div>
    </div>
  );
}

function HistorySection({ state }: { state: AppState }) {
  const profile = state.loanProfile;
  const [chartsReady, setChartsReady] = React.useState(false);

  React.useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setChartsReady(true));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, []);

  if (!profile) return null;

  const orderedActions = [...state.monthlyActions].reverse();
  const totals = state.monthlyActions.reduce(
    (sum, action) => ({
      emergency: sum.emergency + action.actualEmergencyAdded,
      early: sum.early + action.actualEarlyPayment,
      termEarly:
        sum.termEarly + (action.earlyPaymentType === "reduce_term" ? action.actualEarlyPayment : 0),
      paymentEarly:
        sum.paymentEarly + (action.earlyPaymentType === "reduce_payment" ? action.actualEarlyPayment : 0),
      paidMonths: sum.paidMonths + (action.paidScheduledMonth ? 1 : 0)
    }),
    { emergency: 0, early: 0, termEarly: 0, paymentEarly: 0, paidMonths: 0 }
  );
  const impact = estimateInterestSavedForActions(
    profile.remainingBalance,
    profile.annualInterestRate,
    profile.monthlyPayment,
    profile.monthsLeft,
    totals.early
  );
  const chartData = buildActionChartData(orderedActions);
  const balanceData = buildBalanceComparisonData(profile, totals.early);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total paid anticipat" value={formatMoney(totals.early)} />
        <StatCard label="Reduced term" value={formatMoney(totals.termEarly)} />
        <StatCard label="Reduced payment" value={formatMoney(totals.paymentEarly)} />
        <StatCard label="Estimated interest saved" value={formatMoney(impact.interestSaved)} />
        <StatCard label="Estimated months saved" value={formatMonths(impact.monthsSaved)} />
      </div>
      {state.monthlyActions.length === 0 ? (
        <EmptyState
          title="No confirmed actions yet"
          description="After you confirm what you did this month, your progress and charts will appear here."
        />
      ) : (
        <>
          <SectionCard title="Confirmed monthly actions">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Month</th>
                    <th className="py-2 pr-3 font-medium">Regular payment</th>
                    <th className="py-2 pr-3 font-medium">Emergency fund</th>
                    <th className="py-2 pr-3 font-medium">Early repayment</th>
                    <th className="py-2 pr-3 font-medium">Early type</th>
                  </tr>
                </thead>
                <tbody>
                  {state.monthlyActions.map((action) => (
                    <tr key={action.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">{formatMonthKey(action.month)}</td>
                      <td className="py-3 pr-3">{action.paidScheduledMonth ? "Paid" : "Not marked"}</td>
                      <td className="py-3 pr-3">{formatMoney(action.actualEmergencyAdded)}</td>
                      <td className="py-3 pr-3">{formatMoney(action.actualEarlyPayment)}</td>
                      <td className="py-3 pr-3">
                        {action.earlyPaymentType ? formatRepaymentType(action.earlyPaymentType) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          {chartsReady ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Anticipat paid by type">
                {({ width, height }) => (
                  <BarChart data={chartData} width={width} height={height}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} />
                    <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Legend />
                    <Bar dataKey="Reduce term" stackId="early" fill={chartStroke} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Reduce payment" stackId="early" fill={chartAccent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ChartCard>
              <ChartCard title="Loan balance comparison">
                {({ width, height }) => (
                  <LineChart data={balanceData} width={width} height={height}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} />
                    <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="Without early repayment" stroke={chartMuted} dot={false} />
                    <Line type="monotone" dataKey="Current path" stroke={chartStroke} dot={false} />
                  </LineChart>
                )}
              </ChartCard>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SettingsSection({
  profile,
  setState
}: {
  profile: LoanProfile;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [form, setForm] = React.useState<ProfileFormState>(
    profileToForm(profile)
  );
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile]);

  function saveSettings() {
    const result = SetupProfileSchema.safeParse(form);
    if (!result.success) {
      setMessage("Check the loan values and try again.");
      return;
    }

    const now = new Date().toISOString();
    setState((current) => ({
      ...current,
      loanProfile: current.loanProfile
        ? {
            ...current.loanProfile,
            ...result.data,
            annualInterestRate: PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
            updatedAt: now
          }
        : null
    }));
    setMessage("Settings saved.");
  }

  return (
    <div className="space-y-6">
      {message ? <Alert>{message}</Alert> : null}
      <SectionCard title="Loan profile">
        <ProfileFields form={form} onChange={setForm} />
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={saveSettings}>
            Save changes
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

function buildActionChartData(actions: MonthlyAction[]) {
  return actions.map((action) => {
    return {
      month: action.month,
      "Reduce term": action.earlyPaymentType === "reduce_term" ? action.actualEarlyPayment : 0,
      "Reduce payment": action.earlyPaymentType === "reduce_payment" ? action.actualEarlyPayment : 0
    };
  });
}

function buildBalanceComparisonData(profile: LoanProfile, totalEarlyPaid: number) {
  try {
    const baseline = simulateSchedule({
      balance: profile.remainingBalance + totalEarlyPaid,
      annualInterestRate: profile.annualInterestRate,
      monthlyPayment: profile.monthlyPayment,
      monthsLeft: profile.monthsLeft
    }).schedule;
    const current = simulateSchedule({
      balance: profile.remainingBalance,
      annualInterestRate: profile.annualInterestRate,
      monthlyPayment: profile.monthlyPayment,
      monthsLeft: profile.monthsLeft
    }).schedule;
    const maxLength = Math.max(baseline.length, current.length);
    const step = Math.max(1, Math.floor(maxLength / 12));
    const rows = [];

    for (let index = 0; index < maxLength; index += step) {
      rows.push({
        month: `M${index + 1}`,
        "Without early repayment": baseline[index]?.remainingBalance ?? 0,
        "Current path": current[index]?.remainingBalance ?? 0
      });
    }

    return rows;
  } catch {
    return [];
  }
}

function getRemainingRepaymentTotal(profile: LoanProfile) {
  try {
    const schedule = simulateSchedule({
      balance: profile.remainingBalance,
      annualInterestRate: profile.annualInterestRate,
      monthlyPayment: profile.monthlyPayment,
      monthsLeft: profile.monthsLeft
    }).schedule;

    return schedule.reduce((sum, month) => sum + month.payment, 0);
  } catch {
    return profile.monthlyPayment * profile.monthsLeft;
  }
}

function profileToForm(profile: LoanProfile): ProfileFormState {
  return {
    remainingBalance: profile.remainingBalance,
    monthlyPayment: profile.monthlyPayment,
    monthsLeft: profile.monthsLeft,
    currentEmergencyFund: profile.currentEmergencyFund,
  };
}

function formatRepaymentType(type: MonthlyAction["earlyPaymentType"]) {
  if (type === "reduce_payment") {
    return "Reduce monthly payment";
  }
  if (type === "reduce_term") {
    return "Reduce term";
  }
  return "";
}

function getId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
