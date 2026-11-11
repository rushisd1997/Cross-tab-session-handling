# Take-home task: signing out across browser tabs

## Background

Claims staff keep the Claims Portal open in many tabs at once. Security rules say:

- after a period of inactivity, the user must be signed out, and
- signing out in one tab must sign the user out in every tab.

This project is a small Angular 19 app with a login page, a home page and a fake authentication server. Everything works except the session logic, which is your job.

## What you write

Write your code in **`src/app/session/session.service.ts`**. Keep its public members (`state`, `tabId`, `login`, `logout`, `staySignedIn`, `loadDraft`, `saveDraft`) with the same names and types, because the pages call them. You can add private members, files and classes as you like.

You should not need to change any other file. In particular:

| File | Rule |
|---|---|
| `src/app/fake-backend/fake-auth-api.ts` | Do not change. It stands in for the server |
| `src/app/session/session.models.ts` | Do not change. It holds the types the pages use |
| `src/app/session/session-config.ts` | Read the timings from here and nowhere else. **The reviewer runs your code with different values** |
| `package.json`, `package-lock.json`, `angular.json`, `.npmrc` | Do not change. **Do not add npm packages** |
| `src/app/pages/*`, `src/app/app.*` | You should not need to change these. If you do, explain why in `NOTES.md` |

## Requirements

"Every tab" means every tab of this app in the same browser profile. "Within 2 seconds" assumes the tabs are open and the computer is awake.

### 1. Signing in and out

1. When the user signs in in one tab, every other open tab, including one showing the login page, shows the home page within 2 seconds, without a reload. A tab opened later is already signed in.
2. When the user clicks **Sign out** in any tab, every tab shows the login page within 2 seconds, without a reload. The tab where they clicked shows the reason `MANUAL`, and the other tabs show `OTHER_TAB`.
3. Signing in and out must keep working, from any tab, as many times as the user likes.
4. Each sign-out must call `FakeAuthApi.logout()` exactly once, however many tabs are open.

### 2. Idle timeout

1. Activity means moving the mouse, clicking, typing, scrolling or touching, in **any** tab. Activity in one tab keeps every tab signed in.
2. When `warningBeforeMs` is left before the timeout, every tab shows the warning, with a countdown. While the warning is showing, only **Stay signed in** keeps the session alive, and clicking it in any tab closes the warning in every tab. Moving the mouse does not close the warning.
3. After `idleTimeoutMs` with no activity, every tab signs out, with the reason `IDLE`.
4. The sign-out must happen on time even though browsers slow down timers in background tabs and stop them while the computer sleeps. If the computer wakes after the timeout has passed, sign out immediately. Never allow extra time.
5. If the user closes every tab and opens the app again after the timeout has passed, it must show the login page.
6. Signing in again after a timeout starts a fresh session with the full time.

### 3. Tab ID

Each tab shows its own ID in the header.

1. The ID stays the same when that tab is reloaded.
2. No two open tabs show the same ID, including a tab opened with `window.open()` or the browser's **Duplicate tab**.

### 4. Claim notes draft

The **Claim notes** box on the home page is a draft that belongs to one tab.

1. It survives a reload of that tab.
2. It is not shown in other tabs. A new tab starts with an empty box.
3. When the session ends, for any reason, the draft is deleted from every tab. A user who signs in again must never see a draft from an earlier session.

### 5. Quality

1. Do not run Angular change detection on every mouse movement, and do not write to storage on every mouse movement.
2. Other features of the site store their own data in `localStorage`. Do not delete data that your code did not create.
3. Some browsers or privacy settings block storage, so that using it throws an error. The app must then still work in a single tab, without errors.
4. No uncaught errors in the browser console.

## Out of scope

- The real server, real tokens and cookies.
- Styling.
- Automated tests are welcome but optional. No test runner is installed and you must not add packages, so describe how you tested in `NOTES.md` instead.

## Running it

See `README.md`. Test with several tabs of the same browser window. Shorten the times in `session-config.ts` while you work, for example to 20 and 10 seconds.

## Submitting

1. Fill in `NOTES.md`.
2. Push the project to a new GitHub or GitLab repository. `node_modules` is already excluded by `.gitignore`. Keep the commit history: small commits are welcome.
3. Reply to the email with the repository link. If the repository is private, give read access to the email address you were sent.

You may use any tools, including AI assistants. Say in `NOTES.md` which ones you used and for what. In the follow-up call you will be asked to walk through your code and change it live, without AI help.
