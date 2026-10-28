
import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page')
        .then(m => m.HomePage)
  },
  
  {
    path: 'cliente',
    canActivate: [roleGuard('client')],
    loadComponent: () =>
      import('./cliente/cliente.page')
        .then(m => m.ClientePage)
  },

  {
    path: 'conductor',
    canActivate: [roleGuard('driver')],
    loadComponent: () =>
      import('./dashboard/dashboard.page')
        .then(m => m.DashboardPage)
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./dashboard/dashboard.page')
        .then(m => m.DashboardPage)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
