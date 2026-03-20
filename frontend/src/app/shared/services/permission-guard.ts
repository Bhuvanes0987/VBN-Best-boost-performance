import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const position = parseInt(localStorage.getItem('position') ?? '2');

  if (position === 1) return true;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const allowedPages: string[] = user.allowedPages || [];
  const requiredPage = route.data['page'];

  if (!requiredPage || allowedPages.includes(requiredPage)) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};