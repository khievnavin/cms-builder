import { Component, ElementRef, EventEmitter, HostBinding, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockType, NavLink, PageBlock, PageStyleConfig } from '../shared/schema.types';
import { cloneBlock, newBlock } from '../shared/blocks.util';
import { EditableDirective } from '../shared/editable.directive';
import { AddBlockMenuComponent } from './add-block-menu.component';

/**
 * Renders one block from `list[index]` and recurses into section children and
 * column trees. In `edit` mode each block carries a hover toolbar (move /
 * duplicate / delete / add-after) and its text is editable in place; in
 * `view` mode it's plain output for the public site.
 *
 * A standalone component is automatically in scope of its own template, so
 * <app-page-block> recursion needs no self-import.
 */
@Component({
  selector: 'app-page-block',
  standalone: true,
  imports: [CommonModule, EditableDirective, AddBlockMenuComponent],
  template: `
    <div
      class="pb-block"
      [class.selected]="mode === 'edit' && selectedId === block.id"
      [class.edit]="mode === 'edit'"
      [ngStyle]="outerStyle"
      (click)="onSelect($event)"
    >
      <!-- hover toolbar -->
      <div class="pb-toolbar" *ngIf="mode === 'edit'" (click)="$event.stopPropagation()">
        <span class="pb-tag">{{ block.type }}</span>
        <button type="button" (click)="move(-1)" [disabled]="index === 0" title="Move up">▲</button>
        <button type="button" (click)="move(1)" [disabled]="index === list.length - 1" title="Move down">▼</button>
        <button type="button" (click)="duplicate()" title="Duplicate">⧉</button>
        <button type="button" (click)="remove()" title="Delete">✕</button>
      </div>

      <div class="pb-inner" #inner [ngStyle]="innerStyle">
        <!-- drag-to-resize the content column (edit mode, block selected, not full-bleed) -->
        <ng-container *ngIf="showResizeHandles">
          <span class="pb-resize left"
                title="Drag to set max content width"
                (pointerdown)="startResize($event, -1)"
                (pointermove)="onResize($event)"
                (pointerup)="endResize($event)"
                (pointercancel)="endResize($event)"
                (click)="$event.stopPropagation()"></span>
          <span class="pb-resize right"
                title="Drag to set max content width"
                (pointerdown)="startResize($event, 1)"
                (pointermove)="onResize($event)"
                (pointerup)="endResize($event)"
                (pointercancel)="endResize($event)"
                (click)="$event.stopPropagation()"></span>
          <span class="pb-resize-badge" *ngIf="resizing">{{ block.style!.maxWidth }}px</span>
        </ng-container>

        <ng-container [ngSwitch]="block.type">

          <!-- SECTION -->
          <ng-container *ngSwitchCase="'section'">
            <app-page-block
              *ngFor="let child of block.children; let i = index"
              [list]="block.children!"
              [index]="i"
              [mode]="mode"
              [selectedId]="selectedId"
              [pageStyle]="pageStyle"
              (select)="select.emit($event)"
              (changed)="changed.emit()"
            ></app-page-block>
            <div class="pb-slot" *ngIf="mode === 'edit'">
              <app-add-block-menu (pick)="addChild(block.children!, $event)"></app-add-block-menu>
            </div>
            <p class="pb-hint" *ngIf="mode === 'edit' && !block.children?.length">Empty section</p>
          </ng-container>

          <!-- COLUMNS -->
          <div class="pb-cols" *ngSwitchCase="'columns'">
            <div class="pb-col" *ngFor="let col of block.columns; let c = index">
              <app-page-block
                *ngFor="let child of col; let i = index"
                [list]="col"
                [index]="i"
                [mode]="mode"
                [selectedId]="selectedId"
                [pageStyle]="pageStyle"
                (select)="select.emit($event)"
                (changed)="changed.emit()"
              ></app-page-block>
              <div class="pb-slot" *ngIf="mode === 'edit'">
                <app-add-block-menu (pick)="addChild(col, $event)"></app-add-block-menu>
              </div>
            </div>
          </div>

          <!-- HEADING -->
          <ng-container *ngSwitchCase="'heading'">
            <h1 *ngIf="(block.level || 2) === 1" class="pb-h" [ngStyle]="typeStyle"
                [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'" [singleLine]="true"
                (appEditableChange)="setText($event)"></h1>
            <h2 *ngIf="(block.level || 2) === 2" class="pb-h" [ngStyle]="typeStyle"
                [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'" [singleLine]="true"
                (appEditableChange)="setText($event)"></h2>
            <h3 *ngIf="(block.level || 2) === 3" class="pb-h" [ngStyle]="typeStyle"
                [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'" [singleLine]="true"
                (appEditableChange)="setText($event)"></h3>
          </ng-container>

          <!-- TEXT -->
          <div *ngSwitchCase="'text'" class="pb-text" [ngStyle]="typeStyle"
               [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'"
               (appEditableChange)="setText($event)"></div>

          <!-- IMAGE -->
          <ng-container *ngSwitchCase="'image'">
            <img *ngIf="block.src" [src]="block.src" [alt]="block.alt || ''"
                 class="pb-img" [style.border-radius.px]="block.style?.radius || 0" />
            <div *ngIf="!block.src && mode === 'edit'" class="pb-img-empty">
              Select this block, then set an image URL in the panel →
            </div>
          </ng-container>

          <!-- BUTTON -->
          <a *ngSwitchCase="'button'" class="pb-btn"
             [href]="resolveHref(block.href)"
             [attr.target]="hrefTarget(block.href)" [attr.rel]="hrefRel(block.href)"
             [title]="mode === 'edit' && resolveHref(block.href) !== '#' ? 'Ctrl/Cmd-click to open ' + resolveHref(block.href) : null"
             [style.background]="block.style?.background || pageStyle.accent || '#4a7dff'"
             [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'" [singleLine]="true"
             (appEditableChange)="setText($event)"
             (click)="onButtonClick($event)"></a>

          <!-- SPACER -->
          <div *ngSwitchCase="'spacer'" class="pb-spacer" [class.edit]="mode === 'edit'"
               [style.height.px]="block.height || 24">
            <span *ngIf="mode === 'edit'">Spacer · {{ block.height || 24 }}px</span>
          </div>

          <!-- NAVBAR -->
          <nav *ngSwitchCase="'navbar'" class="pb-navbar" [class.sticky]="block.sticky">
            <span class="pb-brand" [ngStyle]="typeStyle"
                  [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'" [singleLine]="true"
                  (appEditableChange)="setText($event)"></span>
            <span class="pb-nav-spacer"></span>
            <a *ngFor="let l of block.links" class="pb-nav-link"
               [href]="navHref(l)"
               [attr.target]="hrefTarget(l.href)" [attr.rel]="hrefRel(l.href)"
               [title]="mode === 'edit' && navHref(l) !== '#' ? 'Opens ' + navHref(l) : null"
               (click)="onNavLinkClick($event, l)">{{ l.label }}</a>
            <span class="pb-nav-hint" *ngIf="mode === 'edit' && !block.links?.length">
              No links — add some in the panel →
            </span>
          </nav>

          <!-- MENU -->
          <nav *ngSwitchCase="'menu'" class="pb-menu" [class.vertical]="block.vertical">
            <a *ngFor="let l of block.links" class="pb-nav-link"
               [href]="navHref(l)"
               [attr.target]="hrefTarget(l.href)" [attr.rel]="hrefRel(l.href)"
               [title]="mode === 'edit' && navHref(l) !== '#' ? 'Opens ' + navHref(l) : null"
               (click)="onNavLinkClick($event, l)">{{ l.label }}</a>
            <span class="pb-nav-hint" *ngIf="mode === 'edit' && !block.links?.length">
              No links — add some in the panel →
            </span>
          </nav>

        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    /* A sticky navbar sticks to the scroll container (the canvas / viewport),
       bounded by the full-height page — so position:sticky lives on the host
       element, whose parent is the page, not on the short <nav> inside
       .pb-inner (which would confine it to its own height and never stick). */
    :host(.is-sticky) { position: sticky; top: 0; z-index: 20; }

    .pb-block { position: relative; }
    .pb-block.edit { outline: 1px solid transparent; transition: outline-color .12s; }
    .pb-block.edit:hover { outline-color: #d6e0ff; }
    .pb-block.selected { outline: 2px solid #4a7dff !important; }

    .pb-inner { width: 100%; }
    .pb-block.edit > .pb-inner { position: relative; }

    /* content-width resize handles */
    .pb-resize {
      position: absolute; top: 0; bottom: 0; width: 12px; z-index: 25;
      cursor: ew-resize; display: flex; align-items: center; justify-content: center;
      touch-action: none;
    }
    .pb-resize.left { left: -6px; } .pb-resize.right { right: -6px; }
    .pb-resize::before {
      content: ''; width: 4px; height: 44px; max-height: 55%;
      border-radius: 3px; background: #4a7dff; box-shadow: 0 0 0 2px rgba(255,255,255,.9);
    }
    .pb-resize:hover::before { background: #2f63f0; height: 72px; }
    .pb-resize-badge {
      position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
      background: #1f2430; color: #fff; font-size: 11px; padding: 2px 8px;
      border-radius: 4px; z-index: 26; pointer-events: none; white-space: nowrap;
    }

    .pb-toolbar {
      position: absolute; top: 0; right: 0; transform: translateY(-100%);
      display: none; align-items: center; gap: 2px; z-index: 30;
      background: #1f2430; border-radius: 6px 6px 0 0; padding: 3px 4px;
    }
    .pb-block.edit:hover > .pb-toolbar,
    .pb-block.selected > .pb-toolbar { display: flex; }
    .pb-toolbar .pb-tag {
      color: #aeb6c4; font-size: 10px; text-transform: uppercase;
      letter-spacing: .05em; padding: 0 6px; user-select: none;
    }
    .pb-toolbar button {
      border: 0; background: transparent; color: #dfe3ea; font-size: 11px;
      width: 22px; height: 20px; border-radius: 4px; cursor: pointer;
    }
    .pb-toolbar button:hover:not(:disabled) { background: #3a4150; }
    .pb-toolbar button:disabled { opacity: .35; cursor: default; }

    .pb-h { margin: 0; line-height: 1.2; }
    h1.pb-h { font-size: 40px; } h2.pb-h { font-size: 30px; } h3.pb-h { font-size: 22px; }
    .pb-text { margin: 0; line-height: 1.65; font-size: 16px; }
    .pb-text:empty::before, .pb-h:empty::before {
      content: 'Type here…'; color: #aab1bd;
    }

    .pb-img { display: inline-block; max-width: 100%; height: auto; }
    .pb-img-empty {
      border: 1px dashed #c2c9d4; border-radius: 8px; padding: 28px 16px;
      color: #8a929f; font-size: 13px; text-align: center; background: #fafbfc;
    }

    .pb-btn {
      display: inline-block; padding: 12px 24px; border-radius: 8px;
      color: #fff; font-weight: 600; font-size: 15px; text-decoration: none;
      cursor: pointer;
    }
    .pb-btn.is-editable { cursor: text; }

    .pb-spacer.edit {
      border: 1px dashed #d0d6df; border-radius: 6px; display: flex;
      align-items: center; justify-content: center; color: #9aa2ae;
      font-size: 11px; box-sizing: border-box;
    }

    .pb-cols { display: flex; gap: 24px; align-items: flex-start; }
    .pb-cols > .pb-col { flex: 1 1 0; min-width: 0; }
    @media (max-width: 720px) { .pb-cols { flex-direction: column; } }

    .pb-slot { padding: 8px 0; }
    .pb-hint { margin: 4px 0 0; color: #aab; font-size: 12px; font-style: italic; }

    .pb-navbar {
      display: flex; align-items: center; gap: 20px; width: 100%;
      border-bottom: 1px solid rgba(0,0,0,.08);
    }
    /* stickiness is handled by :host(.is-sticky) on the component host */
    .pb-brand { font-weight: 700; font-size: 18px; }
    .pb-nav-spacer { flex: 1; }

    .pb-menu { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
    .pb-menu.vertical { flex-direction: column; align-items: flex-start; gap: 10px; }

    .pb-nav-link {
      color: inherit; text-decoration: none; font-size: 15px; opacity: .85;
      cursor: pointer;
    }
    .pb-nav-link:hover { opacity: 1; text-decoration: underline; }
    .pb-nav-hint { color: #aab1bd; font-size: 12px; font-style: italic; }
  `],
})
export class PageBlockComponent {
  @Input({ required: true }) list!: PageBlock[];
  @Input({ required: true }) index!: number;
  @Input() mode: 'edit' | 'view' = 'view';
  @Input() selectedId: string | null = null;
  @Input() pageStyle: PageStyleConfig = {};

  @Output() select = new EventEmitter<string>();
  @Output() changed = new EventEmitter<void>();

  @ViewChild('inner') private innerEl?: ElementRef<HTMLElement>;

  /** Smallest content width the drag lets you set. */
  private static readonly MIN_WIDTH = 200;

  /** Live drag state; null when not resizing. */
  resizing: { side: -1 | 1; startX: number; startWidth: number; max: number } | null = null;

  get block(): PageBlock {
    return this.list[this.index];
  }

  /** Pins a "stick to top" navbar to the scroll container via :host(.is-sticky). */
  @HostBinding('class.is-sticky') get isSticky(): boolean {
    return this.block.type === 'navbar' && !!this.block.sticky;
  }

  /** Show the edge drag handles only for the selected block when it isn't full-bleed. */
  get showResizeHandles(): boolean {
    return (
      this.mode === 'edit' &&
      this.selectedId === this.block.id &&
      this.block.style?.maxWidth !== null
    );
  }

  // ---- drag-to-resize the content column ------------------------------------

  startResize(event: PointerEvent, side: -1 | 1): void {
    event.preventDefault();
    event.stopPropagation();
    const inner = this.innerEl?.nativeElement;
    if (!inner) return;
    this.resizing = {
      side,
      startX: event.clientX,
      startWidth: inner.getBoundingClientRect().width,
      max: inner.parentElement?.clientWidth ?? inner.getBoundingClientRect().width,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onResize(event: PointerEvent): void {
    if (!this.resizing) return;
    // The column is centre-aligned, so moving one handle out by dx widens
    // both edges — the width changes by 2·dx.
    const dx = event.clientX - this.resizing.startX;
    const next = this.resizing.startWidth + this.resizing.side * dx * 2;
    const width = Math.round(
      Math.max(PageBlockComponent.MIN_WIDTH, Math.min(next, this.resizing.max)),
    );
    this.block.style = this.block.style ?? {};
    this.block.style.maxWidth = width;
    this.changed.emit();
  }

  endResize(event: PointerEvent): void {
    if (!this.resizing) return;
    this.resizing = null;
    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  onSelect(event: MouseEvent): void {
    if (this.mode !== 'edit') return;
    event.stopPropagation();
    this.select.emit(this.block.id);
  }

  setText(value: string): void {
    this.block.text = value;
    this.changed.emit();
  }

  // ---- link targets (navbar / menu / button) ---------------------------

  /**
   * Resolve a raw href for the anchor. A bare domain typed without a scheme
   * (e.g. "google.com") would otherwise resolve as a relative path inside
   * the SPA and 404 — so prepend https:// for those. Empty → '#'.
   */
  resolveHref(raw: string | undefined | null): string {
    const s = (raw || '').trim();
    if (!s) return '#';
    if (/^(https?:|mailto:|tel:|\/|#|\?)/i.test(s)) return s;
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(s)) return 'https://' + s;
    return s;
  }

  navHref(link: NavLink): string {
    return this.resolveHref(link.href);
  }

  /** A real destination (not the placeholder '#') always opens in a new tab. */
  hrefTarget(raw: string | undefined | null): string | null {
    return this.resolveHref(raw) === '#' ? null : '_blank';
  }

  hrefRel(raw: string | undefined | null): string | null {
    return this.hrefTarget(raw) ? 'noopener noreferrer' : null;
  }

  /**
   * Navbar / menu links: labels are edited in the side panel, not in place,
   * so a plain click in the builder can just follow the link (new tab —
   * the editor tab stays put). Placeholder '#' links only select the block.
   */
  onNavLinkClick(event: MouseEvent, link: NavLink): void {
    if (this.mode !== 'edit') return;
    if (this.navHref(link) === '#') event.preventDefault();
  }

  /**
   * Button: its face IS the inline-editable label, so a plain click places
   * the caret for editing; Ctrl/Cmd-click follows the link instead.
   */
  onButtonClick(event: MouseEvent): void {
    if (this.mode !== 'edit') return;
    const open = (event.ctrlKey || event.metaKey) && this.resolveHref(this.block.href) !== '#';
    if (!open) event.preventDefault();
  }

  // ---- structural ops (edit mode) ------------------------------------------

  move(dir: -1 | 1): void {
    const to = this.index + dir;
    if (to < 0 || to >= this.list.length) return;
    [this.list[this.index], this.list[to]] = [this.list[to], this.list[this.index]];
    this.reorder();
    this.changed.emit();
  }

  duplicate(): void {
    const copy = cloneBlock(this.block);
    this.list.splice(this.index + 1, 0, copy);
    this.reorder();
    this.select.emit(copy.id);
    this.changed.emit();
  }

  remove(): void {
    this.list.splice(this.index, 1);
    this.reorder();
    this.changed.emit();
  }

  addChild(target: PageBlock[], type: BlockType): void {
    const block = newBlock(type);
    target.push(block);
    target.forEach((b, i) => (b.order = i));
    this.select.emit(block.id);
    this.changed.emit();
  }

  private reorder(): void {
    this.list.forEach((b, i) => (b.order = i));
  }

  // ---- computed styles ---------------------------------------------------

  get outerStyle(): Record<string, string | number | null> {
    const s = this.block.style ?? {};
    return {
      background: s.background || null,
      color: s.textColor || null,
      'padding-top.px': s.paddingY ?? (this.block.type === 'section' ? 48 : 0),
      'padding-bottom.px': s.paddingY ?? (this.block.type === 'section' ? 48 : 0),
      'padding-left.px': s.paddingX ?? 0,
      'padding-right.px': s.paddingX ?? 0,
      'margin-top.px': s.marginTop ?? 0,
      'margin-bottom.px': s.marginBottom ?? 0,
      'text-align': s.align ?? null,
    };
  }

  get innerStyle(): Record<string, string | number | null> {
    const s = this.block.style ?? {};
    const clamp = s.maxWidth === null ? null : s.maxWidth ?? this.pageStyle.contentWidth ?? 820;
    return {
      'max-width.px': clamp,
      'margin-left': clamp ? 'auto' : null,
      'margin-right': clamp ? 'auto' : null,
    };
  }

  get typeStyle(): Record<string, string | number | null> {
    const s = this.block.style ?? {};
    return {
      'font-size.px': s.fontSize ?? null,
      'font-weight': s.fontWeight ?? null,
      color: s.textColor || null,
    };
  }
}
