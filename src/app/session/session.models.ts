// DO NOT CHANGE THIS FILE. The pages are built against these types.

export type SessionPhase = 'LOGGED_OUT' | 'ACTIVE' | 'WARNING';

/**
 * Why this tab is showing the login page.
 * MANUAL: the user clicked "Sign out" in this tab.
 * IDLE: the session timed out.
 * OTHER_TAB: the user clicked "Sign out" in another tab.
 */
export type LogoutReason = 'MANUAL' | 'IDLE' | 'OTHER_TAB';

export interface SessionState {
  phase: SessionPhase;
  /** The signed-in user, or null when signed out. */
  user: string | null;
  /** Whole seconds until the idle sign-out, while phase is WARNING. Otherwise null. */
  secondsLeft: number | null;
  /** Why the last sign-out happened, or null if this tab has not seen one. */
  logoutReason: LogoutReason | null;
}
