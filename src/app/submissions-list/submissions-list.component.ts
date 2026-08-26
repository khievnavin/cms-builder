import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { Submission, Template } from '../shared/schema.types';

@Component({
  selector: 'app-submissions-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap" *ngIf="template">
      <div class="header">
        <a [routerLink]="['/templates']">&larr; Templates</a>
        <h2>{{ template.name }} — Submissions</h2>
      </div>

      <table *ngIf="submissions.length" class="submissions">
        <thead>
          <tr>
            <th>Submitted</th>
            <th *ngFor="let key of columnKeys">{{ labelFor(key) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of submissions">
            <td class="submitted">{{ s.submittedAt | date: 'medium' }}</td>
            <td *ngFor="let key of columnKeys">{{ format(s.data[key]) }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!submissions.length" class="empty">No submissions yet.</p>
    </div>
  `,
  styles: [`
    .wrap { max-width: 1000px; margin: 40px auto; padding: 16px; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .header a { color: #4a7dff; text-decoration: none; font-size: 14px; }
    .header h2 { margin: 0; }

    .submissions {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e5ea;
      border-radius: 8px;
      overflow: hidden;
      font-size: 14px;
    }
    .submissions th, .submissions td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid #eee;
      white-space: nowrap;
    }
    .submissions th {
      background: #f7f8fa;
      color: #555;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .submissions tbody tr:last-child td { border-bottom: none; }
    .submitted { color: #666; }

    .empty { color: #999; text-align: center; margin-top: 24px; }
  `],
})
export class SubmissionsListComponent implements OnInit {
  template: Template | null = null;
  submissions: Submission[] = [];
  columnKeys: string[] = [];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getTemplate(id).subscribe((t) => (this.template = t));
    this.api.listTemplateSubmissions(id).subscribe((subs) => {
      this.submissions = subs;
      const keys = new Set<string>();
      for (const s of subs) {
        for (const key of Object.keys(s.data ?? {})) keys.add(key);
      }
      this.columnKeys = [...keys];
    });
  }

  // Older submissions may have been collected against an earlier published
  // version of the schema, so keys aren't guaranteed to match the current
  // template's fields exactly — fall back to the raw key when no match.
  labelFor(key: string): string {
    const field = this.template?.schema.components.find((c) => c.key === key);
    return field?.label ?? key;
  }

  format(value: unknown): string {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
}
