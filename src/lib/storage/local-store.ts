import type { AppState } from "@/types/app";
import { PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE } from "@/lib/finance/mortgage";
import { AppStateSchema } from "@/lib/validation/schemas";

export const STORAGE_KEY = "anticipat-app-state-v1";

export const emptyAppState: AppState = {
  loanProfile: null,
  monthlyActions: [],
  version: 1
};

function normalizeAppState(state: AppState): AppState {
  if (!state.loanProfile) {
    return state;
  }

  return {
    ...state,
    loanProfile: {
      ...state.loanProfile,
      annualInterestRate: PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE,
      repaymentStrategy: state.loanProfile.repaymentStrategy ?? "reduce_term"
    }
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadAppState(): AppState {
  if (!canUseStorage()) {
    return emptyAppState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return emptyAppState;
  }

  try {
    return normalizeAppState(AppStateSchema.parse(JSON.parse(raw)));
  } catch {
    return emptyAppState;
  }
}

export function saveAppState(state: AppState): void {
  if (!canUseStorage()) {
    return;
  }

  const parsed = AppStateSchema.parse(normalizeAppState(state));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
}
