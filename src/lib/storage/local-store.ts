import type { AppState, LoanProfile, MonthlyAction } from "$lib/types/app";
import { PRIMA_CASA_PLUS_ANNUAL_INTEREST_RATE } from "$lib/finance/mortgage";
import { AppStateSchema } from "$lib/validation/schemas";

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

// ---------------------------------------------------------------------------
// Server sync helpers — pull from / push to Cloudflare D1 via API routes
// ---------------------------------------------------------------------------

/**
 * Load the user's AppState from Cloudflare D1 (via API routes) and merge it
 * into localStorage.  Returns the merged state.
 * Silently falls back to the current localStorage state on any error.
 */
export async function syncFromServer(): Promise<AppState> {
  try {
    const [profileRes, actionsRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/actions")
    ]);

    if (!profileRes.ok || !actionsRes.ok) {
      return loadAppState();
    }

    const { profile } = (await profileRes.json()) as { profile: LoanProfile | null };
    const { actions } = (await actionsRes.json()) as { actions: MonthlyAction[] };

    const serverState: AppState = {
      loanProfile: profile,
      monthlyActions: actions,
      version: 1
    };

    const normalized = normalizeAppState(serverState);
    saveAppState(normalized);
    return normalized;
  } catch {
    return loadAppState();
  }
}

/**
 * Push the current AppState to Cloudflare D1 (via API routes).
 * Fires-and-forgets — does not block the UI.
 */
export async function syncToServer(state: AppState): Promise<void> {
  try {
    const requests: Promise<Response>[] = [];

    if (state.loanProfile) {
      requests.push(
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.loanProfile)
        })
      );
    }

    for (const action of state.monthlyActions) {
      requests.push(
        fetch("/api/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action)
        })
      );
    }

    await Promise.all(requests);
  } catch (err) {
    // Non-critical — data is already safely in localStorage
    console.warn("[syncToServer] failed:", err);
  }
}
