// You may change the numbers while testing, but keep the names.
// The reviewer replaces this file with shorter times (for example 8 s and 4 s) before running
// their checks, so always read these values from here. Do not copy the numbers anywhere else.

export const SESSION_CONFIG = {
  /** Sign out after this long with no activity in any tab. Production would use 15 to 30 minutes. */
  idleTimeoutMs: 30_000,
  /** Show the warning this long before the idle sign-out. */
  warningBeforeMs: 10_000,
};
