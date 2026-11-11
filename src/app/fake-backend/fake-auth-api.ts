// DO NOT CHANGE THIS FILE. It stands in for the real authentication server,
// and the reviewer's checks read the calls it records.
import { Injectable, signal } from '@angular/core';

export interface LoginResponse {
  user: string;
  token: string;
}

interface ApiRecord {
  logins: Array<{ user: string; token: string; at: number }>;
  logouts: Array<{ token: string; at: number }>;
}

declare global {
  interface Window {
    __fakeAuthApi?: ApiRecord;
  }
}

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

@Injectable({ providedIn: 'root' })
export class FakeAuthApi {
  /** Calls made from this tab, shown in the header. */
  readonly loginCalls = signal(0);
  readonly logoutCalls = signal(0);

  private readonly record: ApiRecord = (window.__fakeAuthApi ??= { logins: [], logouts: [] });

  /** Any username works. The password is "demo". Rejects with an Error otherwise. */
  async login(username: string, password: string): Promise<LoginResponse> {
    await delay(300);
    const user = username.trim();
    if (!user || password !== 'demo') throw new Error('Wrong username or password.');
    const token = 'tok-' + Math.random().toString(36).slice(2, 10);
    this.record.logins.push({ user, token, at: Date.now() });
    this.loginCalls.update(n => n + 1);
    return { user, token };
  }

  /**
   * Ends the session on the server. Call it once per sign-out, from one tab only:
   * the server's audit log treats each call as a separate sign-out.
   */
  async logout(token: string): Promise<void> {
    this.record.logouts.push({ token, at: Date.now() });
    this.logoutCalls.update(n => n + 1);
    console.info('[fake server] logout', token);
    await delay(200);
  }
}
