import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import SearchModule, { SearchScope } from './components/SearchModule';
import NotebookList from './components/NotebookList';
import Header from './components/Header';
import { Category, Notebook } from './types';
import { Language } from './i18n';
import { parseNetscapeBookmarks } from './utils/bookmarkParser';
import { CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { i18n } from './i18n';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BookmarkletModal } from './components/BookmarkletModal';
import { LinkOpenMode, WindowSizePreset, CustomWindowDimensions } from './utils/windowOpener';

export type Theme = 'black' | 'red' | 'dark' | 'light';
export type FontFamily = 'meiryo' | 'noto' | 'mono' | 'yugothic' | 'biz';

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'black' || saved === 'red' || saved === 'dark' || saved === 'light') {
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // モバイルブラウザ・PWAバー用メタテーマカラー（theme-color）の動的リアルタイム同期
    const themeColors: Record<Theme, string> = {
      black: '#0c0d0e',
      dark: '#090f19',
      red: '#0d0606',
      light: '#e2e8f0'
    };
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColors[theme] || '#0c0d0e');
    }
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

  // ブックマークレット・Web Share Target等からのURLパラメータ自動検知・即時追加
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

        // 保存先カテゴリーの決定（指定があれば優先、無ければアクティブカテゴリ、無ければ未割り当て）
        let targetCategoryId = '';
        if (paramCatId) {
          targetCategoryId = paramCatId === '__UNASSIGNED__' ? '' : paramCatId;
        } else if (activeCategoryId && activeCategoryId !== '__UNASSIGNED__') {
          targetCategoryId = activeCategoryId;
        }

        const newBookmark: Notebook = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          title: decodedTitle,
          url: decodedUrl,
          categoryId: targetCategoryId,
          createdAt: new Date().toISOString()
        };

        setNotebooks(prev => [newBookmark, ...prev]);

        const successMsg = language === 'JP'
          ? `【自動保存】「${decodedTitle}」を正常にストックしました！`
          : `[Saved] Added "${decodedTitle}"!`;
        setNotification(successMsg);

        // クエリパラメータをURLから削除して重複追加を防止
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Failed to parse URL params', e);
    }
  }, []);

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
    setCategories([...categories, newCategory]);
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

  const addNotebooks = (items: {title: string, url: string, categoryId: string}[]) => {
    const newNotebooks = items.map((item, index) => ({
      id: Date.now().toString(36) + '_' + index,
      ...item,
      createdAt: Date.now()
    }));
    setNotebooks([...newNotebooks, ...notebooks]);
  };
  
  const deleteNotebooks = (ids: string[]) => {
    setNotebooks(notebooks.filter(nb => !ids.includes(nb.id)));
  };

  const updateNotebook = (id: string, updates: Partial<Notebook>) => {
    setNotebooks(notebooks.map(nb => nb.id === id ? { ...nb, ...updates } : nb));
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
      if (data.categories && data.notebooks) {
        setCategories(data.categories);
        setNotebooks(data.notebooks);
        setNotification(
          language === 'JP' 
            ? `JSONインポート完了: フォルダ ${data.categories.length} 件 / ブックマーク ${data.notebooks.length} 件`
            : `JSON IMPORTED: ${data.categories.length} FOLDERS / ${data.notebooks.length} BOOKMARKS`
        );
      }
    } catch {
      console.error("Failed to parse JSON");
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

      setCategories(prev => [...prev, ...importedCats]);
      setNotebooks(prev => [...importedNbs, ...prev]);

      setNotification(
        language === 'JP'
          ? `インポート完了: フォルダ ${stats.totalFolders} 件 / ブックマーク ${stats.totalBookmarks} 件を取り込みました`
          : `IMPORTED: ${stats.totalFolders} FOLDERS / ${stats.totalBookmarks} BOOKMARKS`
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
        onSelectCategory={setActiveCategoryId}
        onDropNotebooksToCategory={moveNotebooksToCategory}
        language={language}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onImportHtml={handleImportHtml}
        onResetAllData={() => setIsResetConfirmOpen(true)}
        listFontSize={listFontSize}
        onOpenBookmarklet={() => setIsBookmarkletModalOpen(true)}
        sidebarPosition={sidebarPosition}
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
          onAdd={addNotebooks}
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
        />
        
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
    </div>
  );
}
