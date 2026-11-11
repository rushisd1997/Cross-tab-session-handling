// You should not need to change this file.
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../session/session-service';

const REASON_TEXT = {
  MANUAL: 'You signed out.',
  IDLE: 'You were signed out because you were inactive.',
  OTHER_TAB: 'You signed out in another tab.',
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="card narrow">
      <h1>Sign in</h1>
      @if (reason(); as reason) {
        <p class="notice" data-testid="logout-reason" [attr.data-reason]="reason">{{ reasonText[reason] }}</p>
      }
      <form (ngSubmit)="submit()">
        <label for="username">Username</label>
        <input id="username" name="username" data-testid="username" [(ngModel)]="username" autocomplete="username">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" data-testid="password" [(ngModel)]="password" autocomplete="current-password">
        <p><button type="submit" data-testid="login-button" [disabled]="busy()">Sign in</button></p>
      </form>
      @if (error()) { <p class="error" data-testid="login-error">{{ error() }}</p> }
      <p class="hint">Any username works. The password is <code>demo</code>.</p>
    </div>
  `,
})
export class LoginComponent {
  private readonly session = inject(SessionService);
  readonly reason = computed(() => this.session.state().logoutReason);
  readonly reasonText = REASON_TEXT;
  readonly busy = signal(false);
  readonly error = signal('');
  username = 'alice';
  password = 'demo';

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.session.login(this.username, this.password);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.busy.set(false);
    }
  }
}
