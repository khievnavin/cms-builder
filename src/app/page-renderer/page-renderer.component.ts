import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockType, PageContent, PageStyleConfig } from '../shared/schema.types';
import { newBlock } from '../shared/blocks.util';
import { PageBlockComponent } from './page-block.component';
import { AddBlockMenuComponent } from './add-block-menu.component';

/**
 * Renders a whole page — the shared engine behind the builder canvas
 * (mode="edit") and the public site route (mode="view"). Unlike the form
 * builder's fixed-width canvas, this fills its container edge to edge; each
 * block decides its own width.
 */
@Component({
  selector: 'app-page-renderer',
  standalone: true,
  imports: [CommonModule, PageBlockComponent, AddBlockMenuComponent],
  template: `
    <div
      class="pr-page"
      [style.background]="pageStyle.background || '#fff'"
      [style.color]="pageStyle.textColor || '#1f2430'"
      [style.font-family]="pageStyle.fontFamily || null"
      (click)="mode === 'edit' && select.emit(null)"
    >
      <app-page-block
        *ngFor="let b of content.blocks; let i = index"
        [list]="content.blocks"
        [index]="i"
        [mode]="mode"
        [selectedId]="selectedId"
        [pageStyle]="pageStyle"
        (select)="select.emit($event)"
        (changed)="changed.emit()"
      ></app-page-block>

      <div class="pr-add" *ngIf="mode === 'edit'" (click)="$event.stopPropagation()">
        <app-add-block-menu variant="bar" (pick)="addRoot($event)"></app-add-block-menu>
      </div>

      <p class="pr-empty" *ngIf="mode === 'view' && !content.blocks.length">
        This page has no content yet.
      </p>
    </div>
  `,
  styles: [`
    .pr-page { width: 100%; min-height: 100%; box-sizing: border-box; }
    .pr-add { padding: 24px; }
    .pr-empty { text-align: center; color: #99a; padding: 80px 20px; }
  `],
})
export class PageRendererComponent {
  @Input({ required: true }) content!: PageContent;
  @Input() pageStyle: PageStyleConfig = {};
  @Input() mode: 'edit' | 'view' = 'view';
  @Input() selectedId: string | null = null;

  @Output() select = new EventEmitter<string | null>();
  @Output() changed = new EventEmitter<void>();

  addRoot(type: BlockType): void {
    const block = newBlock(type);
    this.content.blocks.push(block);
    this.content.blocks.forEach((b, i) => (b.order = i));
    this.select.emit(block.id);
    this.changed.emit();
  }
}
