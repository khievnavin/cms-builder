import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from '../shared/api.service';
import { NavLink, Page, PageBlock } from '../shared/schema.types';
import { findBlock } from '../shared/blocks.util';
import { PageRendererComponent } from '../page-renderer/page-renderer.component';

const FONT_CHOICES = [
  { label: 'System sans', value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` },
  { label: 'Georgia serif', value: `Georgia, 'Times New Roman', serif` },
  { label: 'Monospace', value: `'SF Mono', 'Fira Code', Menlo, monospace` },
];

/**
 * WordPress-style page editor: the canvas on the left is the real page,
 * full-bleed (no fixed-width container); the right rail edits either the
 * selected block's style or, with nothing selected, page-wide settings.
 */
@Component({
  selector: 'app-page-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageRendererComponent],
  template: `
    <div class="pb" *ngIf="page">
      <header>
        <a routerLink="/pages" class="back" title="Back to pages">←</a>

        <input *ngIf="editingTitle" class="title-input" [(ngModel)]="titleDraft"
               (blur)="saveTitle()" (keyup.enter)="saveTitle()"
               (keyup.escape)="editingTitle = false" autofocus />
        <h2 *ngIf="!editingTitle" (click)="startEditTitle()" title="Click to rename">{{ page.title }}</h2>

        <span class="slug">/site/{{ page.slug }}</span>
        <span class="dirty" *ngIf="dirty">● unsaved</span>

        <span class="spacer"></span>
        <button (click)="save()">Save</button>
        <button class="primary" (click)="publish()">Publish</button>
        <a *ngIf="publishedSlug" class="live" [routerLink]="['/site', publishedSlug]" target="_blank">
          View live ↗
        </a>
      </header>

      <div class="body">
        <!-- Canvas: the page itself, edge to edge -->
        <div class="canvas" (click)="selectedId = null">
          <app-page-renderer
            [content]="page.content"
            [pageStyle]="page.pageStyle"
            mode="edit"
            [selectedId]="selectedId"
            (select)="selectedId = $event"
            (changed)="markDirty()"
          ></app-page-renderer>
        </div>

        <!-- Right rail -->
        <aside class="rail" (click)="$event.stopPropagation()">
          <ng-container *ngIf="selected as b; else pageSettings">
            <div class="rail-head">
              <h4>{{ b.type }} block</h4>
              <button class="link-danger" (click)="deleteSelected()">Delete</button>
            </div>

            <!-- text-ish content -->
            <label *ngIf="b.type === 'heading'">Level
              <select [(ngModel)]="b.level" (ngModelChange)="markDirty()">
                <option [ngValue]="1">H1</option><option [ngValue]="2">H2</option><option [ngValue]="3">H3</option>
              </select>
            </label>
            <label *ngIf="b.type === 'image'">Image URL
              <input [(ngModel)]="b.src" (ngModelChange)="markDirty()" placeholder="https://…" />
            </label>
            <label *ngIf="b.type === 'image'">Alt text
              <input [(ngModel)]="b.alt" (ngModelChange)="markDirty()" />
            </label>
            <label *ngIf="b.type === 'image'">Corner radius
              <input type="number" min="0" [(ngModel)]="b.style!.radius" (ngModelChange)="markDirty()" />
            </label>
            <label *ngIf="b.type === 'button'">Link URL
              <input [(ngModel)]="b.href" (ngModelChange)="markDirty()" placeholder="https://…" />
            </label>
            <label *ngIf="b.type === 'spacer'">Height (px)
              <input type="number" min="0" [(ngModel)]="b.height" (ngModelChange)="markDirty()" />
            </label>
            <label *ngIf="b.type === 'columns'">Columns
              <select [ngModel]="b.columns?.length" (ngModelChange)="setColumnCount(b, +$event)">
                <option [ngValue]="2">2</option><option [ngValue]="3">3</option>
              </select>
            </label>

            <ng-container *ngIf="b.type === 'navbar' || b.type === 'menu'">
              <label *ngIf="b.type === 'navbar'" class="check">
                <input type="checkbox" [(ngModel)]="b.sticky" (ngModelChange)="markDirty()" />
                Stick to top on scroll
              </label>
              <label *ngIf="b.type === 'menu'" class="check">
                <input type="checkbox" [(ngModel)]="b.vertical" (ngModelChange)="markDirty()" />
                Stack links vertically
              </label>
              <p class="tip" *ngIf="b.type === 'navbar'">Click the brand text on the canvas to rename it.</p>

              <div class="links-head">
                <span>Links</span>
                <button class="clear" (click)="addLink(b)">+ add</button>
              </div>
              <div class="link-row" *ngFor="let l of b.links; let i = index">
                <input [(ngModel)]="l.label" (ngModelChange)="markDirty()" placeholder="Label" />
                <input [(ngModel)]="l.href" (ngModelChange)="markDirty()" placeholder="#" />
                <button class="link-danger" (click)="removeLink(b, i)" title="Remove">✕</button>
              </div>
            </ng-container>

            <ng-container *ngIf="b.type === 'heading' || b.type === 'text'">
              <label>Font size (px)
                <input type="number" min="8" [(ngModel)]="b.style!.fontSize" (ngModelChange)="markDirty()" />
              </label>
            </ng-container>

            <hr />
            <label>Align
              <select [(ngModel)]="b.style!.align" (ngModelChange)="markDirty()">
                <option [ngValue]="undefined">—</option>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </label>

            <div class="two">
              <label>Background
                <input type="color" [ngModel]="b.style!.background || '#ffffff'"
                       (ngModelChange)="b.style!.background = $event; markDirty()" />
              </label>
              <button class="clear" (click)="b.style!.background = ''; markDirty()">clear</button>
            </div>
            <div class="two">
              <label>Text color
                <input type="color" [ngModel]="b.style!.textColor || '#1f2430'"
                       (ngModelChange)="b.style!.textColor = $event; markDirty()" />
              </label>
              <button class="clear" (click)="b.style!.textColor = ''; markDirty()">clear</button>
            </div>

            <hr />
            <div class="grid2">
              <label>Pad ↕
                <input type="number" min="0" [(ngModel)]="b.style!.paddingY" (ngModelChange)="markDirty()" />
              </label>
              <label>Pad ↔
                <input type="number" min="0" [(ngModel)]="b.style!.paddingX" (ngModelChange)="markDirty()" />
              </label>
              <label>Margin top
                <input type="number" min="0" [(ngModel)]="b.style!.marginTop" (ngModelChange)="markDirty()" />
              </label>
              <label>Margin bottom
                <input type="number" min="0" [(ngModel)]="b.style!.marginBottom" (ngModelChange)="markDirty()" />
              </label>
            </div>

            <label class="check">
              <input type="checkbox" [checked]="b.style!.maxWidth === null"
                     (change)="toggleFullBleed(b, $event)" />
              Full-bleed (ignore content width)
            </label>
            <div class="width-readout" *ngIf="b.style!.maxWidth !== null">
              <span>Max content width</span>
              <strong>{{ b.style!.maxWidth ?? page.pageStyle.contentWidth }} px</strong>
              <small>Drag the blue handles on the block's edges in the canvas to resize.</small>
            </div>
          </ng-container>

          <ng-template #pageSettings>
            <div class="rail-head"><h4>Page settings</h4></div>
            <p class="tip">Click any block on the page to style it. Click its text to edit in place.</p>

            <label>Title
              <input [(ngModel)]="page.title" (ngModelChange)="syncSlugFromTitle(); markDirty()" />
            </label>
            <label>Slug
              <input [(ngModel)]="page.slug" (ngModelChange)="slugLocked = true; markDirty()" />
              <small>Live at <code>/site/{{ page.slug }}</code> after publish.
                <a *ngIf="slugLocked" (click)="unlockSlug()" class="relink">match title</a>
              </small>
            </label>

            <hr />
            <label>Font
              <select [(ngModel)]="page.pageStyle.fontFamily" (ngModelChange)="markDirty()">
                <option *ngFor="let f of fonts" [ngValue]="f.value">{{ f.label }}</option>
              </select>
            </label>
            <div class="grid2">
              <label>Background
                <input type="color" [(ngModel)]="page.pageStyle.background" (ngModelChange)="markDirty()" />
              </label>
              <label>Text
                <input type="color" [(ngModel)]="page.pageStyle.textColor" (ngModelChange)="markDirty()" />
              </label>
              <label>Accent
                <input type="color" [(ngModel)]="page.pageStyle.accent" (ngModelChange)="markDirty()" />
              </label>
              <label>Content width
                <input type="number" min="320" [(ngModel)]="page.pageStyle.contentWidth" (ngModelChange)="markDirty()" />
              </label>
            </div>
          </ng-template>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .pb { display: flex; flex-direction: column; height: 100%; }

    header {
      display: flex; align-items: center; gap: 12px; padding: 10px 16px;
      border-bottom: 1px solid #e2e5ea; background: #fff; flex: 0 0 auto;
    }
    header .back { text-decoration: none; font-size: 18px; color: #5b6472; }
    header h2 { margin: 0; font-size: 17px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
    header h2:hover { background: #f0f4ff; }
    .title-input { font-size: 17px; font-weight: 600; padding: 2px 6px; border: 1px solid #4a7dff; border-radius: 4px; }
    header .slug { color: #98a0ac; font-size: 12px; font-family: monospace; }
    header .dirty { color: #b26a00; font-size: 12px; }
    header .spacer { flex: 1; }
    header button {
      padding: 7px 14px; border: 1px solid #cfd4dd; background: #fff; border-radius: 6px;
      font-size: 13px; cursor: pointer;
    }
    header button.primary { background: #4a7dff; border-color: #4a7dff; color: #fff; }
    header .live { font-size: 13px; color: #1e7e34; text-decoration: none; }

    .body { flex: 1; display: grid; grid-template-columns: 1fr 320px; min-height: 0; }
    .canvas { overflow: auto; background: #eef0f4; padding: 24px; }
    /* the page sits on the canvas with a slight lift, but spans full width */
    .canvas > app-page-renderer { display: block; box-shadow: 0 1px 4px rgba(16,24,40,.12); background: #fff; }

    .rail {
      border-left: 1px solid #e2e5ea; background: #fff; overflow: auto;
      padding: 16px; font-size: 13px;
    }
    .rail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .rail-head h4 { margin: 0; text-transform: capitalize; }
    .rail label { display: block; margin-bottom: 10px; color: #444; }
    .rail input:not([type=color]):not([type=checkbox]), .rail select {
      width: 100%; box-sizing: border-box; padding: 6px 8px; margin-top: 4px;
      border: 1px solid #d6dae1; border-radius: 6px; font: inherit;
    }
    .rail input[type=color] { width: 100%; height: 30px; margin-top: 4px; padding: 0; border: 1px solid #d6dae1; border-radius: 6px; }
    .rail small { color: #8a929f; } .rail code { background: #f2f4f7; padding: 1px 4px; border-radius: 3px; }
    .rail hr { border: 0; border-top: 1px solid #eef0f3; margin: 14px 0; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
    .two { display: flex; align-items: flex-end; gap: 8px; }
    .two label { flex: 1; }
    .two .clear, .clear {
      border: 1px solid #d6dae1; background: #fff; border-radius: 6px; padding: 6px 8px;
      font-size: 11px; cursor: pointer; margin-bottom: 10px; color: #6b7482;
    }
    .width-readout { margin-bottom: 10px; }
    .width-readout span { color: #444; }
    .width-readout strong { display: block; margin: 2px 0; font-size: 15px; color: #1f2430; }
    .width-readout small { color: #8a929f; line-height: 1.4; display: block; }
    .check { display: flex; align-items: center; gap: 8px; }
    .check input { width: auto !important; margin: 0 !important; }
    .link-danger { border: 0; background: transparent; color: #c0392b; cursor: pointer; font-size: 12px; }
    .tip { color: #8a929f; margin: 0 0 14px; line-height: 1.5; }
    .relink { color: #4a7dff; cursor: pointer; margin-left: 4px; }
    .relink:hover { text-decoration: underline; }

    .links-head { display: flex; align-items: center; justify-content: space-between; margin: 10px 0 6px; color: #444; }
    .link-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; align-items: center; margin-bottom: 6px; }
    .link-row input { margin-top: 0 !important; }
    .link-row .link-danger { font-size: 13px; padding: 0 4px; }
  `],
})
export class PageBuilderComponent implements OnInit {
  page: Page | null = null;
  selectedId: string | null = null;
  dirty = false;
  publishedSlug: string | null = null;
  editingTitle = false;
  titleDraft = '';
  fonts = FONT_CHOICES;
  /** Once the slug is hand-edited, stop deriving it from the title. */
  slugLocked = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const isNew = this.route.snapshot.queryParamMap.get('new') === 'true';
    this.api.getPage(id).subscribe((p) => {
      this.page = p;
      // If the stored slug already differs from what the title would produce,
      // assume it was set deliberately and don't auto-rewrite it.
      this.slugLocked = p.slug !== this.slugify(p.title);
      if (p.status === 'published') this.publishedSlug = p.slug;
      if (isNew) this.startEditTitle();
    });
  }

  private slugify(text: string): string {
    return (
      text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
    );
  }

  /** Keep the slug in step with the title until the user edits it by hand. */
  syncSlugFromTitle(): void {
    if (!this.page || this.slugLocked) return;
    this.page.slug = this.slugify(this.page.title);
  }

  unlockSlug(): void {
    this.slugLocked = false;
    this.syncSlugFromTitle();
    this.markDirty();
  }

  get selected(): PageBlock | null {
    if (!this.page || !this.selectedId) return null;
    return findBlock(this.selectedId, this.page.content.blocks);
  }

  markDirty(): void {
    this.dirty = true;
  }

  startEditTitle(): void {
    if (!this.page) return;
    this.titleDraft = this.page.title;
    this.editingTitle = true;
  }

  saveTitle(): void {
    if (!this.page) return;
    this.editingTitle = false;
    const title = this.titleDraft.trim();
    if (!title || title === this.page.title) return;
    this.page.title = title;
    this.syncSlugFromTitle();
    this.markDirty();
  }

  setColumnCount(block: PageBlock, count: number): void {
    const cols = block.columns ?? [];
    if (count > cols.length) while (cols.length < count) cols.push([]);
    else cols.length = count; // dropped columns' blocks are discarded
    block.columns = cols;
    this.markDirty();
  }

  addLink(block: PageBlock): void {
    const links: NavLink[] = block.links ?? (block.links = []);
    links.push({ label: 'New link', href: '#' });
    this.markDirty();
  }

  removeLink(block: PageBlock, index: number): void {
    block.links?.splice(index, 1);
    this.markDirty();
  }

  toggleFullBleed(block: PageBlock, event: Event): void {
    const full = (event.target as HTMLInputElement).checked;
    block.style = block.style ?? {};
    block.style.maxWidth = full ? null : this.page?.pageStyle.contentWidth ?? 820;
    this.markDirty();
  }

  deleteSelected(): void {
    if (!this.page || !this.selectedId) return;
    const remove = (list: PageBlock[]): boolean => {
      const i = list.findIndex((b) => b.id === this.selectedId);
      if (i >= 0) {
        list.splice(i, 1);
        return true;
      }
      return list.some(
        (b) =>
          (b.children && remove(b.children)) ||
          (b.columns && b.columns.some((c) => remove(c))),
      );
    };
    remove(this.page.content.blocks);
    this.selectedId = null;
    this.markDirty();
  }

  /**
   * Persists everything: title + slug go through PUT /pages/:id, then the
   * block tree + page style through PUT /pages/:id/content. The server may
   * de-duplicate the slug, so we adopt whatever it returns.
   */
  private persist(): Observable<Page> {
    const p = this.page!;
    return this.api.updatePage(p.id, { title: p.title, slug: p.slug }).pipe(
      switchMap((meta) => {
        p.title = meta.title;
        p.slug = meta.slug;
        this.slugLocked = meta.slug !== this.slugify(meta.title);
        return this.api.savePageContent(p.id, p.content, p.pageStyle);
      }),
    );
  }

  save(): void {
    if (!this.page) return;
    this.persist().subscribe((p) => {
      this.page = p;
      this.slugLocked = p.slug !== this.slugify(p.title);
      this.dirty = false;
    });
  }

  publish(): void {
    if (!this.page) return;
    // Save first so the publish snapshots the current draft, not a stale one.
    this.persist().subscribe(() => {
      this.api.publishPage(this.page!.id).subscribe((snap) => {
        this.page!.status = 'published';
        this.dirty = false;
        this.publishedSlug = snap.slug;
      });
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  warnUnsaved(e: BeforeUnloadEvent): void {
    if (this.dirty) e.preventDefault();
  }
}
