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

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');
  const userStr = sessionStorage.getItem('user');

  if (!token || !isTokenValid(token)) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('position');
    return router.createUrlTree(['/login']);
  }

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // Check trial status
      const requiresPayment = user.requires_payment;
      const paymentStatus = user.payment_status;
      const loginCount = user.login_count || 0;

      if (requiresPayment && loginCount >= 30 && paymentStatus !== 'paid') {
        // Only allow access to payments page
        if (state.url !== '/payments') {
          return router.createUrlTree(['/payments']);
        }
      }
    } catch (e) {}
  }

  return true;
};