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
    // Website CMS — list, edit, and publish full-page content
    path: 'pages',
    loadComponent: () =>
      import('./pages-list/pages-list.component').then((m) => m.PagesListComponent),
  },
  {
    path: 'pages/:id',
    loadComponent: () =>
      import('./page-builder/page-builder.component').then((m) => m.PageBuilderComponent),
  },
  {
    // Public: the live website page, no auth guard
    path: 'site/:slug',
    loadComponent: () =>
      import('./site-page/site-page.component').then((m) => m.SitePageComponent),
  },
  {
    // Public: this is the shareable client-facing link, no auth guard
    path: 'forms/:id',
    loadComponent: () => import('./form-fill/form-fill.component').then((m) => m.FormFillComponent),
  },
];
