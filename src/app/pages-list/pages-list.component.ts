import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { Page } from '../shared/schema.types';

@Component({
  selector: 'app-pages-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="header">
        <h2>Website pages</h2>
        <a routerLink="/templates" class="alt">Form builder →</a>
        <span class="spacer"></span>
        <button (click)="create()">+ New page</button>
      </div>

      <table *ngIf="pages.length" class="pages">
        <thead>
          <tr><th>Title</th><th>URL</th><th>Status</th><th>Version</th><th>Updated</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of pages">
            <td class="name"><a [routerLink]="['/pages', p.id]">{{ p.title }}</a></td>
            <td><code>/site/{{ p.slug }}</code></td>
            <td><span class="status" [class.published]="p.status === 'published'">{{ p.status }}</span></td>
            <td>{{ p.version }}</td>
            <td>{{ p.updatedAt | date: 'medium' }}</td>
            <td class="actions">
              <a [routerLink]="['/pages', p.id]">Edit</a>
              <a *ngIf="p.status === 'published'" [routerLink]="['/site', p.slug]" target="_blank">View live</a>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!pages.length" class="empty">No pages yet — create one above.</p>
    </div>
  `,
  styles: [`
    .wrap { width: 100%; box-sizing: border-box; padding: 40px; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .header .spacer { flex: 1; }
    .header .alt { color: #4a7dff; text-decoration: none; font-size: 13px; }
    .header button { padding: 8px 14px; border: 1px solid #4a7dff; background: #4a7dff; color: #fff; border-radius: 6px; cursor: pointer; }

    .pages { width: 100%; border-collapse: collapse; border: 1px solid #e2e5ea; border-radius: 8px; overflow: hidden; font-size: 14px; }
    .pages th, .pages td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #eee; }
    .pages th { background: #f7f8fa; color: #555; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
    .pages tbody tr:hover { background: #f0f4ff; }
    .pages tbody tr:last-child td { border-bottom: none; }
    .pages .name a { font-weight: 500; color: #1f2430; text-decoration: none; }
    .pages .name a:hover { color: #4a7dff; text-decoration: underline; }
    .pages code { background: #f2f4f7; padding: 2px 6px; border-radius: 4px; font-size: 12px; }

    .status { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #eee; color: #666; font-size: 12px; text-transform: uppercase; }
    .status.published { background: #e6f4ea; color: #1e7e34; }

    .actions { white-space: nowrap; }
    .actions a { color: #4a7dff; text-decoration: none; font-size: 13px; margin-right: 14px; }
    .actions a:hover { text-decoration: underline; }
    .empty { color: #999; text-align: center; margin-top: 24px; }
  `],
})
export class PagesListComponent implements OnInit {
  pages: Page[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.listPages().subscribe((p) => (this.pages = p));
  }

  create(): void {
    this.api.createPage('Untitled page').subscribe((page) => {
      this.router.navigate(['/pages', page.id], { queryParams: { new: 'true' } });
    });
  }
}
