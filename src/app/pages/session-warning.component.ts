// You should not need to change this file.
import { Component, inject } from '@angular/core';
import { SessionService } from '../session/session-service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  template: `
    @if (session.state().phase === 'WARNING') {
      <div class="overlay">
        <div class="dialog" role="alertdialog" aria-labelledby="warning-title" data-testid="warning">
          <h2 id="warning-title">Are you still there?</h2>
          <p>You will be signed out in <strong data-testid="seconds-left">{{ session.state().secondsLeft }}</strong> seconds.</p>
          <button type="button" data-testid="stay" (click)="session.staySignedIn()">Stay signed in</button>
          <button type="button" class="secondary" (click)="session.logout()">Sign out now</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); display: grid; place-items: center; }
    .dialog { background: #fff; border-radius: 10px; padding: 20px 24px; width: 340px; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
    .dialog h2 { margin: 0 0 8px; font-size: 20px; }
    .dialog button { margin-right: 8px; }
  `],
})
export class SessionWarningComponent {
  readonly session = inject(SessionService);
}
