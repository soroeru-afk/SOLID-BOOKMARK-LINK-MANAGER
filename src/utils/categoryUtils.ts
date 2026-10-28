import { Category } from '../types';

/**
 * Returns categories ordered hierarchically (Parent -> Children recursively).
 * Subfolders will immediately follow their parent category in the array.
 */
export function getHierarchicalCategories(categories: Category[]): Category[] {
  const catMap = new Map<string, Category>();
  const childrenMap = new Map<string, Category[]>();

  for (const cat of categories) {
    catMap.set(cat.id, cat);
  }

  const roots: Category[] = [];

  for (const cat of categories) {
    if (cat.parentId && catMap.has(cat.parentId)) {
      const parentId = cat.parentId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(cat);
    } else {
      roots.push(cat);
    }
  }

  const result: Category[] = [];

  function traverse(cat: Category) {
    result.push(cat);
    const children = childrenMap.get(cat.id);
    if (children && children.length > 0) {
      for (const child of children) {
        traverse(child);
      }
    }
  }

  for (const root of roots) {
    traverse(root);
  }

  return result;
}

/**
 * Inserts a new category immediately after its parent (or parent's existing children).
 */
export function insertCategoryInHierarchy(categories: Category[], newCat: Category): Category[] {
  if (!newCat.parentId) {
    return [...categories, newCat];
  }

  const hierarchical = getHierarchicalCategories(categories);
  const parentId = newCat.parentId;
  
  // Find last descendant of parentId in hierarchical order
  let targetIndex = -1;
  for (let i = 0; i < hierarchical.length; i++) {
    if (hierarchical[i].id === parentId) {
      targetIndex = i;
    } else if (targetIndex !== -1 && (hierarchical[i].parentId === parentId || isDescendantOf(hierarchical[i], parentId, categories))) {
      targetIndex = i;
    }
  }

  if (targetIndex !== -1) {
    const updated = [...hierarchical];
    updated.splice(targetIndex + 1, 0, newCat);
    return updated;
  }

  return [...categories, newCat];
}

function isDescendantOf(cat: Category, parentId: string, allCategories: Category[]): boolean {
  const catMap = new Map(allCategories.map(c => [c.id, c]));
  let curr = cat;
  while (curr.parentId) {
    if (curr.parentId === parentId) return true;
    const parent = catMap.get(curr.parentId);
    if (!parent) break;
    curr = parent;
  }
  return false;
}

/**
 * Formats category name with visual hierarchy prefix (e.g. "  └ 001") for select dropdowns.
 */
export function getCategoryIndentedLabel(cat: Category, allCategories: Category[]): string {
  const catMap = new Map(allCategories.map(c => [c.id, c]));
  let depth = 0;
  let curr = cat;
  while (curr.parentId && catMap.has(curr.parentId)) {
    depth++;
    curr = catMap.get(curr.parentId)!;
  }
  if (depth === 0) return cat.name;
  const indent = '  '.repeat(depth - 1);
  return `${indent}└ ${cat.name}`;
}

