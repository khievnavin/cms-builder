import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockType, PageBlock, PageStyleConfig } from '../shared/schema.types';
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

      <div class="pb-inner" [ngStyle]="innerStyle">
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
             [attr.href]="mode === 'edit' ? null : (block.href || '#')"
             [style.background]="block.style?.background || pageStyle.accent || '#4a7dff'"
             [appEditable]="block.text || ''" [appEditableEnabled]="mode === 'edit'" [singleLine]="true"
             (appEditableChange)="setText($event)"
             (click)="mode === 'edit' && $event.preventDefault()"></a>

          <!-- SPACER -->
          <div *ngSwitchCase="'spacer'" class="pb-spacer" [class.edit]="mode === 'edit'"
               [style.height.px]="block.height || 24">
            <span *ngIf="mode === 'edit'">Spacer · {{ block.height || 24 }}px</span>
          </div>

        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .pb-block { position: relative; }
    .pb-block.edit { outline: 1px solid transparent; transition: outline-color .12s; }
    .pb-block.edit:hover { outline-color: #d6e0ff; }
    .pb-block.selected { outline: 2px solid #4a7dff !important; }

    .pb-inner { width: 100%; }

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

  get block(): PageBlock {
    return this.list[this.index];
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
