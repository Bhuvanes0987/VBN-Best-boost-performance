import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');
  if (!token || !isTokenValid(token)) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('position');
    return router.createUrlTree(['/login']);
  }
  return true;
};