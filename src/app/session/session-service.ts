import { Injectable, NgZone, Signal, inject, signal } from '@angular/core';
import { FakeAuthApi } from '../fake-backend/fake-auth-api';
import { SESSION_CONFIG } from './session-config';
import { LogoutReason, SessionState } from './session.models';

interface SharedSession {
  phase: 'ACTIVE' | 'LOGGED_OUT';
  user: string | null;
  token: string | null;
  sessionId: string | null;
  lastActivity: number;
  logoutReason: LogoutReason | null;
  logoutTabId: string | null;
}

interface SessionMessage {
  type: 'SESSION' | 'ACTIVITY' | 'STAY_SIGNED_IN' | 'TAB_ID' | 'TAB_ID_TAKEN';
  session?: SharedSession;
  sessionId?: string;
  at?: number;
  tabId?: string;
}

const SESSION_KEY = 'claims-portal-session';
const CHANNEL_NAME = 'claims-portal-session';
const TAB_ID_KEY = 'claims-portal-tab-id';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(FakeAuthApi);
  private readonly zone = inject(NgZone);
  private readonly config = SESSION_CONFIG;

  private readonly stateSignal = signal<SessionState>({
    phase: 'LOGGED_OUT',
    user: null,
    secondsLeft: null,
    logoutReason: null,
  });

  readonly state: Signal<SessionState> = this.stateSignal;
  readonly tabId = signal(this.getTabId());

  private channel: BroadcastChannel | null = null;
  private sharedSession: SharedSession | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastStorageWrite = 0;
  private lastBroadcast = 0;
  private draftMemory = '';
  private duplicateTabDetected = false;

  constructor() {
    this.openChannel();
    this.checkForDuplicateTab();
    this.listenForBrowserEvents();
    this.restoreSession();
    this.startTimer();
  }

  async login(username: string, password: string): Promise<void> {
    const response = await this.api.login(username, password);
    const now = Date.now();

    const session: SharedSession = {
      phase: 'ACTIVE',
      user: response.user,
      token: response.token,
      sessionId: this.createId(),
      lastActivity: now,
      logoutReason: null,
      logoutTabId: null,
    };

    this.sharedSession = session;
    this.writeSession(session, true);
    this.postMessage({ type: 'SESSION', session });
    this.clearDraft();
    this.setState({
      phase: 'ACTIVE',
      user: response.user,
      secondsLeft: null,
      logoutReason: null,
    });
  }

  logout(): void {
    void this.endSession('MANUAL');
  }

  staySignedIn(): void {
    const session = this.getCurrentSession();
    if (!session || session.phase !== 'ACTIVE') return;

    session.lastActivity = Date.now();
    session.logoutReason = null;
    session.logoutTabId = null;
    this.sharedSession = session;

    this.writeSession(session, true);
    this.postMessage({
      type: 'STAY_SIGNED_IN',
      sessionId: session.sessionId ?? undefined,
      at: session.lastActivity,
    });

    this.setState({
      phase: 'ACTIVE',
      user: session.user,
      secondsLeft: null,
      logoutReason: null,
    });
  }

  loadDraft(): string {
    const session = this.getCurrentSession();
    if (!session?.sessionId) return '';

    const key = this.getDraftKey(session.sessionId);

    try {
      const saved = sessionStorage.getItem(key);
      this.draftMemory = saved ?? '';
      return this.draftMemory;
    } catch {
      return this.draftMemory;
    }
  }

  saveDraft(text: string): void {
    const session = this.getCurrentSession();
    if (!session?.sessionId || session.phase !== 'ACTIVE') return;

    this.draftMemory = text;

    try {
      sessionStorage.setItem(this.getDraftKey(session.sessionId), text);
    } catch {
      // Keep the draft in memory when browser storage is unavailable.
    }
  }

  private openChannel(): void {
    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = event => {
          this.handleMessage(event.data as SessionMessage);
        };
      }
    } catch {
      this.channel = null;
    }
  }

  private listenForBrowserEvents(): void {
    window.addEventListener('storage', event => {
      if (event.key !== SESSION_KEY || !event.newValue) return;

      try {
        this.applySharedSession(JSON.parse(event.newValue) as SharedSession);
      } catch {
        // Ignore invalid or incomplete storage data.
      }
    });

    const activityEvents = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart'];

    this.zone.runOutsideAngular(() => {
      activityEvents.forEach(eventName => {
        window.addEventListener(eventName, () => this.recordActivity(), { passive: true });
      });

      window.addEventListener('focus', () => this.checkSession());
      window.addEventListener('pageshow', () => this.checkSession());
      document.addEventListener('visibilitychange', () => this.checkSession());
    });
  }

  private restoreSession(): void {
    const session = this.readSession();
    if (!session || session.phase !== 'ACTIVE') {
      this.setState({
        phase: 'LOGGED_OUT',
        user: null,
        secondsLeft: null,
        logoutReason: session?.logoutReason ?? null,
      });
      return;
    }

    this.sharedSession = session;

    if (Date.now() >= session.lastActivity + this.config.idleTimeoutMs) {
      void this.endSession('IDLE');
      return;
    }

    this.updateStateFromTime();
  }

  private startTimer(): void {
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.checkSession(), 250);
    });
  }

  private checkSession(): void {
    const stored = this.readSession();
    if (stored) {
      if (stored.phase === 'ACTIVE') {
        const current = this.sharedSession;
        if (current?.phase === 'ACTIVE' &&
            current.sessionId === stored.sessionId) {
          stored.lastActivity = Math.max(stored.lastActivity, current.lastActivity);
        }
        this.sharedSession = stored;
      } else {
        this.applySharedSession(stored);
        return;
      }
    }

    const session = this.getCurrentSession();
    if (!session || session.phase !== 'ACTIVE') return;

    const remaining = session.lastActivity + this.config.idleTimeoutMs - Date.now();

    if (remaining <= 0) {
      void this.endSession('IDLE');
      return;
    }

    this.updateStateFromTime(remaining);
  }

  private updateStateFromTime(remaining?: number): void {
    const session = this.getCurrentSession();
    if (!session || session.phase !== 'ACTIVE') return;

    const timeLeft = remaining ??
      session.lastActivity + this.config.idleTimeoutMs - Date.now();

    if (timeLeft <= 0) {
      void this.endSession('IDLE');
      return;
    }

    if (timeLeft <= this.config.warningBeforeMs) {
      const seconds = Math.ceil(timeLeft / 1000);
      const current = this.stateSignal();

      if (current.phase !== 'WARNING' || current.secondsLeft !== seconds) {
        this.setState({
          phase: 'WARNING',
          user: session.user,
          secondsLeft: seconds,
          logoutReason: null,
        });
      }
    } else {
      const current = this.stateSignal();
      if (current.phase !== 'ACTIVE' || current.user !== session.user) {
        this.setState({
          phase: 'ACTIVE',
          user: session.user,
          secondsLeft: null,
          logoutReason: null,
        });
      }
    }
  }

  private recordActivity(): void {
    const session = this.getCurrentSession();
    if (!session || session.phase !== 'ACTIVE') return;

    const now = Date.now();
    const warningStartedAt = session.lastActivity +
      this.config.idleTimeoutMs - this.config.warningBeforeMs;
    if (now >= warningStartedAt) return;

    session.lastActivity = now;
    this.sharedSession = session;

    // Broadcast activity immediately, but limit storage writes.
    this.postMessage({
      type: 'ACTIVITY',
      sessionId: session.sessionId ?? undefined,
      at: now,
    });

    if (now - this.lastStorageWrite >= 500) {
      this.writeSession(session);
    }

    if (this.stateSignal().phase === 'WARNING') {
      this.setState({
        phase: 'ACTIVE',
        user: session.user,
        secondsLeft: null,
        logoutReason: null,
      });
    }
  }

  private async endSession(reason: LogoutReason): Promise<void> {
    const session = this.getCurrentSession();
    if (!session || session.phase !== 'ACTIVE' || !session.sessionId) {
      if (reason === 'MANUAL') {
        this.setState({
          phase: 'LOGGED_OUT',
          user: null,
          secondsLeft: null,
          logoutReason: 'MANUAL',
        });
      }
      return;
    }

    const finish = async (): Promise<void> => {
      const latest = this.readSession() ?? this.sharedSession;

      // Another tab may already have completed this sign-out.
      if (!latest || latest.phase !== 'ACTIVE' ||
          latest.sessionId !== session.sessionId) return;

      const loggedOut: SharedSession = {
        ...latest,
        phase: 'LOGGED_OUT',
        user: null,
        token: null,
        logoutReason: reason,
        logoutTabId: this.tabId(),
      };

      this.sharedSession = loggedOut;
      this.writeSession(loggedOut, true);
      this.clearDraft();

      this.postMessage({ type: 'SESSION', session: loggedOut });
      this.setState({
        phase: 'LOGGED_OUT',
        user: null,
        secondsLeft: null,
        logoutReason: reason,
      });

      if (latest.token) {
        await this.api.logout(latest.token);
      }
    };

    const lockManager = (navigator as Navigator & {
      locks?: { request: (name: string, callback: () => Promise<void>) => Promise<void> };
    }).locks;

    if (lockManager?.request) {
      try {
        await lockManager.request(`claims-logout-${session.sessionId}`, finish);
        return;
      } catch {
        // Use the storage-based fallback if browser locks are unavailable.
      }
    }

    this.finishWithStorageLock(session, reason, finish);
  }

  private finishWithStorageLock(
    session: SharedSession,
    reason: LogoutReason,
    finish: () => Promise<void>,
  ): void {
    const lockKey = `claims-logout-complete-${session.sessionId}`;

    try {
      if (localStorage.getItem(lockKey)) return;
      localStorage.setItem(lockKey, this.tabId());
      void finish();
    } catch {
      // Storage-blocked browsers still support signing out in this tab.
      void finish();
    }
  }

  private handleMessage(message: SessionMessage): void {
    if (!message) return;

    if (message.type === 'TAB_ID' && message.tabId === this.tabId()) {
      this.postMessage({ type: 'TAB_ID_TAKEN', tabId: this.tabId() });
      return;
    }

    if (message.type === 'TAB_ID_TAKEN' && message.tabId === this.tabId()) {
      this.duplicateTabDetected = true;
      return;
    }

    if (message.type === 'SESSION' && message.session) {
      this.applySharedSession(message.session);
      return;
    }

    if (message.type === 'ACTIVITY' || message.type === 'STAY_SIGNED_IN') {
      const session = this.getCurrentSession();
      if (!session || session.phase !== 'ACTIVE' ||
          session.sessionId !== message.sessionId || !message.at) return;

      if (message.type === 'ACTIVITY') {
        const warningStartedAt = session.lastActivity +
          this.config.idleTimeoutMs - this.config.warningBeforeMs;
        if (Date.now() >= warningStartedAt) return;
      }

      if (message.at > session.lastActivity) {
        session.lastActivity = message.at;
        this.sharedSession = session;
        this.updateStateFromTime();
      }
    }
  }

  private applySharedSession(session: SharedSession): void {
    this.sharedSession = session;

    if (session.phase === 'LOGGED_OUT') {
      this.clearDraft();
      const reason = session.logoutReason === 'MANUAL' &&
        session.logoutTabId !== this.tabId()
        ? 'OTHER_TAB'
        : session.logoutReason;

      const currentState = this.stateSignal();
      if (currentState.phase !== 'LOGGED_OUT' ||
          currentState.logoutReason !== reason) {
        this.setState({
          phase: 'LOGGED_OUT',
          user: null,
          secondsLeft: null,
          logoutReason: reason,
        });
      }
      return;
    }

    if (Date.now() >= session.lastActivity + this.config.idleTimeoutMs) {
      void this.endSession('IDLE');
      return;
    }

    this.updateStateFromTime();
  }

  private getCurrentSession(): SharedSession | null {
    return this.sharedSession;
  }

  private readSession(): SharedSession | null {
    try {
      const value = localStorage.getItem(SESSION_KEY);
      return value ? JSON.parse(value) as SharedSession : this.sharedSession;
    } catch {
      return this.sharedSession;
    }
  }

  private writeSession(session: SharedSession, force = false): void {
    const now = Date.now();
    if (!force && now - this.lastStorageWrite < 500) return;

    this.lastStorageWrite = now;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // The in-memory session keeps this tab working without storage.
    }
  }

  private postMessage(message: SessionMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // Cross-tab messaging may be unavailable in restricted browsers.
    }
  }

  private setState(state: SessionState): void {
    this.zone.run(() => this.stateSignal.set(state));
  }

  private getTabId(): string {
    try {
      const existing = sessionStorage.getItem(TAB_ID_KEY);
      if (existing) return existing;

      const id = this.createId();
      sessionStorage.setItem(TAB_ID_KEY, id);
      return id;
    } catch {
      return this.createId();
    }
  }

  private checkForDuplicateTab(): void {
    const id = this.tabId();
    this.postMessage({ type: 'TAB_ID', tabId: id });

    setTimeout(() => {
      if (!this.duplicateTabDetected) return;

      const newId = this.createId();
      this.tabId.set(newId);

      try {
        sessionStorage.setItem(TAB_ID_KEY, newId);
      } catch {
        // The generated ID remains available in memory.
      }
    }, 150);
  }

  private getDraftKey(sessionId: string): string {
    return `claims-draft-${sessionId}-${this.tabId()}`;
  }

  private clearDraft(): void {
    const session = this.sharedSession;
    if (session?.sessionId) {
      try {
        sessionStorage.removeItem(this.getDraftKey(session.sessionId));
      } catch {
        // Nothing else is needed when storage is blocked.
      }
    }
    this.draftMemory = '';
  }

  private createId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
}

