<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { SignInButton, UserButton, useClerkContext } from 'svelte-clerk';
  import AppShell from '$lib/components/AppShell.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import MoneyInput from '$lib/components/MoneyInput.svelte';
  import MonthInput from '$lib/components/MonthInput.svelte';
  import SectionCard from '$lib/components/SectionCard.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import { Alert } from '$lib/components/ui/alert/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import {
    PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
    calculateBalanceFromPayment,
    calculateMonthlyInterest,
    calculateMonthlyPayment,
    calculateMonthlyPrincipal,
    getMonthlyPrincipalError
  } from '$lib/finance/mortgage';
  import {
    estimateInterestSavedForActions,
    estimateMonthsLeftAfterPrincipalPayment,
    simulateSchedule
  } from '$lib/finance/schedule';
  import { formatMonthKey, formatMonths, formatYearsAndMonths, getCurrentMonthKey } from '$lib/format/dates';
  import { formatMoney, formatPercent } from '$lib/format/money';
  import { emptyAppState, loadAppState, saveAppState, syncFromServer, syncToServer } from '$lib/storage/local-store';
  import type { AppState, LoanProfile, MonthlyAction } from '$lib/types/app';
  import { SetupProfileSchema } from '$lib/validation/schemas';

  type TabValue = 'dashboard' | 'history' | 'settings';
  type ProfileFormState = Omit<
    LoanProfile,
    'annualInterestRate' | 'repaymentStrategy' | 'createdAt' | 'updatedAt' | 'startDate' | 'originalTermMonths'
  >;
  type PendingActionKind = 'monthly' | 'term' | 'payment' | 'emergency';
  type PendingAction = {
    kind: PendingActionKind;
    title: string;
    description: string;
    amount?: number;
  };
  type ActionInput = {
    actualEmergencyAdded?: number;
    actualEarlyPayment?: number;
    paidScheduledMonth?: boolean;
    earlyPaymentType?: MonthlyAction['earlyPaymentType'];
    notice?: string;
  };

  const defaultProfileForm: ProfileFormState = {
    remainingBalance: 802514,
    originalBalance: 1000000,
    monthlyPayment: 7000,
    monthsLeft: 240,
    currentEmergencyFund: 0
  };

  let appState: AppState = $state(emptyAppState);
  let hydrated = $state(false);
  let tab: TabValue = $state('dashboard');
  let setupForm: ProfileFormState = $state({ ...defaultProfileForm });
  let setupError: string | null = $state(null);
  let settingsForm: ProfileFormState = $state({ ...defaultProfileForm });
  let settingsProfileVersion = $state('');
  let settingsMessage: string | null = $state(null);
  let termAmount = $state(0);
  let totalAmount = $state(0);
  let emergencyAmount = $state(0);
  let pendingAction: PendingAction | null = $state(null);
  let notice: string | null = $state(null);
  let showConfirmReset = $state(false);

  const clerk = useClerkContext();
  let isClerkLoaded = $derived(clerk.isLoaded);
  let isSignedIn = $derived(Boolean(clerk.auth.userId));

  let profile = $derived(appState.loanProfile);
  let monthlyInterest = $derived(profile ? calculateMonthlyInterest(profile.remainingBalance, profile.annualInterestRate) : 0);
  let monthlyPrincipal = $derived(profile ? calculateMonthlyPrincipal(profile.remainingBalance, profile.annualInterestRate, profile.monthlyPayment) : 0);
  let oneMonthAnticipatAmount = $derived(Math.max(0, Math.round(monthlyPrincipal)));
  let paymentError = $derived(profile ? getMonthlyPrincipalError(profile.remainingBalance, profile.annualInterestRate, profile.monthlyPayment) : null);
  let totalLeftToPay = $derived(profile ? getRemainingRepaymentTotal(profile) : 0);
  let futureInterestLeft = $derived(profile ? Math.max(0, totalLeftToPay - profile.remainingBalance) : 0);
  let historyTotals = $derived(getHistoryTotals(appState.monthlyActions));
  let historyImpact = $derived(
    profile
      ? estimateInterestSavedForActions(
          profile.remainingBalance,
          profile.annualInterestRate,
          profile.monthlyPayment,
          profile.monthsLeft,
          historyTotals.early
        )
      : { interestSaved: 0, monthsSaved: 0 }
  );
  let actionChartData = $derived(buildActionChartData([...appState.monthlyActions].reverse()));
  let balanceData = $derived(profile ? buildBalanceComparisonData(profile, historyTotals.early) : []);
  let maxActionChartTotal = $derived(Math.max(1, ...actionChartData.map((row) => row.reduceTerm + row.reducePayment)));

  onMount(() => {
    appState = loadAppState();
    hydrated = true;

    const callback = () => {
      const modal = document.querySelector('.cl-modalContainer');
      if (modal) {
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('height', '100vh', 'important');
      } else {
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('height');
      }
    };

    callback();
    const observer = new MutationObserver(callback);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('height');
    };
  });

  $effect(() => {
    if (!hydrated || !isClerkLoaded) return;

    if (isSignedIn) {
      localStorage.setItem('wasSignedIn', 'true');
      syncFromServer().then((serverState) => {
        appState = serverState;
      });
    } else {
      const wasSignedIn = localStorage.getItem('wasSignedIn');
      if (wasSignedIn === 'true') {
        localStorage.removeItem('wasSignedIn');
        saveAppState(emptyAppState);
        appState = emptyAppState;
      }
    }
  });

  $effect(() => {
    if (!hydrated) return;
    saveAppState(appState);
    if (isClerkLoaded && isSignedIn) {
      void syncToServer(appState);
    }
  });

  $effect(() => {
    if (oneMonthAnticipatAmount > 0 && termAmount === 0) {
      termAmount = oneMonthAnticipatAmount;
    }
  });

  $effect(() => {
    if (profile && profile.updatedAt !== settingsProfileVersion) {
      settingsForm = profileToForm(profile);
      settingsProfileVersion = profile.updatedAt;
    }
  });

  function createProfile() {
    let finalForm = setupForm;
    if (setupForm.originalBalance < setupForm.remainingBalance) {
      finalForm = { ...setupForm, originalBalance: setupForm.remainingBalance };
      setupForm = finalForm;
    }

    const result = SetupProfileSchema.safeParse(finalForm);
    if (!result.success) {
      setupError = 'Check the loan values and try again.';
      return;
    }

    const monthlyPaymentError = getMonthlyPrincipalError(
      result.data.remainingBalance,
      PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
      result.data.monthlyPayment
    );
    if (monthlyPaymentError) {
      setupError = monthlyPaymentError;
      return;
    }

    const now = new Date().toISOString();
    appState = {
      ...emptyAppState,
      loanProfile: {
        ...result.data,
        annualInterestRate: PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
        repaymentStrategy: 'reduce_term',
        originalTermMonths: result.data.monthsLeft,
        createdAt: now,
        updatedAt: now
      }
    };
  }

  function updateFormFromMonthlyPayment(form: ProfileFormState, monthlyPayment: number): ProfileFormState {
    const normalizedMonths = Math.max(1, Math.round(form.monthsLeft));
    return {
      ...form,
      monthlyPayment,
      remainingBalance: Math.round(calculateBalanceFromPayment(monthlyPayment, PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE, normalizedMonths))
    };
  }

  function updateFormFromRemainingBalance(form: ProfileFormState, remainingBalance: number): ProfileFormState {
    const normalizedMonths = Math.max(1, Math.round(form.monthsLeft));
    return {
      ...form,
      remainingBalance,
      monthlyPayment: Math.round(calculateMonthlyPayment(remainingBalance, PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE, normalizedMonths))
    };
  }

  function updateFormFromMonthsLeft(form: ProfileFormState, monthsLeft: number): ProfileFormState {
    const normalizedMonths = Math.max(1, Math.round(monthsLeft));
    return {
      ...form,
      monthsLeft: normalizedMonths,
      remainingBalance: Math.round(calculateBalanceFromPayment(form.monthlyPayment, PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE, normalizedMonths))
    };
  }

  function saveSettings() {
    let finalForm = settingsForm;
    if (settingsForm.originalBalance < settingsForm.remainingBalance) {
      finalForm = { ...settingsForm, originalBalance: settingsForm.remainingBalance };
      settingsForm = finalForm;
    }

    const result = SetupProfileSchema.safeParse(finalForm);
    if (!result.success || !profile) {
      settingsMessage = 'Check the loan values and try again.';
      return;
    }

    const now = new Date().toISOString();
    appState = {
      ...appState,
      loanProfile: {
        ...profile,
        ...result.data,
        annualInterestRate: PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
        updatedAt: now
      }
    };
    settingsMessage = 'Settings saved.';
  }

  async function handleReset() {
    if (isSignedIn) {
      try {
        await fetch('/api/profile', { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete profile from server:', err);
      }
    }

    appState = emptyAppState;
    saveAppState(emptyAppState);
    showConfirmReset = false;
  }

  function recordAction(input: ActionInput) {
    if (!profile) return;

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

    const scheduledInterest = calculateMonthlyInterest(profile.remainingBalance, profile.annualInterestRate);
    const scheduledPrincipal = action.paidScheduledMonth
      ? Math.max(0, Math.min(profile.monthlyPayment - scheduledInterest, profile.remainingBalance))
      : 0;
    const balanceAfterScheduled = Math.max(0, profile.remainingBalance - scheduledPrincipal);
    const monthsAfterScheduled = action.paidScheduledMonth ? Math.max(0, profile.monthsLeft - 1) : profile.monthsLeft;
    const newBalance = Math.max(0, balanceAfterScheduled - action.actualEarlyPayment);
    const shouldReducePayment = action.earlyPaymentType === 'reduce_payment';
    const newMonthsLeft =
      action.actualEarlyPayment > 0 && !shouldReducePayment
        ? estimateMonthsLeftAfterPrincipalPayment(
            balanceAfterScheduled,
            profile.annualInterestRate,
            profile.monthlyPayment,
            monthsAfterScheduled,
            action.actualEarlyPayment
          )
        : monthsAfterScheduled;
    const newMonthlyPayment =
      action.actualEarlyPayment > 0 && shouldReducePayment
        ? calculateMonthlyPayment(newBalance, profile.annualInterestRate, Math.max(1, monthsAfterScheduled))
        : profile.monthlyPayment;

    appState = {
      ...appState,
      loanProfile: {
        ...profile,
        remainingBalance: newBalance,
        monthsLeft: newMonthsLeft,
        monthlyPayment: newMonthlyPayment,
        currentEmergencyFund: profile.currentEmergencyFund + action.actualEmergencyAdded,
        updatedAt: createdAt
      },
      monthlyActions: [action, ...appState.monthlyActions]
    };
    notice = input.notice ?? 'Saved.';
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const amount = Math.max(0, pendingAction.amount ?? 0);

    if (pendingAction.kind === 'monthly') {
      recordAction({ paidScheduledMonth: true, notice: 'Monthly payment saved.' });
    } else if (pendingAction.kind === 'term') {
      recordAction({ actualEarlyPayment: amount, earlyPaymentType: 'reduce_term', notice: 'Anticipat payment saved.' });
    } else if (pendingAction.kind === 'payment') {
      recordAction({ actualEarlyPayment: amount, earlyPaymentType: 'reduce_payment', notice: 'Payment-reducing anticipat saved.' });
    } else if (pendingAction.kind === 'emergency') {
      recordAction({ actualEmergencyAdded: amount, notice: 'Emergency savings saved.' });
    }

    pendingAction = null;
  }

  function getHistoryTotals(actions: MonthlyAction[]) {
    return actions.reduce(
      (sum, action) => ({
        emergency: sum.emergency + action.actualEmergencyAdded,
        early: sum.early + action.actualEarlyPayment,
        termEarly: sum.termEarly + (action.earlyPaymentType === 'reduce_term' ? action.actualEarlyPayment : 0),
        paymentEarly: sum.paymentEarly + (action.earlyPaymentType === 'reduce_payment' ? action.actualEarlyPayment : 0),
        paidMonths: sum.paidMonths + (action.paidScheduledMonth ? 1 : 0)
      }),
      { emergency: 0, early: 0, termEarly: 0, paymentEarly: 0, paidMonths: 0 }
    );
  }

  function buildActionChartData(actions: MonthlyAction[]) {
    return actions.map((action) => ({
      month: action.month,
      reduceTerm: action.earlyPaymentType === 'reduce_term' ? action.actualEarlyPayment : 0,
      reducePayment: action.earlyPaymentType === 'reduce_payment' ? action.actualEarlyPayment : 0
    }));
  }

  function buildBalanceComparisonData(currentProfile: LoanProfile, totalEarlyPaid: number) {
    try {
      const baseline = simulateSchedule({
        balance: currentProfile.remainingBalance + totalEarlyPaid,
        annualInterestRate: currentProfile.annualInterestRate,
        monthlyPayment: currentProfile.monthlyPayment,
        monthsLeft: currentProfile.monthsLeft
      }).schedule;
      const current = simulateSchedule({
        balance: currentProfile.remainingBalance,
        annualInterestRate: currentProfile.annualInterestRate,
        monthlyPayment: currentProfile.monthlyPayment,
        monthsLeft: currentProfile.monthsLeft
      }).schedule;
      const maxLength = Math.max(baseline.length, current.length);
      const step = Math.max(1, Math.floor(maxLength / 12));
      const rows = [];

      for (let index = 0; index < maxLength; index += step) {
        rows.push({
          month: `M${index + 1}`,
          baseline: baseline[index]?.remainingBalance ?? 0,
          current: current[index]?.remainingBalance ?? 0
        });
      }
      return rows;
    } catch {
      return [];
    }
  }

  function getRemainingRepaymentTotal(currentProfile: LoanProfile) {
    try {
      const schedule = simulateSchedule({
        balance: currentProfile.remainingBalance,
        annualInterestRate: currentProfile.annualInterestRate,
        monthlyPayment: currentProfile.monthlyPayment,
        monthsLeft: currentProfile.monthsLeft
      }).schedule;
      return schedule.reduce((sum, month) => sum + month.payment, 0);
    } catch {
      return currentProfile.monthlyPayment * currentProfile.monthsLeft;
    }
  }

  function profileToForm(currentProfile: LoanProfile): ProfileFormState {
    return {
      remainingBalance: currentProfile.remainingBalance,
      originalBalance: currentProfile.originalBalance ?? currentProfile.remainingBalance,
      monthlyPayment: currentProfile.monthlyPayment,
      monthsLeft: currentProfile.monthsLeft,
      currentEmergencyFund: currentProfile.currentEmergencyFund
    };
  }

  function formatRepaymentType(type: MonthlyAction['earlyPaymentType']) {
    if (type === 'reduce_payment') return 'Reduce monthly payment';
    if (type === 'reduce_term') return 'Reduce term';
    return '';
  }

  function linePoints(rows: { baseline: number; current: number }[], key: 'baseline' | 'current') {
    if (rows.length === 0) return '';
    const max = Math.max(1, ...rows.flatMap((row) => [row.baseline, row.current]));
    return rows
      .map((row, index) => {
        const x = rows.length === 1 ? 32 : 32 + (index / (rows.length - 1)) * 576;
        const y = 244 - (row[key] / max) * 200;
        return `${x},${y}`;
      })
      .join(' ');
  }

  function getId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
</script>

{#if !hydrated}
  <AppShell class="flex items-center justify-center">
    <p class="text-sm text-muted-foreground">Loading Anticipat...</p>
  </AppShell>
{:else if !profile}
  <AppShell class="flex min-h-[80vh] flex-col justify-center">
    <div class="absolute right-4 top-4 z-50 sm:right-6 sm:top-6 md:right-10 md:top-8">
      {#if isClerkLoaded}
        {#if isSignedIn}
          <UserButton />
        {:else}
          <SignInButton mode="modal" asChild>
            {#snippet children({ signIn })}
              <Button type="button" variant="outline" onclick={signIn}>Sign in</Button>
            {/snippet}
          </SignInButton>
        {/if}
      {/if}
    </div>

    <form class="mx-auto w-full max-w-3xl space-y-5" onsubmit={(event) => { event.preventDefault(); createProfile(); }}>
      <div class="space-y-2 text-center">
        <h1 class="text-3xl font-semibold tracking-tight">Set up your Prima Casă Plus mortgage</h1>
        <p class="mx-auto mb-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Enter the payment from your schedule. The other loan value fills itself in.
        </p>
        {#if !isSignedIn}
          <p class="text-xs text-muted-foreground">
            Working locally. You can sign in to backup and sync your setup to the cloud.
          </p>
        {/if}
      </div>
      {#if setupError}
        <Alert class="border-destructive/30 bg-destructive/5 text-destructive">{setupError}</Alert>
      {/if}
      <SectionCard title="Loan details">
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <MoneyInput
              id="setupOriginalBalance"
              label="Original mortgage balance"
              value={setupForm.originalBalance}
              onValueChange={(value) => (setupForm = { ...setupForm, originalBalance: value })}
              onBlur={() => {
                if (setupForm.originalBalance < setupForm.remainingBalance) {
                  setupForm = { ...setupForm, originalBalance: setupForm.remainingBalance };
                }
              }}
            />
            <MoneyInput id="setupMonthlyPayment" label="Monthly payment" value={setupForm.monthlyPayment} onValueChange={(value) => (setupForm = updateFormFromMonthlyPayment(setupForm, value))} />
            <MoneyInput id="setupRemainingBalance" label="Remaining mortgage balance" value={setupForm.remainingBalance} onValueChange={(value) => (setupForm = updateFormFromRemainingBalance(setupForm, value))} />
            <MonthInput id="setupMonthsLeft" label="Months left" value={setupForm.monthsLeft} onValueChange={(value) => (setupForm = updateFormFromMonthsLeft(setupForm, value))} />
          </div>
        </div>
        <div class="mt-5 flex justify-end">
          <Button type="submit">Save mortgage profile</Button>
        </div>
      </SectionCard>
    </form>
  </AppShell>
{:else}
  <AppShell>
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight">Anticipat</h1>
          <p class="text-sm leading-6 text-muted-foreground">Plan your Prima Casă Plus early repayment.</p>
        </div>
        {#if isClerkLoaded}
          {#if isSignedIn}
            <UserButton />
          {:else}
            <SignInButton mode="modal" asChild>
              {#snippet children({ signIn })}
                <Button type="button" variant="outline" onclick={signIn}>Sign in to save progress</Button>
              {/snippet}
            </SignInButton>
          {/if}
        {/if}
      </div>

      <Tabs.Root bind:value={tab}>
        <Tabs.List>
          <Tabs.Trigger value="dashboard">Dashboard</Tabs.Trigger>
          <Tabs.Trigger value="history">History</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="dashboard">
          <div class="space-y-6">
            {#if paymentError}
              <Alert class="border-destructive/30 bg-destructive/5 text-destructive">{paymentError}</Alert>
            {/if}
            {#if notice}
              <Alert>{notice}</Alert>
            {/if}

            <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div class="space-y-6">
                <SectionCard title="Required payment">
                  <div class="grid gap-4 sm:grid-cols-3">
                    <div class="rounded-md border p-4">
                      <div class="text-sm text-muted-foreground">Monthly payment</div>
                      <div class="mt-1 text-lg font-semibold">{formatMoney(profile.monthlyPayment)}</div>
                    </div>
                    <div class="rounded-md border p-4">
                      <div class="text-sm text-muted-foreground">Interest</div>
                      <div class="mt-1 text-lg font-semibold">{formatMoney(monthlyInterest)}</div>
                    </div>
                    <div class="rounded-md border p-4">
                      <div class="text-sm text-muted-foreground">Principal</div>
                      <div class="mt-1 text-lg font-semibold">{formatMoney(Math.max(0, monthlyPrincipal))}</div>
                    </div>
                  </div>
                  <div class="mt-5">
                    <Button
                      type="button"
                      onclick={() =>
                        (pendingAction = {
                          kind: 'monthly',
                          title: 'Pay monthly payment?',
                          description: `${formatMoney(profile.monthlyPayment)} will be recorded. Balance will drop by ${formatMoney(Math.max(0, monthlyPrincipal))}.`
                        })}
                    >
                      Pay monthly payment
                    </Button>
                  </div>
                </SectionCard>

                <SectionCard title="Anticipat payments">
                  <div class="divide-y rounded-md border">
                    <div class="grid gap-4 p-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
                      <div>
                        <div class="text-sm font-medium">Pay anticipat one month</div>
                        <p class="mt-1 text-sm leading-6 text-muted-foreground">Keeps the monthly payment and reduces the term.</p>
                      </div>
                      <MoneyInput id="termAmount" label="Amount" bind:value={termAmount} />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={termAmount <= 0}
                        onclick={() =>
                          (pendingAction = {
                            kind: 'term',
                            amount: termAmount,
                            title: 'Pay anticipat one month?',
                            description: `${formatMoney(termAmount)} will be paid toward principal and the term will be recalculated.`
                          })}
                      >Pay one month</Button>
                    </div>
                    <div class="grid gap-4 p-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
                      <div>
                        <div class="text-sm font-medium">Pay anticipat from total sum</div>
                        <p class="mt-1 text-sm leading-6 text-muted-foreground">Reduces the principal and recalculates the monthly payment.</p>
                      </div>
                      <MoneyInput id="totalAmount" label="Amount" bind:value={totalAmount} />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={totalAmount <= 0}
                        onclick={() =>
                          (pendingAction = {
                            kind: 'payment',
                            amount: totalAmount,
                            title: 'Pay anticipat from total sum?',
                            description: `${formatMoney(totalAmount)} will be paid toward principal and the monthly payment will be recalculated.`
                          })}
                      >Pay from total</Button>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Savings">
                  <div class="divide-y rounded-md border">
                    <div class="grid gap-4 p-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
                      <div>
                        <div class="text-sm font-medium">Emergency fund</div>
                        <p class="mt-1 text-sm leading-6 text-muted-foreground">Money saved outside the mortgage.</p>
                      </div>
                      <MoneyInput id="emergencyAmount" label="Amount" bind:value={emergencyAmount} />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={emergencyAmount <= 0}
                        onclick={() =>
                          (pendingAction = {
                            kind: 'emergency',
                            amount: emergencyAmount,
                            title: 'Add emergency savings?',
                            description: `${formatMoney(emergencyAmount)} will be added to the emergency fund.`
                          })}
                      >Add emergency</Button>
                    </div>
                  </div>
                </SectionCard>
              </div>

              <SectionCard title="Loan">
                <div class="divide-y rounded-md border">
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Original balance</span><span class="text-sm font-semibold">{formatMoney(profile.originalBalance)}</span></div>
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Remaining balance</span><span class="text-sm font-semibold">{formatMoney(profile.remainingBalance)}</span></div>
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Total left to pay</span><span class="text-sm font-semibold">{formatMoney(totalLeftToPay)}</span></div>
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Future interest</span><span class="text-sm font-semibold">{formatMoney(futureInterestLeft)}</span></div>
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Months left</span><span class="text-sm font-semibold">{formatYearsAndMonths(profile.monthsLeft)}</span></div>
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Monthly payment</span><span class="text-sm font-semibold">{formatMoney(profile.monthlyPayment)}</span></div>
                  <div class="flex items-center justify-between gap-4 p-4"><span class="text-sm text-muted-foreground">Program rate</span><span class="text-sm font-semibold">{formatPercent(PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE)}</span></div>
                </div>
              </SectionCard>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="history">
          <div class="space-y-6">
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Total paid anticipat" value={formatMoney(historyTotals.early)} />
              <StatCard label="Reduced term" value={formatMoney(historyTotals.termEarly)} />
              <StatCard label="Reduced payment" value={formatMoney(historyTotals.paymentEarly)} />
              <StatCard label="Estimated interest saved" value={formatMoney(historyImpact.interestSaved)} />
              <StatCard label="Estimated months saved" value={formatMonths(historyImpact.monthsSaved)} />
            </div>

            {#if appState.monthlyActions.length === 0}
              <EmptyState title="No confirmed actions yet" description="After you confirm what you did this month, your progress and charts will appear here." />
            {:else}
              <SectionCard title="Confirmed monthly actions">
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[920px] border-collapse text-sm">
                    <thead>
                      <tr class="border-b text-left text-muted-foreground">
                        <th class="py-2 pr-3 font-medium">Month</th>
                        <th class="py-2 pr-3 font-medium">Regular payment</th>
                        <th class="py-2 pr-3 font-medium">Emergency fund</th>
                        <th class="py-2 pr-3 font-medium">Early repayment</th>
                        <th class="py-2 pr-3 font-medium">Early type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each appState.monthlyActions as action (action.id)}
                        <tr class="border-b last:border-0">
                          <td class="py-3 pr-3">{formatMonthKey(action.month)}</td>
                          <td class="py-3 pr-3">{action.paidScheduledMonth ? 'Paid' : 'Not marked'}</td>
                          <td class="py-3 pr-3">{formatMoney(action.actualEmergencyAdded)}</td>
                          <td class="py-3 pr-3">{formatMoney(action.actualEarlyPayment)}</td>
                          <td class="py-3 pr-3">{formatRepaymentType(action.earlyPaymentType)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <div class="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Anticipat paid by type">
                  <svg class="h-72 w-full overflow-visible" viewBox="0 0 640 288" role="img" aria-label="Anticipat paid by type chart">
                    {#each actionChartData as row, index}
                      {@const barWidth = Math.max(18, 520 / Math.max(1, actionChartData.length) - 12)}
                      {@const x = 56 + index * (520 / Math.max(1, actionChartData.length))}
                      {@const termHeight = (row.reduceTerm / maxActionChartTotal) * 200}
                      {@const paymentHeight = (row.reducePayment / maxActionChartTotal) * 200}
                      <rect x={x} y={244 - termHeight} width={barWidth} height={termHeight} rx="4" fill="#0f766e" />
                      <rect x={x} y={244 - termHeight - paymentHeight} width={barWidth} height={paymentHeight} rx="4" fill="#b45309" />
                      <text x={x + barWidth / 2} y="268" text-anchor="middle" class="fill-muted-foreground text-[11px]">{row.month}</text>
                    {/each}
                    <line x1="44" y1="244" x2="612" y2="244" stroke="currentColor" class="text-border" />
                    <text x="44" y="28" class="fill-muted-foreground text-xs">{formatMoney(maxActionChartTotal)}</text>
                    <circle cx="452" cy="24" r="5" fill="#0f766e" /><text x="464" y="28" class="fill-muted-foreground text-xs">Reduce term</text>
                    <circle cx="548" cy="24" r="5" fill="#b45309" /><text x="560" y="28" class="fill-muted-foreground text-xs">Reduce payment</text>
                  </svg>
                </SectionCard>

                <SectionCard title="Loan balance comparison">
                  <svg class="h-72 w-full overflow-visible" viewBox="0 0 640 288" role="img" aria-label="Loan balance comparison chart">
                    <polyline points={linePoints(balanceData, 'baseline')} fill="none" stroke="#a8a29e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <polyline points={linePoints(balanceData, 'current')} fill="none" stroke="#0f766e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <line x1="32" y1="244" x2="608" y2="244" stroke="currentColor" class="text-border" />
                    {#each balanceData as row, index}
                      {#if index % Math.max(1, Math.ceil(balanceData.length / 4)) === 0}
                        <text x={32 + (index / Math.max(1, balanceData.length - 1)) * 576} y="268" text-anchor="middle" class="fill-muted-foreground text-[11px]">{row.month}</text>
                      {/if}
                    {/each}
                    <circle cx="408" cy="24" r="5" fill="#a8a29e" /><text x="420" y="28" class="fill-muted-foreground text-xs">Without early repayment</text>
                    <circle cx="548" cy="24" r="5" fill="#0f766e" /><text x="560" y="28" class="fill-muted-foreground text-xs">Current path</text>
                  </svg>
                </SectionCard>
              </div>
            {/if}
          </div>
        </Tabs.Content>

        <Tabs.Content value="settings">
          <div class="space-y-6">
            {#if settingsMessage}
              <Alert>{settingsMessage}</Alert>
            {/if}
            <SectionCard title="Loan profile">
              <div class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <MoneyInput
                    id="settingsOriginalBalance"
                    label="Original mortgage balance"
                    value={settingsForm.originalBalance}
                    onValueChange={(value) => (settingsForm = { ...settingsForm, originalBalance: value })}
                    onBlur={() => {
                      if (settingsForm.originalBalance < settingsForm.remainingBalance) {
                        settingsForm = { ...settingsForm, originalBalance: settingsForm.remainingBalance };
                      }
                    }}
                  />
                  <MoneyInput id="settingsMonthlyPayment" label="Monthly payment" value={settingsForm.monthlyPayment} onValueChange={(value) => (settingsForm = updateFormFromMonthlyPayment(settingsForm, value))} />
                  <MoneyInput id="settingsRemainingBalance" label="Remaining mortgage balance" value={settingsForm.remainingBalance} onValueChange={(value) => (settingsForm = updateFormFromRemainingBalance(settingsForm, value))} />
                  <MonthInput id="settingsMonthsLeft" label="Months left" value={settingsForm.monthsLeft} onValueChange={(value) => (settingsForm = updateFormFromMonthsLeft(settingsForm, value))} />
                </div>
              </div>
              <div class="mt-5 flex justify-between gap-4">
                <Button type="button" variant="destructive" onclick={() => (showConfirmReset = true)}>Reset mortgage</Button>
                <Button type="button" onclick={saveSettings}>Save changes</Button>
              </div>
            </SectionCard>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>

    <Dialog.Root open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) pendingAction = null; }}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{pendingAction?.title ?? ''}</Dialog.Title>
          <Dialog.Description>{pendingAction?.description ?? ''}</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button type="button" variant="outline" onclick={() => (pendingAction = null)}>Cancel</Button>
          <Button type="button" onclick={confirmPendingAction}>Yes</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <Dialog.Root open={showConfirmReset} onOpenChange={(open) => { if (!open) showConfirmReset = false; }}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Reset mortgage profile?</Dialog.Title>
          <Dialog.Description>
            This will permanently delete your mortgage profile and all monthly actions. This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button type="button" variant="outline" onclick={() => (showConfirmReset = false)}>Cancel</Button>
          <Button type="button" variant="destructive" onclick={handleReset}>Reset mortgage</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </AppShell>
{/if}
