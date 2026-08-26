import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { Template } from '../shared/schema.types';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="wrap">
      <h2>Templates</h2>
      <div class="new">
        <input [(ngModel)]="newName" placeholder="New template name" />
        <button (click)="create()" [disabled]="!newName.trim()">Create</button>
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
              <a [routerLink]="['/templates', t.id, 'submissions']">View submissions</a>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!templates.length" class="empty">No templates yet — create one above.</p>
    </div>
  `,
  styles: [`
    .wrap { max-width: 800px; margin: 40px auto; padding: 16px; }
    .new { display: flex; gap: 8px; margin-bottom: 20px; }
    .new input { flex: 1; padding: 6px; }

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

    .actions a { color: #4a7dff; text-decoration: none; font-size: 13px; white-space: nowrap; }
    .actions a:hover { text-decoration: underline; }

    .empty { color: #999; text-align: center; margin-top: 24px; }
  `],
})
export class TemplatesListComponent implements OnInit {
  templates: Template[] = [];
  newName = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listTemplates().subscribe((t) => (this.templates = t));
  }

  create(): void {
    this.api.createTemplate(this.newName.trim()).subscribe((template) => {
      this.newName = '';
      this.router.navigate(['/builder', template.id]);
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
