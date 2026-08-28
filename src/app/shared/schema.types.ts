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

// ---------------------------------------------------------------------------
// Page CMS ("website" builder) — a WordPress-style feature living alongside
// the form builder above. A Page is a tree of content blocks rendered full
// width on a public URL (/site/:slug), not confined to a fixed-width canvas
// like the form builder. Publishing snapshots the page into a PublishedPage
// the same way form Templates snapshot into FormInstances.
// ---------------------------------------------------------------------------

export type BlockType =
  | 'section'   // full-bleed band: own background + vertical padding, holds child blocks
  | 'heading'
  | 'text'      // rich text paragraph (stores sanitised-ish inline HTML)
  | 'image'
  | 'button'
  | 'spacer'
  | 'columns';  // 2 or 3 side-by-side columns, each holding child blocks

export interface BlockStyle {
  background?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  /** px cap on the inner content; null means full-bleed (edge to edge). */
  maxWidth?: number | null;
  paddingY?: number;
  paddingX?: number;
  marginTop?: number;
  marginBottom?: number;
  radius?: number;
  fontSize?: number;
  fontWeight?: number;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  order: number;
  /** heading / button label / text (HTML for 'text'). */
  text?: string;
  level?: 1 | 2 | 3;
  src?: string;
  alt?: string;
  href?: string;
  /** spacer height in px. */
  height?: number;
  /** section: child blocks. */
  children?: PageBlock[];
  /** columns: one child-block list per column (length 2 or 3). */
  columns?: PageBlock[][];
  style?: BlockStyle;
}

export interface PageContent {
  blocks: PageBlock[];
}

export interface PageStyleConfig {
  background?: string;
  textColor?: string;
  fontFamily?: string;
  accent?: string;
  /** default px width for contained (non-full-bleed) blocks. */
  contentWidth?: number;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  version: number;
  content: PageContent;
  pageStyle: PageStyleConfig;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedPage {
  id: string;
  pageId: string;
  pageVersion: number;
  slug: string;
  title: string;
  content: PageContent;
  pageStyle: PageStyleConfig;
  publishedAt: string;
}
