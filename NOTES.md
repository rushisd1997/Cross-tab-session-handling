# Claims Portal – Session handling

## What this assignment does

This assignment implements a browser session for the Claims Portal. A signed-in session is shared by tabs in the same browser profile. User activity in any tab updates the shared idle timestamp. When the warning period starts, each tab displays the warning and countdown. The user must explicitly choose **Stay signed in** to extend the session; ordinary mouse and keyboard activity does not extend it once the warning period has started.

The service also synchronizes login and logout, preserves a tab ID across reloads, and stores Claim notes in tab-specific session storage.

## Files

- `src/app/session/session.service.ts` – implementation. The existing public members and method signatures are retained.
- `session.models.ts`, `session-config.ts`, and `fake-auth-api.ts` are not changed.

## Main implementation choices

- **Angular Signals:** `state` and `tabId` remain signals because the existing pages consume them reactively.
- **BroadcastChannel:** sends login, logout, activity, and stay-signed-in updates between open tabs without reloading.
- **Storage event and localStorage:** provide shared session persistence and a cross-tab notification fallback when BroadcastChannel is unavailable.
- **Timestamp-based timeout:** the service calculates remaining time from `lastActivity` and `Date.now()`. It checks again on timer ticks, focus, page show, and visibility changes, so a delayed background timer does not grant extra session time after the browser wakes.
- **Web Locks:** coordinates logout so only one tab completes the server logout when the browser supports the Web Locks API. A localStorage fallback is used otherwise.
- **Tab-specific drafts:** Claim notes use `sessionStorage` with both the session ID and tab ID in the key. A duplicated tab that inherits session storage is detected during navigation initialization and receives a new ID; copied draft entries are removed before the page loads them.
- **Storage failure:** storage access is guarded with `try/catch`; the current tab can continue using in-memory state when browser storage is blocked.

## Configuration

All timeout values are read from `SESSION_CONFIG` (`idleTimeoutMs` and `warningBeforeMs`). The service does not hard-code the timeout durations.

## Manual testing performed / recommended

This deliverable was prepared from the supplied service, models, configuration, and fake API source. A full Angular project was not included, so a complete `ng build` and real multi-tab browser test could not be run here. Please run the following checks in the supplied project before submission:

1. Sign in in one tab and verify other open tabs and a newly opened tab show the home page.
2. Sign out in one tab and verify that tab reports `MANUAL`, while other tabs report `OTHER_TAB`.
3. Inspect `window.__fakeAuthApi.logouts.length`; one sign-out should add exactly one record.
4. Temporarily shorten `SESSION_CONFIG` and test the warning, Stay signed in, idle sign-out, and activity in another tab.
5. Leave a tab in the background past the timeout, return to it, and verify immediate sign-out.
6. Reload a tab and verify its ID and its own draft persist.
7. Duplicate a tab and verify the duplicate has a different ID and an empty draft. Then enter different notes in each tab and reload both.
8. Sign out and sign in again; verify the previous drafts are not restored.
9. Test with storage disabled if the browser permits it, and check the console for errors.

The duplicate-tab behaviour depends on the browser's Navigation Timing entry reporting a duplicated tab as a new navigation. Verify it in the target Chrome version and any other browser used by the reviewer. Browser-specific duplicate-tab behaviour is not guaranteed identically across all browsers.

## Tools used

- **Visual Studio Code** – intended editor for integrating and running the Angular project.
- **Chrome DevTools** – intended for checking browser console output, tab behaviour, and the fake API audit record.
- **ChatGPT (OpenAI)** – used as an AI coding assistant to review the supplied session service, identify the duplicate-tab/sessionStorage issue, prepare the service changes, and draft this explanation. The code should be reviewed and understood by the candidate before the follow-up interview.
