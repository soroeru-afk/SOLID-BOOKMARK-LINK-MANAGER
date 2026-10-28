import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import SearchModule, { SearchScope } from './components/SearchModule';
import NotebookList from './components/NotebookList';
import Header from './components/Header';
import { Category, Notebook } from './types';
import { Language } from './i18n';
import { parseNetscapeBookmarks } from './utils/bookmarkParser';
import { CheckCircle2, X, AlertTriangle, FolderTree, Bookmark } from 'lucide-react';
import { i18n } from './i18n';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BookmarkletModal } from './components/BookmarkletModal';
import { IncomingBookmarkModal } from './components/IncomingBookmarkModal';
import { FolderManager } from './components/FolderManager';
import { LinkOpenMode, WindowSizePreset, CustomWindowDimensions } from './utils/windowOpener';
import { insertCategoryInHierarchy } from './utils/categoryUtils';
import { ColorPreset, getColorPresets, saveColorPresets } from './utils/colorPresets';

export type Theme = 'black' | 'red' | 'dark' | 'light' | 'paper' | 'pink';
export type FontFamily = 'meiryo' | 'noto' | 'mono' | 'yugothic' | 'biz';

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    const validThemes: Theme[] = ['black', 'red', 'dark', 'light', 'paper', 'pink'];
    if (saved && validThemes.includes(saved as Theme)) {
      return saved as Theme;
    }
    return 'black';
  });

  const [font, setFont] = useState<FontFamily>(
    () => (localStorage.getItem('font') as FontFamily) || 'meiryo'
  );

  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'EN'
  );

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : [{ id: '1', name: 'General', path: 'General' }];
  });

  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    const saved = localStorage.getItem('notebooks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(() => {
    const saved = localStorage.getItem('active_category_id');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed === '__UNASSIGNED__') return parsed;
        if (typeof parsed === 'string') {
          const savedCats = localStorage.getItem('categories');
          if (savedCats) {
            const cats: Category[] = JSON.parse(savedCats);
            if (cats.some(c => c.id === parsed)) return parsed;
          }
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(() => {
    const saved = localStorage.getItem('include_subfolders');
    return saved !== null ? saved === 'true' : false;
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isBookmarkletModalOpen, setIsBookmarkletModalOpen] = useState<boolean>(false);

  // メイン画面の表示モード (ブックマーク一覧 'bookmarks' / フォルダー管理 'folders')
  const [mainView, setMainView] = useState<'bookmarks' | 'folders'>('bookmarks');

  // サイドバーの位置 (左 left / 右 right)
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    const saved = localStorage.getItem('sidebar_position');
    return saved === 'right' ? 'right' : 'left';
  });

  const toggleSidebarPosition = () => {
    setSidebarPosition(prev => {
      const next = prev === 'left' ? 'right' : 'left';
      localStorage.setItem('sidebar_position', next);
      return next;
    });
  };

  // テキストサイズ設定 (localStorageに保存・復元)
  const [listFontSize, setListFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('font_size_list');
    return saved ? Math.max(9, Math.min(22, parseInt(saved, 10))) : 11;
  });

  const [linkFontSize, setLinkFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('font_size_link');
    return saved ? Math.max(10, Math.min(24, parseInt(saved, 10))) : 13;
  });

  // リンクの開き方モード（独立ウィンドウ / 新規タブ）
  const [linkOpenMode, setLinkOpenMode] = useState<LinkOpenMode>(() => {
    const saved = localStorage.getItem('link_open_mode');
    return (saved === 'tab' || saved === 'window') ? saved : 'window';
  });

  // 独立ウィンドウのサイズプリセット（標準 1280 / ワイド 1440 / 特大 1680 / 超特大 1920×1160 / 全画面 MAX / コンパクト 1040 / カスタム）
  const [windowSizePreset, setWindowSizePreset] = useState<WindowSizePreset>(() => {
    const saved = localStorage.getItem('window_size_preset');
    const validPresets: WindowSizePreset[] = ['compact', 'standard', 'wide', 'ultra', 'fhd', 'max', 'custom'];
    return validPresets.includes(saved as WindowSizePreset) ? (saved as WindowSizePreset) : 'standard';
  });

  // カスタムウィンドウサイズ（横幅 W × 高さ H）
  const [customDimensions, setCustomDimensions] = useState<CustomWindowDimensions>(() => {
    const saved = localStorage.getItem('custom_window_dimensions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            width: Math.max(640, Math.min(3840, parsed.width)),
            height: Math.max(480, Math.min(2160, parsed.height))
          };
        }
      } catch (e) {
        // ignore parse error
      }
    }
    return { width: 1560, height: 980 };
  });

  // 検索ステート（キーワードおよびスコープ）
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('current');

  // カード配色カラーラベルステート
  const [colorPresets, setColorPresets] = useState<ColorPreset[]>(() => getColorPresets());

  const handleUpdateColorPresets = (newPresets: ColorPreset[]) => {
    setColorPresets(newPresets);
    saveColorPresets(newPresets);
  };

  // カードとリスト全体のカラー反映 表示・非表示ステート (localStorage永続化)
  const [showColors, setShowColors] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_colors');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleShowColors = () => {
    setShowColors(prev => {
      const next = !prev;
      localStorage.setItem('show_colors', String(next));
      return next;
    });
  };

  // リスト表示でのカラー反映 表示・非表示ステート (localStorage永続化)
  const [showListColors, setShowListColors] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_list_colors');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleShowListColors = () => {
    setShowListColors(prev => {
      const next = !prev;
      localStorage.setItem('show_list_colors', String(next));
      return next;
    });
  };

  // 全ブックマークの配色を一括消去・リセット
  const handleResetAllColors = () => {
    setNotebooks(prev => prev.map(nb => ({ ...nb, color: undefined })));
    setNotification(
      language === 'JP'
        ? 'すべてのブックマークの配色（カラー設定）を一括リセット（消去）しました'
        : 'ALL BOOKMARK COLOR TAGS RESET'
    );
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Dynamic meta theme-color sync for browser header/titlebar (matching K-NAVIGATOR & SOLID AUDIO base-bg)
    let themeColorHex = '#0a0d12'; // default black
    if (theme === 'dark') themeColorHex = '#090f19';
    else if (theme === 'red') themeColorHex = '#090203';
    else if (theme === 'paper') themeColorHex = '#ebe4d8';
    else if (theme === 'pink') themeColorHex = '#141013';
    else if (theme === 'light') themeColorHex = '#e2e8f0';

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', themeColorHex);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', font);
    localStorage.setItem('font', font);
  }, [font]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('font_size_list', String(listFontSize));
  }, [listFontSize]);

  useEffect(() => {
    localStorage.setItem('font_size_link', String(linkFontSize));
  }, [linkFontSize]);

  useEffect(() => {
    localStorage.setItem('link_open_mode', linkOpenMode);
  }, [linkOpenMode]);

  useEffect(() => {
    localStorage.setItem('window_size_preset', windowSizePreset);
  }, [windowSizePreset]);

  useEffect(() => {
    localStorage.setItem('custom_window_dimensions', JSON.stringify(customDimensions));
  }, [customDimensions]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem('active_category_id', JSON.stringify(activeCategoryId));
  }, [activeCategoryId]);

  useEffect(() => {
    localStorage.setItem('include_subfolders', String(includeSubfolders));
  }, [includeSubfolders]);

  // 1クリック保存等で外部から受取したブックマーク用の一時データ
  const [incomingBookmark, setIncomingBookmark] = useState<{ title: string; url: string; categoryId: string } | null>(null);

  // ブックマークレット・Web Share Target等からのURLパラメータ自動検知・受取ダイアログ起動
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawTitle = params.get('add_title') || params.get('title') || params.get('text');
      const rawUrl = params.get('add_url') || params.get('url');
      const paramCatId = params.get('category_id');

      if (rawUrl) {
        // URLSearchParams.get() は自動的にデコードを行うため再デコードは不要（URIError防止）
        let decodedTitle = rawTitle || 'New Bookmark';
        let decodedUrl = rawUrl;

        // 安全のために念のため文字化け対策の処理
        try {
          if (rawTitle && rawTitle.includes('%')) {
            decodedTitle = decodeURIComponent(rawTitle);
          }
        } catch {
          // エラーが発生した場合はそのまま rawTitle を使用
        }

        try {
          if (rawUrl && rawUrl.includes('%')) {
            decodedUrl = decodeURIComponent(rawUrl);
          }
        } catch {
          // エラーが発生した場合はそのまま rawUrl を使用
        }

        // 保存先カテゴリーの初期値決定（指定があれば優先、無ければアクティブカテゴリ、無ければ未割り当て）
        let defaultCategoryId = '';
        if (paramCatId) {
          defaultCategoryId = paramCatId === '__UNASSIGNED__' ? '' : paramCatId;
        } else if (activeCategoryId && activeCategoryId !== '__UNASSIGNED__') {
          defaultCategoryId = activeCategoryId;
        }

        // 受取モーダルを起動してユーザーに保存先フォルダをプルダウン選択させる
        setIncomingBookmark({
          title: decodedTitle,
          url: decodedUrl,
          categoryId: defaultCategoryId
        });

        // クエリパラメータをURLから削除して重複起動を防止
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Failed to parse URL params', e);
    }
  }, []);

  const handleSaveIncomingBookmark = (finalTitle: string, finalUrl: string, finalCatId: string) => {
    const newBookmark: Notebook = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      title: finalTitle,
      url: finalUrl,
      categoryId: finalCatId,
      createdAt: Date.now()
    };

    setNotebooks(prev => [newBookmark, ...prev]);

    // 保存先フォルダへ即時に切り替え ＆ 検索クエリをクリアして画面上に1秒で反映させる
    if (finalCatId) {
      setActiveCategoryId(finalCatId);
    } else {
      setActiveCategoryId('__UNASSIGNED__');
    }
    setSearchQuery('');

    const targetCatObj = categories.find(c => c.id === finalCatId);
    const catName = targetCatObj ? (targetCatObj.path || targetCatObj.name) : (language === 'JP' ? '未割り当て' : 'Unassigned');

    const successMsg = language === 'JP'
      ? `【保存完了】「${finalTitle}」を『${catName}』フォルダに追加しました！`
      : `[Saved] Added "${finalTitle}" to "${catName}"!`;
    setNotification(successMsg);
    setIncomingBookmark(null);
  };

  // 通知の自動消去
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const addCategory = (name: string, parentId?: string | null) => {
    const parent = parentId ? categories.find(c => c.id === parentId) : null;
    const path = parent ? `${parent.path || parent.name} / ${name}` : name;
    const newCategory: Category = {
      id: 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      name,
      parentId: parentId || null,
      path
    };
    setCategories(prev => insertCategoryInHierarchy(prev, newCategory));
  };

  const updateCategory = (id: string, name: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    // パスを再計算
    const parent = cat.parentId ? categories.find(c => c.id === cat.parentId) : null;
    const newPath = parent ? `${parent.path || parent.name} / ${name}` : name;

    // 子孫カテゴリのpathも更新
    const oldPathPrefix = cat.path || cat.name;
    const updated = categories.map(c => {
      if (c.id === id) {
        return { ...c, name, path: newPath };
      }
      if (c.path && c.path.startsWith(oldPathPrefix + ' / ')) {
        const subPath = c.path.slice((oldPathPrefix + ' / ').length);
        return { ...c, path: `${newPath} / ${subPath}` };
      }
      return c;
    });

    setCategories(updated);
  };

  // カテゴリとそのすべての子孫カテゴリのIDを取得
  const getCategoryDescendantIds = (rootId: string): Set<string> => {
    const ids = new Set<string>([rootId]);
    const findChildren = (pid: string) => {
      for (const c of categories) {
        if (c.parentId === pid && !ids.has(c.id)) {
          ids.add(c.id);
          findChildren(c.id);
        }
      }
    };
    findChildren(rootId);
    return ids;
  };

  const deleteCategory = (id: string) => {
    const idsToDelete = getCategoryDescendantIds(id);

    setCategories(categories.filter(c => !idsToDelete.has(c.id)));
    setNotebooks(notebooks.map(nb => idsToDelete.has(nb.categoryId) ? { ...nb, categoryId: '' } : nb));

    if (activeCategoryId && idsToDelete.has(activeCategoryId)) {
      setActiveCategoryId(null);
    }
  };

  const moveCategoryOrder = (categoryId: string, direction: 'top' | 'up' | 'down' | 'bottom') => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const parentId = cat.parentId || null;
    const siblings = categories.filter(c => (c.parentId || null) === parentId);
    const siblingIndex = siblings.findIndex(c => c.id === categoryId);
    if (siblingIndex === -1) return;

    let targetIndex = siblingIndex;
    if (direction === 'top') targetIndex = 0;
    else if (direction === 'up') targetIndex = Math.max(0, siblingIndex - 1);
    else if (direction === 'down') targetIndex = Math.min(siblings.length - 1, siblingIndex + 1);
    else if (direction === 'bottom') targetIndex = siblings.length - 1;

    if (targetIndex === siblingIndex) return;

    const reorderedSiblings = [...siblings];
    const [moved] = reorderedSiblings.splice(siblingIndex, 1);
    reorderedSiblings.splice(targetIndex, 0, moved);

    let sibIdx = 0;
    const newCategories = categories.map(c => {
      if ((c.parentId || null) === parentId) {
        return reorderedSiblings[sibIdx++];
      }
      return c;
    });

    setCategories(newCategories);
  };

  const reorderCategorySiblings = (parentId: string | null, sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    const siblings = categories.filter(c => (c.parentId || null) === parentId);
    if (sourceIndex < 0 || sourceIndex >= siblings.length || targetIndex < 0 || targetIndex >= siblings.length) return;

    const reorderedSiblings = [...siblings];
    const [moved] = reorderedSiblings.splice(sourceIndex, 1);
    reorderedSiblings.splice(targetIndex, 0, moved);

    let sibIdx = 0;
    const newCategories = categories.map(c => {
      if ((c.parentId || null) === parentId) {
        return reorderedSiblings[sibIdx++];
      }
      return c;
    });

    setCategories(newCategories);
  };

  const changeParentCategory = (categoryId: string, newParentId: string | null) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    if ((cat.parentId || null) === newParentId) return;

    const descendantIds = getCategoryDescendantIds(categoryId);
    if (newParentId && descendantIds.has(newParentId)) {
      return;
    }

    const newParent = newParentId ? categories.find(c => c.id === newParentId) : null;
    const newPath = newParent ? `${newParent.path || newParent.name} / ${cat.name}` : cat.name;
    const oldPathPrefix = cat.path || cat.name;

    const updated = categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          parentId: newParentId || null,
          path: newPath
        };
      }
      if (c.path && c.path.startsWith(oldPathPrefix + ' / ')) {
        const subPath = c.path.slice((oldPathPrefix + ' / ').length);
        return { ...c, path: `${newPath} / ${subPath}` };
      }
      return c;
    });

    setCategories(updated);
  };

  const sortCategorySiblings = (parentId: string | null, mode: 'name-asc' | 'count-desc') => {
    const directCounts = new Map<string, number>();
    if (mode === 'count-desc') {
      for (const nb of notebooks) {
        if (nb.categoryId) {
          directCounts.set(nb.categoryId, (directCounts.get(nb.categoryId) || 0) + 1);
        }
      }
    }

    const siblings = categories.filter(c => (c.parentId || null) === parentId);
    const sortedSiblings = [...siblings].sort((a, b) => {
      if (mode === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        const countA = directCounts.get(a.id) || 0;
        const countB = directCounts.get(b.id) || 0;
        return countB - countA;
      }
    });

    let sibIdx = 0;
    const newCategories = categories.map(c => {
      if ((c.parentId || null) === parentId) {
        return sortedSiblings[sibIdx++];
      }
      return c;
    });

    setCategories(newCategories);
  };

  const addNotebooks = (items: {title: string, url: string, categoryId: string}[]) => {
    const newNotebooks = items.map((item, index) => ({
      id: Date.now().toString(36) + '_' + index,
      ...item,
      createdAt: Date.now()
    }));
    setNotebooks([...newNotebooks, ...notebooks]);
  };

  const handleCreateShortcut = (targetNotebook: Notebook, destinationCategoryId: string) => {
    const realTargetId = (targetNotebook.isShortcut && targetNotebook.targetId) ? targetNotebook.targetId : targetNotebook.id;
    const realTarget = notebooks.find(nb => nb.id === realTargetId) || targetNotebook;

    const shortcutNotebook: Notebook = {
      id: 'sc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      title: realTarget.title,
      url: realTarget.url,
      color: realTarget.color, // コピー元の色を継承
      categoryId: destinationCategoryId,
      createdAt: Date.now(),
      isShortcut: true,
      targetId: realTargetId
    };
    setNotebooks(prev => [shortcutNotebook, ...prev]);
    const targetCatObj = categories.find(c => c.id === destinationCategoryId);
    const catName = targetCatObj ? (targetCatObj.path || targetCatObj.name) : (language === 'JP' ? '未割り当て' : 'Unassigned');
    setNotification(
      language === 'JP'
        ? `「${realTarget.title}」のショートカットを『${catName}』フォルダに作成しました`
        : `Created shortcut for "${realTarget.title}" in "${catName}"`
    );
  };

  const handleBulkCreateShortcuts = (selectedIds: string[], destinationCategoryId: string) => {
    if (selectedIds.length === 0) return;
    const isUnassigned = destinationCategoryId === '__UNASSIGNED__' || destinationCategoryId === '';
    const targetCat = isUnassigned ? null : categories.find(c => c.id === destinationCategoryId);
    const destName = isUnassigned 
      ? (language === 'JP' ? '未割り当て' : 'Unassigned') 
      : (targetCat?.name || targetCat?.path || destinationCategoryId);

    const newShortcuts: Notebook[] = [];
    for (const id of selectedIds) {
      const original = notebooks.find(nb => nb.id === id);
      if (!original) continue;

      const realTargetId = (original.isShortcut && original.targetId) ? original.targetId : original.id;
      const realTarget = notebooks.find(nb => nb.id === realTargetId) || original;

      newShortcuts.push({
        id: 'sc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6) + '_' + Math.random().toString(36).substring(2, 5),
        title: realTarget.title,
        url: realTarget.url,
        color: realTarget.color, // コピー元の色を継承
        categoryId: isUnassigned ? '' : destinationCategoryId,
        createdAt: Date.now(),
        isShortcut: true,
        targetId: realTargetId
      });
    }

    if (newShortcuts.length > 0) {
      setNotebooks(prev => [...newShortcuts, ...prev]);
      setNotification(
        language === 'JP'
          ? `${newShortcuts.length} 件のショートカットを『${destName}』フォルダに作成しました`
          : `Created ${newShortcuts.length} shortcut(s) in "${destName}"`
      );
    }
  };
  
  const deleteNotebooks = (ids: string[]) => {
    setNotebooks(notebooks.filter(nb => !ids.includes(nb.id)));
  };

  /**
   * カオルさまご指定: ショートカットと本体のカラー同期
   * 本体またはショートカットのいずれかで色を変更した場合、双方が同じ色に自動連動します
   */
  const updateNotebook = (id: string, updates: Partial<Notebook>) => {
    setNotebooks(prev => {
      const targetItem = prev.find(nb => nb.id === id);
      if (!targetItem) return prev;

      // 対象がショートカットであれば本体ID、本体であれば自身を基準IDとする
      const rootTargetId = (targetItem.isShortcut && targetItem.targetId) ? targetItem.targetId : id;

      return prev.map(nb => {
        // 本体 または その本体を参照するすべてのショートカット、または指定IDのアイテム
        if (nb.id === rootTargetId || nb.targetId === rootTargetId || nb.id === id) {
          return { ...nb, ...updates };
        }
        return nb;
      });
    });
  };

  const moveNotebooksToCategory = (notebookIds: string[], targetCategoryId: string) => {
    if (notebookIds.length === 0) return;
    const isUnassigned = targetCategoryId === '__UNASSIGNED__' || targetCategoryId === '';
    const targetCat = isUnassigned ? null : categories.find(c => c.id === targetCategoryId);
    const targetName = isUnassigned 
      ? (language === 'JP' ? '未割り当て' : 'Unassigned') 
      : (targetCat?.name || targetCategoryId);

    setNotebooks(prev => prev.map(nb => {
      if (notebookIds.includes(nb.id)) {
        return { ...nb, categoryId: isUnassigned ? '' : targetCategoryId };
      }
      return nb;
    }));

    const count = notebookIds.length;
    setNotification(
      language === 'JP'
        ? `${count} 件のブックマークを「${targetName}」へ移動しました`
        : `Moved ${count} bookmark(s) to "${targetName}"`
    );
  };

  const reorderNotebooks = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setNotebooks(prev => {
      const sourceIdx = prev.findIndex(nb => nb.id === sourceId);
      const targetIdx = prev.findIndex(nb => nb.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      return updated;
    });
  };

  /**
   * カオルさまご指定: ブックマークを複数選択して上下・最上部・最下部へ移動
   * Shift選択等で複数選ばれた項目をまとめて移動します
   */
  const moveNotebooksOrder = (
    selectedIds: string[],
    direction: 'top' | 'up' | 'down' | 'bottom',
    contextIds: string[]
  ) => {
    if (selectedIds.length === 0 || contextIds.length <= 1) return;

    const selSet = new Set(selectedIds);
    let newContextOrder = [...contextIds];

    if (direction === 'top') {
      const selectedItems = newContextOrder.filter(id => selSet.has(id));
      const unselectedItems = newContextOrder.filter(id => !selSet.has(id));
      newContextOrder = [...selectedItems, ...unselectedItems];
    } else if (direction === 'bottom') {
      const selectedItems = newContextOrder.filter(id => selSet.has(id));
      const unselectedItems = newContextOrder.filter(id => !selSet.has(id));
      newContextOrder = [...unselectedItems, ...selectedItems];
    } else if (direction === 'up') {
      for (let i = 1; i < newContextOrder.length; i++) {
        if (selSet.has(newContextOrder[i]) && !selSet.has(newContextOrder[i - 1])) {
          const temp = newContextOrder[i];
          newContextOrder[i] = newContextOrder[i - 1];
          newContextOrder[i - 1] = temp;
        }
      }
    } else if (direction === 'down') {
      for (let i = newContextOrder.length - 2; i >= 0; i--) {
        if (selSet.has(newContextOrder[i]) && !selSet.has(newContextOrder[i + 1])) {
          const temp = newContextOrder[i];
          newContextOrder[i] = newContextOrder[i + 1];
          newContextOrder[i + 1] = temp;
        }
      }
    }

    // 全体のnotebooksに順序を反映
    const contextSet = new Set(contextIds);
    const nbMap = new Map(notebooks.map(nb => [nb.id, nb]));
    let contextIdx = 0;
    const updatedNotebooks = notebooks.map(nb => {
      if (contextSet.has(nb.id)) {
        const targetId = newContextOrder[contextIdx++];
        return nbMap.get(targetId) || nb;
      }
      return nb;
    });

    setNotebooks(updatedNotebooks);
  };

  const handleExportJson = () => {
    const data = { categories, notebooks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solid_bookmarks_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data && (Array.isArray(data.categories) || Array.isArray(data.notebooks))) {
        const importedCats: Category[] = Array.isArray(data.categories) ? data.categories : [];
        const importedNbs: Notebook[] = Array.isArray(data.notebooks) ? data.notebooks : [];

        // 既存データを保持しながらマージ（重複IDを排除）
        setCategories(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCats = importedCats.filter(c => c.id && !existingIds.has(c.id));
          return [...prev, ...newCats];
        });

        setNotebooks(prev => {
          const existingIds = new Set(prev.map(nb => nb.id));
          const newNbs = importedNbs.filter(nb => nb.id && !existingIds.has(nb.id));
          return [...newNbs, ...prev];
        });

        setNotification(
          language === 'JP' 
            ? `JSON統合インポート完了: フォルダ ${importedCats.length} 件 / ブックマーク ${importedNbs.length} 件を取り込み（既存データはそのまま保持されます）`
            : `JSON MERGED: ${importedCats.length} FOLDERS / ${importedNbs.length} BOOKMARKS PRESERVED`
        );
      }
    } catch {
      console.error("Failed to parse JSON");
      setNotification(
        language === 'JP' ? 'JSONデータの解析中にエラーが発生しました' : 'ERROR PARSING JSON DATA'
      );
    }
  };

  const handleImportHtml = (content: string) => {
    try {
      const { categories: importedCats, notebooks: importedNbs, stats } = parseNetscapeBookmarks(content);
      
      if (importedCats.length === 0 && importedNbs.length === 0) {
        setNotification(
          language === 'JP'
            ? '有効なブックマークデータが見つかりませんでした'
            : 'NO VALID BOOKMARKS FOUND IN FILE'
        );
        return;
      }

      setCategories(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newCats = importedCats.filter(c => !existingIds.has(c.id));
        return [...prev, ...newCats];
      });

      setNotebooks(prev => {
        const existingIds = new Set(prev.map(nb => nb.id));
        const newNbs = importedNbs.filter(nb => !existingIds.has(nb.id));
        return [...newNbs, ...prev];
      });

      setNotification(
        language === 'JP'
          ? `HTMLインポート統合完了: フォルダ ${stats.totalFolders} 件 / ブックマーク ${stats.totalBookmarks} 件を取り込みました（既存データ保持）`
          : `IMPORTED: ${stats.totalFolders} FOLDERS / ${stats.totalBookmarks} BOOKMARKS PRESERVED`
      );
    } catch (e) {
      console.error("Failed to parse HTML bookmarks", e);
      setNotification(
        language === 'JP'
          ? 'HTMLブックマークの解析中にエラーが発生しました'
          : 'ERROR PARSING HTML BOOKMARKS'
      );
    }
  };

  const handleResetAllData = () => {
    setNotebooks([]);
    setCategories([{ id: '1', name: 'General', path: 'General' }]);
    setActiveCategoryId(null);
    setSearchQuery('');
    localStorage.removeItem('notebooks');
    localStorage.removeItem('categories');
    localStorage.removeItem('active_category_id');
    localStorage.removeItem('sidebar_expanded_ids');
    localStorage.removeItem('sidebar_scroll_top');
    localStorage.removeItem('sidebar_scroll_left');
    localStorage.removeItem('notebook_list_scroll_top');
    setIsResetConfirmOpen(false);
    setNotification(
      language === 'JP'
        ? 'すべてのブックマークとフォルダを初期化しました'
        : 'ALL BOOKMARKS AND FOLDERS HAVE BEEN RESET'
    );
  };

  const currentCategory = useMemo(() => {
    if (!activeCategoryId) return null;
    return categories.find(c => c.id === activeCategoryId);
  }, [categories, activeCategoryId]);

  const currentCategoryName = currentCategory ? (currentCategory.name || currentCategory.path) : null;

  // 検索対象プール（スコープと検索キーワードに応じて動的に判定）
  const activePool = useMemo(() => {
    // 1. スコープが 'all'（全体）の場合は常に全ブックマーク
    if (searchScope === 'all') {
      return notebooks;
    }

    // 2. スコープが 'current'（現在のフォルダ）の場合
    // 検索キーワードが入力されている場合は、配下のサブフォルダも含めて横断検索する
    const isSearching = searchQuery.trim().length > 0;

    if (activeCategoryId === '__UNASSIGNED__') {
      return notebooks.filter(nb => !nb.categoryId);
    }

    if (!activeCategoryId) {
      // 最上位（すべてのデータ）で検索時、またはサブフォルダ展開時
      if (isSearching || includeSubfolders) {
        return notebooks;
      } else {
        // 通常閲覧時: ルート直下または未分類のみ
        return notebooks.filter(nb => !nb.categoryId);
      }
    }

    // 特定のフォルダを選択中:
    // 検索中、または「全サブフォルダを展開」がONの場合は、配下のすべてのサブフォルダを含める！
    if (isSearching || includeSubfolders) {
      const targetIds = getCategoryDescendantIds(activeCategoryId);
      return notebooks.filter(nb => targetIds.has(nb.categoryId));
    } else {
      // 通常閲覧時（検索していない時）: そのフォルダ直下のアイテムのみ
      return notebooks.filter(nb => nb.categoryId === activeCategoryId);
    }
  }, [notebooks, activeCategoryId, searchScope, searchQuery, includeSubfolders, categories]);

  // フィルタリング計算（検索クエリ適用）
  const filteredNotebooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return activePool;
    }
    const q = searchQuery.toLowerCase().trim();
    return activePool.filter(nb => 
      (nb.title && nb.title.toLowerCase().includes(q)) || 
      (nb.url && nb.url.toLowerCase().includes(q))
    );
  }, [activePool, searchQuery]);

  const t = i18n[language];

  return (
    <div className={`min-h-screen bg-base-bg flex flex-col ${sidebarPosition === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} text-[10px] md:text-xs tracking-wider relative h-screen overflow-hidden`}>
      
      {/* 通知トースト */}
      {notification && (
        <div className="absolute top-4 right-4 z-50 bg-panel-bg border border-border-light text-text-bright px-4 py-2.5 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={14} className="text-accent-text shrink-0" />
          <span className="text-[11px] font-medium tracking-wide">{notification}</span>
          <button 
            type="button"
            onClick={() => setNotification(null)}
            className="text-text-dim hover:text-text-bright ml-2 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 全データ初期化 確認モーダル */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-panel-bg border border-red-500/50 max-w-md w-full p-5 shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-red-400 font-bold border-b border-border-main pb-2.5">
              <AlertTriangle size={18} className="shrink-0 text-red-500" />
              <span className="text-xs tracking-wider">{t.confirmClearAllTitle}</span>
            </div>

            <p className="text-[11px] text-text-normal leading-relaxed">
              {t.confirmClearAllMessage}
            </p>

            <div className="bg-base-bg/80 border border-border-main p-3 text-[10px] flex justify-around text-text-dim font-mono">
              <div>{t.totalDataPoints}: <strong className="text-red-400">{notebooks.length}</strong></div>
              <div>{t.dirCount}: <strong className="text-red-400">{categories.length}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 border border-border-main text-text-dim hover:text-text-bright hover:border-border-light transition-colors text-[10px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold border border-red-500 transition-colors text-[10px] cursor-pointer shadow-sm"
              >
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar 
        categories={categories} 
        notebooks={notebooks}
        onAddCategory={addCategory} 
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        activeCategory={activeCategoryId}
        onSelectCategory={(id) => {
          setActiveCategoryId(id);
          setMainView('bookmarks');
        }}
        onDropNotebooksToCategory={moveNotebooksToCategory}
        language={language}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onImportHtml={handleImportHtml}
        onResetAllData={() => setIsResetConfirmOpen(true)}
        listFontSize={listFontSize}
        onOpenBookmarklet={() => setIsBookmarkletModalOpen(true)}
        sidebarPosition={sidebarPosition}
        onOpenFolderManager={() => setMainView(prev => prev === 'folders' ? 'bookmarks' : 'folders')}
        isFolderManagerActive={mainView === 'folders'}
        colorPresets={colorPresets}
        onUpdateColorPresets={handleUpdateColorPresets}
        showColors={showColors}
        onToggleShowColors={toggleShowColors}
        showListColors={showListColors}
        onToggleShowListColors={toggleShowListColors}
        onResetAllColors={handleResetAllColors}
      />

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-4 max-h-screen overflow-hidden">
        <Header 
          theme={theme} 
          onThemeChange={setTheme} 
          font={font}
          onFontChange={setFont}
          language={language} 
          onLanguageChange={setLanguage} 
          listFontSize={listFontSize}
          onListFontSizeChange={setListFontSize}
          linkFontSize={linkFontSize}
          onLinkFontSizeChange={setLinkFontSize}
          onOpenBookmarklet={() => setIsBookmarkletModalOpen(true)}
          sidebarPosition={sidebarPosition}
          onToggleSidebarPosition={toggleSidebarPosition}
        />

        {/* メイン画面 ビュー切り替えタブ（03 ブックマーク一覧 / 04 フォルダー管理） */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex border border-border-main bg-panel-bg shadow-xs">
            <button
              type="button"
              onClick={() => setMainView('bookmarks')}
              className={`px-3.5 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                mainView === 'bookmarks'
                  ? 'bg-border-light text-white border-r border-border-light shadow-inner'
                  : 'text-text-dim hover:text-text-bright border-r border-border-main hover:bg-border-main/30'
              }`}
            >
              <Bookmark size={11} className={mainView === 'bookmarks' ? 'text-accent-text' : ''} />
              <span>03 {t.bookmarksView}</span>
              <span className="text-[9px] font-normal opacity-70">[{notebooks.length}]</span>
            </button>
            <button
              type="button"
              onClick={() => setMainView('folders')}
              className={`px-3.5 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                mainView === 'folders'
                  ? 'bg-border-light text-white shadow-inner'
                  : 'text-text-dim hover:text-text-bright hover:bg-border-main/30'
              }`}
            >
              <FolderTree size={11} className={mainView === 'folders' ? 'text-accent-text' : ''} />
              <span>04 {t.folderManager}</span>
              <span className="text-[9px] font-normal opacity-70">[{categories.length}]</span>
            </button>
          </div>
        </div>

        {mainView === 'folders' ? (
          <FolderManager
            categories={categories}
            notebooks={notebooks}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onChangeParentCategory={changeParentCategory}
            onMoveCategoryOrder={moveCategoryOrder}
            onReorderCategorySiblings={reorderCategorySiblings}
            onSortCategorySiblings={sortCategorySiblings}
            onSelectCategory={(id) => {
              setActiveCategoryId(id);
              setMainView('bookmarks');
            }}
            onClose={() => setMainView('bookmarks')}
            language={language}
          />
        ) : (
          <>
            {/* 02 検索＆フィルターモジュール */}
            <SearchModule
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchScope={searchScope}
              onScopeChange={setSearchScope}
              totalFilteredCount={filteredNotebooks.length}
              totalPoolCount={activePool.length}
              activeCategoryName={currentCategoryName}
              language={language}
            />

            {/* 03 データバンク（ブックマーク一覧・インライン追加・編集・削除） */}
            <NotebookList 
              notebooks={filteredNotebooks} 
              allNotebooks={notebooks}
              categories={categories} 
              activeCategoryId={activeCategoryId}
              includeSubfolders={includeSubfolders}
              onToggleIncludeSubfolders={setIncludeSubfolders}
              onSelectCategory={setActiveCategoryId}
              onDelete={deleteNotebooks} 
              onDeleteCategory={deleteCategory}
              onUpdate={updateNotebook}
              onMoveNotebooks={moveNotebooksToCategory}
              onReorder={reorderNotebooks}
              onMoveOrder={moveNotebooksOrder}
              onAdd={addNotebooks}
              onAddCategory={addCategory}
              searchQuery={searchQuery}
              language={language} 
              listFontSize={listFontSize}
              linkFontSize={linkFontSize}
              linkOpenMode={linkOpenMode}
              onLinkOpenModeChange={setLinkOpenMode}
              windowSizePreset={windowSizePreset}
              onWindowSizePresetChange={setWindowSizePreset}
              customDimensions={customDimensions}
              onCustomDimensionsChange={setCustomDimensions}
              colorPresets={colorPresets}
              showColors={showColors}
              showListColors={showListColors}
              onToggleShowListColors={toggleShowListColors}
              onResetAllColors={handleResetAllColors}
              onCreateShortcut={handleCreateShortcut}
              onBulkCreateShortcuts={handleBulkCreateShortcuts}
            />
          </>
        )}
        
        {/* PWA オフライン状態インジケーター */}
        <OfflineIndicator language={language} />
      </main>

      {/* PC用 1クリック保存用ブックマークレット案内モーダル */}
      <BookmarkletModal
        isOpen={isBookmarkletModalOpen}
        onClose={() => setIsBookmarkletModalOpen(false)}
        language={language}
        categories={categories}
      />

      {/* 1クリック保存受け取り＆保存先フォルダ選択モーダル */}
      <IncomingBookmarkModal
        isOpen={incomingBookmark !== null}
        initialTitle={incomingBookmark?.title || ''}
        initialUrl={incomingBookmark?.url || ''}
        initialCategoryId={incomingBookmark?.categoryId || ''}
        categories={categories}
        language={language}
        onSave={handleSaveIncomingBookmark}
        onAddCategory={addCategory}
        onCancel={() => setIncomingBookmark(null)}
      />
    </div>
  );
}
