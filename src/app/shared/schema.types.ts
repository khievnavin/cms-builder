// Shared schema types — kept identical to cms-builder/src/app/shared/schema.types.ts
// In a real setup, extract this into a shared npm package to guarantee no drift.

export type ComponentType =
  | 'text-input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio-group'
  | 'date-picker'
  | 'number-input'
  | 'section-header';

export interface ValidatorConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface OptionConfig {
  label: string;
  value: string;
}

export interface ComponentDefinition {
  id: string;
  type: ComponentType;
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  order: number;
  /** Row width as a percentage (20-100). Dragged via the builder's resize handle; defaults to 100 (full row). */
  width?: number;
  validators?: ValidatorConfig;
  options?: OptionConfig[];
}

export interface TemplateSchema {
  components: ComponentDefinition[];
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published';
  version: number;
  schema: TemplateSchema;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormInstance {
  id: string;
  templateId: string;
  templateVersion: number;
  schema: TemplateSchema;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface Submission {
  id: string;
  formInstanceId: string;
  data: Record<string, unknown>;
  submittedAt: string;
}
