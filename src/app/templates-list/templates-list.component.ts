import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { Template } from '../shared/schema.types';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <div class="header">
        <h2>Templates</h2>
        <a routerLink="/pages" class="alt">Website pages →</a>
        <span class="spacer"></span>
        <button (click)="create()">+ New template</button>
      </div>
      <table *ngIf="templates.length" class="templates">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Version</th>
            <th>Created by</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of templates">
            <td class="name"><a href (click)="openTemplate($event, t)">{{ t.name }}</a></td>
            <td><span class="status" [class.published]="t.status === 'published'">{{ t.status }}</span></td>
            <td>{{ t.version }}</td>
            <td>{{ t.createdBy }}</td>
            <td>{{ t.updatedAt | date: 'medium' }}</td>
            <td class="actions">
              <a [routerLink]="['/builder', t.id]">Edit</a>
              <a [routerLink]="['/templates', t.id, 'submissions']">View submissions</a>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!templates.length" class="empty">No templates yet — create one above.</p>
    </div>
  `,
  styles: [`
    .wrap { width: 100%; box-sizing: border-box; margin: 0; padding: 40px; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .header .spacer { flex: 1; }
    .header .alt { color: #4a7dff; text-decoration: none; font-size: 13px; }
    .header .alt:hover { text-decoration: underline; }

    .templates {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e5ea;
      border-radius: 8px;
      overflow: hidden;
      font-size: 14px;
    }
    .templates th, .templates td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid #eee;
    }
    .templates th {
      background: #f7f8fa;
      color: #555;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .templates tbody tr:hover { background: #f0f4ff; }
    .templates tbody tr:last-child td { border-bottom: none; }
    .templates .name a { font-weight: 500; color: #1f2430; text-decoration: none; }
    .templates .name a:hover { color: #4a7dff; text-decoration: underline; }

    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      background: #eee;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
    }
    .status.published { background: #e6f4ea; color: #1e7e34; }

    .actions { white-space: nowrap; }
    .actions a { color: #4a7dff; text-decoration: none; font-size: 13px; margin-right: 14px; }
    .actions a:last-child { margin-right: 0; }
    .actions a:hover { text-decoration: underline; }

    .empty { color: #999; text-align: center; margin-top: 24px; }
  `],
})
export class TemplatesListComponent implements OnInit {
  templates: Template[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listTemplates().subscribe((t) => (this.templates = t));
  }

  // No name prompt here — land in the builder and let the click-to-rename
  // name field there handle it, opened automatically via the `new` query param.
  create(): void {
    this.api.createTemplate('Untitled template').subscribe((template) => {
      this.router.navigate(['/builder', template.id], { queryParams: { new: 'true' } });
    });
  }

  // Draft templates have no live form yet, so their name opens the builder.
  // Published ones open the actual fillable form (the most recently
  // published version) instead of the editor.
  openTemplate(event: Event, t: Template): void {
    event.preventDefault();
    if (t.status !== 'published') {
      this.router.navigate(['/builder', t.id]);
      return;
    }
    this.api.listFormInstances(t.id).subscribe((instances) => {
      if (!instances.length) {
        this.router.navigate(['/builder', t.id]);
        return;
      }
      const latest = instances.reduce((a, b) => (a.templateVersion > b.templateVersion ? a : b));
      this.router.navigate(['/forms', latest.id]);
    });
  }
}
