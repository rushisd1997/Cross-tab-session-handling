# Claims Portal: take-home task

The task is in **[TASK.md](TASK.md)**.

## Setup

You need **Node.js 18.19.1 or later, 20.11.1 or later, or 22 or later** ([nodejs.org](https://nodejs.org), LTS version). The first run needs internet access to install packages.

| System | Command |
|---|---|
| Windows | Double-click `start.bat`, or run it in a terminal |
| macOS or Linux | `sh start.sh` |
| Any, by hand | `npm ci`, then `npm start` |

On Windows, unzip to a short path such as `C:\work`. Very deep folders can exceed the Windows path-length limit during install.

Then open http://localhost:4200. Sign in with any username and the password `demo`.

Before you start, the login page shows `Not implemented` when you sign in. That is expected.

## Testing with several tabs

- Open http://localhost:4200 in two or three tabs of the **same** browser window. Private windows do not share storage with normal ones.
- Keep two windows side by side to watch both tabs at once.
- Shorten the times in `src/app/session/session-config.ts` while you work.
- The header shows this tab's ID, its calls to the fake server, and how often Angular change detection has run.

## Submitting

See the end of [TASK.md](TASK.md).
