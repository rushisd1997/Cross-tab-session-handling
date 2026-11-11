import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session-service';

/** The home page needs a signed-in user. */
export const requireSignedIn: CanActivateFn = () =>
  inject(SessionService).state().phase !== 'LOGGED_OUT' || inject(Router).createUrlTree(['/login']);

/** The login page is only for signed-out users. */
export const requireSignedOut: CanActivateFn = () =>
  inject(SessionService).state().phase === 'LOGGED_OUT' || inject(Router).createUrlTree(['/home']);
