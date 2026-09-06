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
  
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // 検索ステート（キーワードおよびスコープ）
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('current');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', font);
    localStorage.setItem('font', font);
  }, [font]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

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
    <div className="min-h-screen bg-base-bg flex flex-col md:flex-row text-[10px] md:text-xs tracking-wider relative h-screen overflow-hidden">
      
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
        language={language}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onImportHtml={handleImportHtml}
        onResetAllData={() => setIsResetConfirmOpen(true)}
      />

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-4 max-h-screen overflow-hidden">
        <Header 
          theme={theme} 
          onThemeChange={setTheme} 
          font={font}
          onFontChange={setFont}
          language={language} 
          onLanguageChange={setLanguage} 
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
          onReorder={reorderNotebooks}
          onAdd={addNotebooks}
          searchQuery={searchQuery}
          language={language} 
        />
      </main>
    </div>
  );
}
