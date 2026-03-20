import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const position = parseInt(localStorage.getItem('position') ?? '2');

  if (position !== 1) {  
    router.navigate(['/home']);
    return false;
  }

  return true;
};