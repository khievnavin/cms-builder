import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ComponentDefinition, TemplateSchema } from '../shared/schema.types';
import { DynamicFieldComponent } from './dynamic-field.component';

/**
 * Shared rendering engine for both builder-canvas preview ("edit" mode) and
 * client form-fill ("fill" mode). Builds one FormControl per schema
 * component, wiring Angular Validators from each field's ValidatorConfig.
 *
 * In "edit" mode, each field is a cdkDrag item inside this component's own
 * cdkDropList (id="canvas") — that's what lets the builder canvas both
 * receive new fields dropped from the palette and reorder existing ones.
 * cdkDrag must sit on the <app-dynamic-field> tag itself (not on an element
 * inside its own template) because CdkDropList discovers items via
 * @ContentChildren, which can't see into a child component's view.
 */
@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule, DynamicFieldComponent],
  template: `
    <form
      [formGroup]="form"
      class="field-row"
      id="canvas"
      cdkDropList
      cdkDropListOrientation="mixed"
      [cdkDropListData]="sortedComponents"
      [cdkDropListConnectedTo]="['palette']"
      [cdkDropListDisabled]="mode !== 'edit'"
      (cdkDropListDropped)="dropped.emit($event)"
    >
      <app-dynamic-field
        *ngFor="let def of sortedComponents"
        cdkDrag
        [cdkDragDisabled]="mode !== 'edit'"
        [def]="def"
        [control]="asControl(form.get(def.key))"
        [mode]="mode"
        [selected]="selectedId === def.id"
        (select)="fieldSelect.emit(def)"
      ></app-dynamic-field>
    </form>
  `,
  styles: [`
    .field-row { display: flex; flex-wrap: wrap; align-items: flex-start; min-height: 60px; }
    app-dynamic-field.cdk-drag { cursor: grab; }
    app-dynamic-field.cdk-drag-dragging { cursor: grabbing; opacity: 0.6; }
    app-dynamic-field.cdk-drag-placeholder { opacity: 0.3; }
  `],
})
export class FormRendererComponent implements OnChanges {
  @Input() schema!: TemplateSchema;
  @Input() mode: 'edit' | 'fill' = 'fill';
  @Input() selectedId: string | null = null;
  @Output() fieldSelect = new EventEmitter<ComponentDefinition>();
  @Output() formReady = new EventEmitter<FormGroup>();
  @Output() dropped = new EventEmitter<CdkDragDrop<ComponentDefinition[]>>();

  form = new FormGroup({});

  get sortedComponents(): ComponentDefinition[] {
    return [...(this.schema?.components ?? [])].sort((a, b) => a.order - b.order);
  }

  ngOnChanges(): void {
    this.rebuildForm();
  }

  private rebuildForm(): void {
    const group: Record<string, FormControl> = {};
    for (const def of this.sortedComponents) {
      if (def.type === 'section-header') continue;
      const validators = [];
      if (def.validators?.required) validators.push(Validators.required);
      if (def.validators?.minLength) validators.push(Validators.minLength(def.validators.minLength));
      if (def.validators?.maxLength) validators.push(Validators.maxLength(def.validators.maxLength));
      if (def.validators?.min !== undefined) validators.push(Validators.min(def.validators.min));
      if (def.validators?.max !== undefined) validators.push(Validators.max(def.validators.max));
      if (def.validators?.pattern) validators.push(Validators.pattern(def.validators.pattern));
      group[def.key] = new FormControl(def.type === 'checkbox' ? false : '', validators);
    }
    this.form = new FormGroup(group);
    this.formReady.emit(this.form);
  }

  asControl(c: any): FormControl {
    return c as FormControl;
  }
}
