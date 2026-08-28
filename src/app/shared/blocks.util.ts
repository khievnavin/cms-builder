import { BlockType, PageBlock } from './schema.types';

/** Factory for a fresh block of the given type, with POC-friendly defaults. */
export function newBlock(type: BlockType): PageBlock {
  const base: PageBlock = { id: crypto.randomUUID(), type, order: 0, style: {} };
  switch (type) {
    case 'heading':
      return { ...base, text: 'New heading', level: 2, style: { align: 'left' } };
    case 'text':
      return {
        ...base,
        text: 'Write something worth reading. Select this text to edit it inline.',
        style: { align: 'left' },
      };
    case 'image':
      return { ...base, src: '', alt: '', style: { align: 'center', radius: 8 } };
    case 'button':
      return { ...base, text: 'Call to action', href: '#', style: { align: 'left' } };
    case 'spacer':
      return { ...base, height: 48 };
    case 'section':
      return {
        ...base,
        children: [],
        style: { paddingY: 64, paddingX: 24, background: '', maxWidth: 820 },
      };
    case 'columns':
      return { ...base, columns: [[], []], style: { paddingY: 24, maxWidth: 980 } };
  }
}

/** Deep-clones a block subtree, assigning fresh ids throughout (for duplicate). */
export function cloneBlock(block: PageBlock): PageBlock {
  const copy: PageBlock = structuredClone(block);
  const reid = (b: PageBlock) => {
    b.id = crypto.randomUUID();
    b.children?.forEach(reid);
    b.columns?.forEach((col) => col.forEach(reid));
  };
  reid(copy);
  return copy;
}

/** Depth-first search for a block by id across children and column trees. */
export function findBlock(id: string, list: PageBlock[]): PageBlock | null {
  for (const b of list) {
    if (b.id === id) return b;
    const nested =
      (b.children && findBlock(id, b.children)) ||
      (b.columns && b.columns.reduce<PageBlock | null>((hit, col) => hit || findBlock(id, col), null));
    if (nested) return nested;
  }
  return null;
}
