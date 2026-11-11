import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { LoginComponent } from './pages/login.component';
import { requireSignedIn, requireSignedOut } from './session/session.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'login', component: LoginComponent, canActivate: [requireSignedOut] },
  { path: 'home', component: HomeComponent, canActivate: [requireSignedIn] },
  { path: '**', redirectTo: 'home' },
];
