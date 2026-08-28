import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockType } from '../shared/schema.types';

/** The "＋" affordance that opens a palette of block types to insert. */
@Component({
  selector: 'app-add-block-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="abm" [class.bar]="variant === 'bar'">
      <button
        type="button"
        class="abm-toggle"
        [class.on]="open"
        (click)="open = !open; $event.stopPropagation()"
        title="Add block"
      >
        <span class="plus">＋</span>
        <span class="txt" *ngIf="variant === 'bar'">Add block</span>
      </button>

      <div class="abm-menu" *ngIf="open" (click)="$event.stopPropagation()">
        <button type="button" *ngFor="let t of types" (click)="choose(t.type)">
          <span class="ico">{{ t.icon }}</span>{{ t.label }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .abm { position: relative; display: inline-flex; }
    .abm.bar { display: flex; justify-content: center; width: 100%; }

    .abm-toggle {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 4px 10px; border: 1px dashed #b9c0cc; border-radius: 999px;
      background: #fff; color: #5b6472; font-size: 13px; cursor: pointer;
      transition: border-color .15s, color .15s, background .15s;
    }
    .abm-toggle:hover, .abm-toggle.on { border-color: #4a7dff; color: #4a7dff; background: #f4f7ff; }
    .abm-toggle .plus { font-size: 15px; line-height: 1; }
    .abm.bar .abm-toggle { padding: 8px 16px; }

    .abm-menu {
      position: absolute; z-index: 40; top: calc(100% + 6px); left: 50%;
      transform: translateX(-50%); width: 200px;
      background: #fff; border: 1px solid #e2e5ea; border-radius: 10px;
      box-shadow: 0 12px 32px rgba(16,24,40,.16); padding: 6px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
    }
    .abm-menu button {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 8px 10px; border: 0; border-radius: 6px; background: transparent;
      font-size: 13px; color: #1f2430; cursor: pointer; text-align: left;
    }
    .abm-menu button:hover { background: #f0f4ff; }
    .abm-menu .ico { width: 18px; text-align: center; font-size: 13px; color: #6b7482; }
  `],
})
export class AddBlockMenuComponent {
  /** 'bar' = full-width labelled bar (page bottom); 'dot' = compact circle. */
  @Input() variant: 'bar' | 'dot' = 'dot';
  @Output() pick = new EventEmitter<BlockType>();

  open = false;

  readonly types: { type: BlockType; label: string; icon: string }[] = [
    { type: 'section', label: 'Section', icon: '▭' },
    { type: 'navbar', label: 'Navbar', icon: '☰' },
    { type: 'menu', label: 'Menu', icon: '⋮' },
    { type: 'heading', label: 'Heading', icon: 'H' },
    { type: 'text', label: 'Text', icon: '¶' },
    { type: 'image', label: 'Image', icon: '▣' },
    { type: 'button', label: 'Button', icon: '⬤' },
    { type: 'columns', label: 'Columns', icon: '▥' },
    { type: 'spacer', label: 'Spacer', icon: '↕' },
  ];

  choose(type: BlockType): void {
    this.pick.emit(type);
    this.open = false;
  }
}
