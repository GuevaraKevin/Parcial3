
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService, Rol } from '../../services/auth.service';

export const roleGuard = (rol: Rol): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.obtenerRol() === rol) {
      return true;
    }

    return router.parseUrl('/home');
  };
};
