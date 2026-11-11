// You should not need to change this file.
import { AfterViewInit, Component, DoCheck, ElementRef, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FakeAuthApi } from './fake-backend/fake-auth-api';
import { SessionWarningComponent } from './pages/session-warning.component';
import { SessionService } from './session/session-service';

declare global {
  interface Window {
    __changeDetectionRuns?: number;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SessionWarningComponent],
  template: `
    <header>
      <strong>Claims Portal</strong>
      <span>Tab ID: <code data-testid="tab-id">{{ session.tabId() }}</code></span>
      <span class="spacer"></span>
      <span class="small">
        This tab's server calls: login {{ api.loginCalls() }}, logout {{ api.logoutCalls() }}
        · change detection runs: <span #cdCount data-testid="cd-count">0</span>
      </span>
    </header>
    <main><router-outlet /></main>
    <app-session-warning />
  `,
  styles: [`
    header { display: flex; gap: 20px; align-items: center; padding: 12px 24px; background: #1f2937; color: #fff; }
    header code { background: #374151; padding: 1px 6px; border-radius: 4px; }
    .spacer { flex: 1; }
    .small { font-size: 12px; color: #cbd5e1; }
    main { max-width: 760px; margin: 0 auto; padding: 24px; }
  `],
})
export class AppComponent implements DoCheck, AfterViewInit {
  readonly session = inject(SessionService);
  readonly api = inject(FakeAuthApi);
  private readonly router = inject(Router);
  private readonly cdCount = viewChild<ElementRef<HTMLElement>>('cdCount');
  private runs = 0;
  private readonly signedIn = computed(() => this.session.state().phase !== 'LOGGED_OUT');

  constructor() {
    // Moves this tab between the login and home pages whenever the session starts or ends.
    effect(() => {
      const signedIn = this.signedIn();
      untracked(() => {
        const url = this.router.url;
        if (!signedIn && url.startsWith('/home')) void this.router.navigateByUrl('/login');
        if (signedIn && url.startsWith('/login')) void this.router.navigateByUrl('/home');
      });
    });
  }

  // Written straight to the DOM, so that showing the count does not itself cause change detection.
  ngDoCheck(): void {
    this.runs++;
    window.__changeDetectionRuns = this.runs;
    const el = this.cdCount();
    if (el) el.nativeElement.textContent = String(this.runs);
  }

  ngAfterViewInit(): void {
    this.ngDoCheck();
  }
}
