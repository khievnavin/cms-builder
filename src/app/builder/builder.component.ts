import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../shared/api.service';
import { ComponentDefinition, ComponentType, Template } from '../shared/schema.types';
import { FormRendererComponent } from '../renderer/form-renderer.component';

interface PaletteItem {
  type: ComponentType;
  label: string;
}

const PALETTE: PaletteItem[] = [
  { type: 'text-input', label: 'Text Input' },
  { type: 'textarea', label: 'Text Area' },
  { type: 'number-input', label: 'Number Input' },
  { type: 'select', label: 'Dropdown' },
  { type: 'radio-group', label: 'Radio Group' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'date-picker', label: 'Date Picker' },
  { type: 'section-header', label: 'Section Header' },
];

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DragDropModule, FormRendererComponent],
  template: `
    <div class="builder" *ngIf="template">
      <header>
        <h2 *ngIf="!editingName" (click)="startEditName()" title="Click to rename">{{ template.name }}</h2>
        <input
          *ngIf="editingName"
          class="name-input"
          [(ngModel)]="nameDraft"
          (blur)="saveName()"
          (keyup.enter)="saveName()"
          (keyup.escape)="editingName = false"
          autofocus
        />
        <button (click)="save()">Save Draft</button>
        <button (click)="publish()">Publish</button>
        <span *ngIf="publishedLink" class="link">
          Live link: <a [routerLink]="['/forms', publishedLink]">{{ publishedLink }}</a>
        </span>
      </header>

      <div class="layout">
        <!-- Palette -->
        <div class="palette" cdkDropList id="palette" [cdkDropListData]="paletteItems"
             [cdkDropListConnectedTo]="['canvas']" [cdkDropListSortingDisabled]="true">
          <div class="palette-item" *ngFor="let item of paletteItems" cdkDrag [cdkDragData]="item">
            {{ item.label }}
          </div>
        </div>

        <!-- Canvas -->
        <div class="canvas">
          <app-form-renderer
            [schema]="{ components: components }"
            mode="edit"
            [selectedId]="selected?.id ?? null"
            (fieldSelect)="selected = $event"
            (dropped)="drop($event)"
          ></app-form-renderer>
          <p *ngIf="!components.length" class="empty">Drag components here to build the template</p>
        </div>

        <!-- Property panel -->
        <div class="properties" *ngIf="selected">
          <h4>Field Properties</h4>
          <label>Label <input [(ngModel)]="selected.label" (ngModelChange)="touch()" /></label>
          <label>Key <input [(ngModel)]="selected.key" (ngModelChange)="touch()" /></label>
          <label *ngIf="selected.type !== 'section-header'">
            Placeholder <input [(ngModel)]="selected.placeholder" (ngModelChange)="touch()" />
          </label>
          <label class="hint" *ngIf="selected.type !== 'section-header'">
            Width: {{ selected.width ?? 100 }}% of row
            <small>Drag the handle on the field's right edge to resize it, or drag the field itself to reposition it.</small>
          </label>
          <label class="hint" *ngIf="selected.type === 'section-header'">
            Width: full row
            <small>Section headers always span the full row and can't be resized. Drag the field itself to reposition it.</small>
          </label>
          <label *ngIf="selected.type !== 'section-header'">
            <input type="checkbox" [(ngModel)]="selected.validators!.required" (ngModelChange)="touch()" />
            Required
          </label>

          <div class="options" *ngIf="selected.type === 'select' || selected.type === 'radio-group'">
            <h4>Options</h4>
            <div class="option-row" *ngFor="let opt of selected.options; let i = index">
              <input
                placeholder="Label"
                [(ngModel)]="opt.label"
                (ngModelChange)="onOptionLabelChange(opt)"
              />
              <input placeholder="Value" [(ngModel)]="opt.value" (ngModelChange)="touch()" />
              <button
                class="icon"
                title="Remove option"
                [disabled]="selected.options!.length <= 1"
                (click)="removeOption(i)"
              >&times;</button>
            </div>
            <button (click)="addOption()">Add option</button>
          </div>

          <button (click)="removeSelected()">Remove field</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    header { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #ddd; }
    header h2 { cursor: pointer; border-radius: 4px; padding: 2px 6px; margin: 0; }
    header h2:hover { background: #f0f4ff; }
    .name-input { font-size: 20px; font-weight: 600; padding: 2px 6px; border: 1px solid #4a7dff; border-radius: 4px; }
    .layout { display: grid; grid-template-columns: 200px 1fr 260px; gap: 16px; padding: 16px; }
    .palette-item { padding: 10px; margin-bottom: 8px; background: #eef; border-radius: 4px; cursor: grab; }
    .canvas { min-height: 400px; border: 2px dashed #ccc; border-radius: 6px; padding: 12px; }
    .empty { color: #999; text-align: center; margin-top: 40px; }
    .properties { border-left: 1px solid #ddd; padding-left: 16px; }
    .properties label { display: block; margin-bottom: 10px; font-size: 13px; }
    .properties input[type=text], .properties input:not([type]), .properties select { width: 100%; padding: 4px; }
    .properties label.hint { color: #444; }
    .properties label.hint small { display: block; margin-top: 4px; color: #888; font-weight: 400; }
    .options { margin-bottom: 12px; }
    .options h4 { margin: 0 0 8px; }
    .option-row { display: flex; gap: 6px; margin-bottom: 6px; }
    .option-row input { flex: 1; min-width: 0; padding: 4px; }
    .option-row .icon { flex: 0 0 auto; padding: 0 8px; }
    .link { margin-left: auto; }
  `],
})
export class BuilderComponent implements OnInit {
  template: Template | null = null;
  components: ComponentDefinition[] = [];
  paletteItems = PALETTE;
  selected: ComponentDefinition | null = null;
  publishedLink: string | null = null;
  editingName = false;
  nameDraft = '';

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const isNew = this.route.snapshot.queryParamMap.get('new') === 'true';
    this.api.getTemplate(id).subscribe((t) => {
      this.template = t;
      this.components = [...t.schema.components];
      if (isNew) this.startEditName();
    });
  }

  startEditName(): void {
    if (!this.template) return;
    this.nameDraft = this.template.name;
    this.editingName = true;
  }

  saveName(): void {
    if (!this.template) return;
    this.editingName = false;
    const name = this.nameDraft.trim();
    if (!name || name === this.template.name) return;
    this.api.updateTemplate(this.template.id, { name }).subscribe((t) => (this.template = t));
  }

  drop(event: CdkDragDrop<ComponentDefinition[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.components, event.previousIndex, event.currentIndex);
      this.reindex();
      return;
    }
    // Dropped from palette -> create a new field instance
    const paletteItem: PaletteItem = event.item.data;
    const newField: ComponentDefinition = {
      id: crypto.randomUUID(),
      type: paletteItem.type,
      key: `${paletteItem.type.replace(/-/g, '_')}_${this.components.length + 1}`,
      label: paletteItem.label,
      order: event.currentIndex,
      width: 100,
      validators: { required: false },
    };
    if (paletteItem.type === 'select' || paletteItem.type === 'radio-group') {
      newField.options = [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ];
    }
    this.components.splice(event.currentIndex, 0, newField);
    this.selected = newField;
    this.reindex();
  }

  private reindex(): void {
    this.components.forEach((c, i) => (c.order = i));
  }

  touch(): void {
    // property panel edits mutate `selected` directly (same object ref in components[])
  }

  private slugify(text: string): string {
    return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  onOptionLabelChange(opt: { label: string; value: string }): void {
    // Auto-fill the value from the label while the value is still blank;
    // once the user types a value of their own we leave it alone.
    if (!opt.value) opt.value = this.slugify(opt.label);
    this.touch();
  }

  addOption(): void {
    if (!this.selected) return;
    const opts = (this.selected.options ??= []);
    const n = opts.length + 1;
    opts.push({ label: `Option ${n}`, value: `option_${n}` });
    this.touch();
  }

  removeOption(index: number): void {
    if (!this.selected?.options || this.selected.options.length <= 1) return;
    this.selected.options.splice(index, 1);
    this.touch();
  }

  removeSelected(): void {
    if (!this.selected) return;
    this.components = this.components.filter((c) => c.id !== this.selected!.id);
    this.selected = null;
    this.reindex();
  }

  private saveSchema() {
    return this.api.saveTemplateSchema(this.template!.id, { components: this.components });
  }

  save(): void {
    if (!this.template) return;
    this.saveSchema().subscribe();
  }

  publish(): void {
    if (!this.template) return;
    // Publish snapshots whatever schema is currently persisted server-side,
    // so the save must complete before we ask the server to publish —
    // firing both requests in parallel risks publishing a stale (possibly
    // empty) schema if the publish request lands first.
    this.saveSchema().subscribe(() => {
      this.api.publishTemplate(this.template!.id).subscribe((instance) => {
        this.publishedLink = instance.id;
      });
    });
  }
}
