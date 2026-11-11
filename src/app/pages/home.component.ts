// You should not need to change this file.
import { Component, inject, signal } from '@angular/core';
import { SESSION_CONFIG } from '../session/session-config';
import { SessionService } from '../session/session-service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <h1>Welcome, <span data-testid="user">{{ session.state().user }}</span></h1>
    <p class="hint">Session phase: <strong data-testid="phase">{{ session.state().phase }}</strong></p>

    <div class="card">
      <label for="draft">Claim notes (draft)</label>
      <textarea id="draft" rows="6" data-testid="draft" [value]="draft" (input)="onInput($event)"
                placeholder="Type here. The text belongs to this tab only."></textarea>
      @if (error()) { <p class="error">{{ error() }}</p> }
      <p><button type="button" data-testid="logout" (click)="logout()">Sign out</button></p>
    </div>

    <div class="card hint">
      Idle timeout {{ config.idleTimeoutMs / 1000 }} s, warning {{ config.warningBeforeMs / 1000 }} s before it.
      Open this page in more tabs to test them together.
    </div>
  `,
})
export class HomeComponent {
  readonly session = inject(SessionService);
  readonly config = SESSION_CONFIG;
  readonly draft = this.session.loadDraft();
  readonly error = signal('');

  onInput(event: Event): void {
    this.session.saveDraft((event.target as HTMLTextAreaElement).value);
  }

  logout(): void {
    this.error.set('');
    try {
      this.session.logout();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    }
  }
}
