export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  path?: string;
}

export interface Notebook {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  createdAt: number;
  color?: string; // Color preset ID (e.g. 'red', 'blue', 'green') or hex
}
