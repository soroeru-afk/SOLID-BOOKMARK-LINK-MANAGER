import { Category, Notebook } from '../types';

export interface ParseResult {
  categories: Category[];
  notebooks: Notebook[];
  stats: {
    totalFolders: number;
    totalBookmarks: number;
  };
}

/**
 * Netscape Bookmark Format (Chrome, Edge, Firefox, Safari export HTML) を
 * フォルダ階層構造を完全に維持したままパースする
 */
export function parseNetscapeBookmarks(htmlContent: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const categories: Category[] = [];
  const notebooks: Notebook[] = [];

  const rootDl = doc.querySelector('dl');
  if (!rootDl) {
    // 万が一DLタグがない場合のフォールバック
    const allA = Array.from(doc.querySelectorAll('a'));
    allA.forEach(a => {
      const url = a.getAttribute('href');
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        notebooks.push({
          id: 'nb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9),
          title: a.textContent?.trim() || url,
          url,
          categoryId: '',
          createdAt: parseInt(a.getAttribute('add_date') || '0') * 1000 || Date.now(),
        });
      }
    });
    return {
      categories,
      notebooks,
      stats: { totalFolders: 0, totalBookmarks: notebooks.length }
    };
  }

  function walkDl(dl: Element, parentCatId: string | null, parentPath: string) {
    const children = Array.from(dl.children);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = child.tagName.toUpperCase();

      if (tag === 'DT') {
        const h3 = child.querySelector(':scope > h3') || child.querySelector('h3');
        const a = child.querySelector(':scope > a') || child.querySelector('a');

        if (h3) {
          const folderName = h3.textContent?.trim() || 'Folder';
          const newPath = parentPath ? `${parentPath} / ${folderName}` : folderName;
          const catId = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);

          categories.push({
            id: catId,
            name: folderName,
            parentId: parentCatId,
            path: newPath
          });

          // このフォルダの直下にあるDLを探す
          let subDl = child.querySelector(':scope > dl') || child.querySelector('dl');
          if (!subDl && i + 1 < children.length && children[i + 1].tagName.toUpperCase() === 'DL') {
            subDl = children[i + 1];
            i++; // 兄弟要素のDLを処理済みにする
          }

          if (subDl) {
            walkDl(subDl, catId, newPath);
          }
        } else if (a) {
          const url = a.getAttribute('href');
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            notebooks.push({
              id: 'nb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9),
              title: a.textContent?.trim() || url,
              url,
              categoryId: parentCatId || '',
              createdAt: parseInt(a.getAttribute('add_date') || '0') * 1000 || Date.now(),
            });
          }
        } else {
          // 子要素にさらにDLがある場合
          const innerDl = child.querySelector('dl');
          if (innerDl) {
            walkDl(innerDl, parentCatId, parentPath);
          }
        }
      } else if (tag === 'DL' || tag === 'P') {
        walkDl(child, parentCatId, parentPath);
      }
    }
  }

  walkDl(rootDl, null, '');

  return {
    categories,
    notebooks,
    stats: {
      totalFolders: categories.length,
      totalBookmarks: notebooks.length
    }
  };
}
