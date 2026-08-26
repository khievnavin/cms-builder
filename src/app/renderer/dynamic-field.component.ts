import { Component, ElementRef, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ComponentDefinition } from '../shared/schema.types';

const MIN_WIDTH_PERCENT = 20;
const MAX_WIDTH_PERCENT = 100;

/**
 * Renders a single field, resolved at runtime by `type`.
 * - mode="fill": bound to a real FormControl, used by the client-facing form.
 * - mode="edit": read-only preview inside the builder canvas (click to select).
 *
 * This is the one place that needs a new `case` whenever a new component
 * type is added to the palette.
 */
@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="field" [class.selected]="selected" [class.resizing]="resizing" (click)="select.emit()">
      <ng-container [ngSwitch]="def.type">
        <h3 *ngSwitchCase="'section-header'">{{ def.label }}</h3>

        <label *ngSwitchDefault>
          {{ def.label }}<span *ngIf="def.validators?.required"> *</span>

          <ng-container [ngSwitch]="def.type">
            <input
              *ngSwitchCase="'text-input'"
              type="text"
              [formControl]="control!"
              [placeholder]="def.placeholder || ''"
              [disabled]="mode === 'edit'"
            />
            <input
              *ngSwitchCase="'number-input'"
              type="number"
              [formControl]="control!"
              [placeholder]="def.placeholder || ''"
              [disabled]="mode === 'edit'"
            />
            <textarea
              *ngSwitchCase="'textarea'"
              [formControl]="control!"
              [placeholder]="def.placeholder || ''"
              [disabled]="mode === 'edit'"
            ></textarea>
            <input
              *ngSwitchCase="'date-picker'"
              type="date"
              [formControl]="control!"
              [disabled]="mode === 'edit'"
            />
            <input
              *ngSwitchCase="'checkbox'"
              type="checkbox"
              [formControl]="control!"
              [disabled]="mode === 'edit'"
            />
            <select *ngSwitchCase="'select'" [formControl]="control!" [disabled]="mode === 'edit'">
              <option *ngFor="let opt of def.options" [value]="opt.value">{{ opt.label }}</option>
            </select>
            <div *ngSwitchCase="'radio-group'">
              <label *ngFor="let opt of def.options">
                <input
                  type="radio"
                  [value]="opt.value"
                  [formControl]="control!"
                  [disabled]="mode === 'edit'"
                />
                {{ opt.label }}
              </label>
            </div>
          </ng-container>

          <small *ngIf="def.helpText">{{ def.helpText }}</small>
        </label>
      </ng-container>

      <span
        *ngIf="mode === 'edit' && def.type !== 'section-header'"
        class="resize-handle"
        (mousedown)="startResize($event)"
        title="Drag to resize"
      ></span>
    </div>
  `,
  styles: [`
    /* This component's host tag (<app-dynamic-field>) is the actual flex item
       inside form-renderer's row — width must be controlled here, not on an
       inner div, since a descendant's flex-basis/max-width has no effect on
       how the flex container sizes this component. */
    :host {
      display: block;
      box-sizing: border-box;
      flex: 1 1 auto;
      margin: 6px;
    }
    .field {
      position: relative;
      box-sizing: border-box;
      height: 100%;
      padding: 10px 16px 10px 12px;
      border: 1px solid #e2e5ea;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .field:hover { border-color: #c7cdd6; }
    .field.selected { border-color: #4a7dff; background: #f0f4ff; box-shadow: 0 0 0 3px rgba(74, 125, 255, 0.15); }
    .field.resizing { border-color: #4a7dff; box-shadow: 0 0 0 3px rgba(74, 125, 255, 0.15); transition: none; }

    .resize-handle {
      position: absolute;
      top: 0;
      right: -6px;
      bottom: 0;
      width: 12px;
      cursor: ew-resize;
      z-index: 1;
    }
    .resize-handle::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 24px;
      transform: translate(-50%, -50%);
      border-radius: 2px;
      background: transparent;
      transition: background 0.15s ease;
    }
    .field:hover .resize-handle::after { background: #c7cdd6; }
    .resize-handle:hover::after, .field.resizing .resize-handle::after { background: #4a7dff; }

    label { display: block; font-size: 14px; font-weight: 500; color: #1f2430; }
    input, textarea, select {
      display: block;
      box-sizing: border-box;
      margin-top: 6px;
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #d6dae1;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      background: #fff;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #4a7dff;
      box-shadow: 0 0 0 3px rgba(74, 125, 255, 0.15);
    }
    textarea { resize: vertical; min-height: 60px; }
    small { display: block; margin-top: 4px; color: #666; font-weight: 400; }
  `],
})
export class DynamicFieldComponent {
  @Input() def!: ComponentDefinition;
  @Input() control?: FormControl;
  @Input() mode: 'edit' | 'fill' = 'fill';
  @Input() selected = false;
  @Output() select = new EventEmitter<void>();

  resizing = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  get widthStyle(): string {
    // Section headers always span the full row — they're not resizable.
    const percent = this.def.type === 'section-header' ? MAX_WIDTH_PERCENT : this.def.width ?? MAX_WIDTH_PERCENT;
    return `calc(${percent}% - 12px)`;
  }

  @HostBinding('style.flexBasis') get hostFlexBasis(): string {
    return this.widthStyle;
  }

  @HostBinding('style.maxWidth') get hostMaxWidth(): string {
    return this.widthStyle;
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const hostEl = this.el.nativeElement;
    const container = hostEl.parentElement as HTMLElement;
    const containerWidth = container.getBoundingClientRect().width;
    const startX = event.clientX;
    const startWidth = hostEl.getBoundingClientRect().width;

    this.resizing = true;
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      const rawPercent = ((startWidth + (e.clientX - startX)) / containerWidth) * 100;
      this.def.width = Math.round(Math.max(MIN_WIDTH_PERCENT, Math.min(MAX_WIDTH_PERCENT, rawPercent)));
    };
    const onMouseUp = () => {
      this.resizing = false;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}
