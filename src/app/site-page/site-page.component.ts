import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../shared/api.service';
import { PublishedPage } from '../shared/schema.types';
import { PageRendererComponent } from '../page-renderer/page-renderer.component';

/**
 * The public website route (/site/:slug). Serves the last published snapshot
 * of a page, rendered read-only and full width.
 */
@Component({
  selector: 'app-site-page',
  standalone: true,
  imports: [CommonModule, PageRendererComponent],
  template: `
    <app-page-renderer
      *ngIf="snapshot"
      [content]="snapshot.content"
      [pageStyle]="snapshot.pageStyle"
      mode="view"
    ></app-page-renderer>

    <div class="notfound" *ngIf="notFound">
      <h1>404</h1>
      <p>No published page at this address.</p>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .notfound { text-align: center; padding: 120px 20px; font-family: sans-serif; color: #444; }
    .notfound h1 { font-size: 64px; margin: 0; }
  `],
})
export class SitePageComponent implements OnInit {
  snapshot: PublishedPage | null = null;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private title: Title,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')!;
      this.snapshot = null;
      this.notFound = false;
      this.api.getLivePage(slug).subscribe({
        next: (snap) => {
          this.snapshot = snap;
          this.title.setTitle(snap.title);
        },
        error: () => (this.notFound = true),
      });
    });
  }
}
