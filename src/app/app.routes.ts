import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'templates', pathMatch: 'full' },
  {
    path: 'templates',
    loadComponent: () =>
      import('./templates-list/templates-list.component').then((m) => m.TemplatesListComponent),
  },
  {
    path: 'builder/:id',
    loadComponent: () => import('./builder/builder.component').then((m) => m.BuilderComponent),
  },
  {
    path: 'templates/:id/submissions',
    loadComponent: () =>
      import('./submissions-list/submissions-list.component').then(
        (m) => m.SubmissionsListComponent,
      ),
  },
  {
    // Public: this is the shareable client-facing link, no auth guard
    path: 'forms/:id',
    loadComponent: () => import('./form-fill/form-fill.component').then((m) => m.FormFillComponent),
  },
];
