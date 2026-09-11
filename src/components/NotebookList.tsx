import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Database, FileText, Trash2, CheckSquare, Square, Pencil, FolderOpen, Folder, ChevronRight, CornerDownRight, Layers, Plus, GripVertical, AppWindow, ExternalLink, ChevronDown, SlidersHorizontal, Maximize2, Save, Check, LayoutGrid, List, Copy, Globe, RotateCcw } from 'lucide-react';
import { Notebook, Category } from '../types';
import { Language, i18n } from '../i18n';
import AddNotebookForm from './AddNotebookForm';
import { openLink, LinkOpenMode, WindowSizePreset, CustomWindowDimensions } from '../utils/windowOpener';

export type ViewMode = 'list' | 'grid';

export interface ColumnWidths {
  source: number;
  timestamp: number;
  directory: number;
}

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  source: 140,
  timestamp: 100,
  directory: 130,
};

const MIN_COLUMN_WIDTHS: Record<keyof ColumnWidths, number> = {
  source: 80,
  timestamp: 70,
  directory: 80,
};

interface Props {
  notebooks: Notebook[];
  allNotebooks: Notebook[];
  categories: Category[];
  activeCategoryId: string | null;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onSelectCategory: (id: string | null) => void;
  onDelete: (ids: string[]) => void;
  onDeleteCategory?: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Notebook>) => void;
  onReorder?: (sourceId: string, targetId: string) => void;
  onAdd: (items: {title: string, url: string, categoryId: string}[]) => void;
  searchQuery: string;
  language: Language;
  listFontSize?: number;
  linkFontSize?: number;
  linkOpenMode?: LinkOpenMode;
  onLinkOpenModeChange?: (mode: LinkOpenMode) => void;
  windowSizePreset?: WindowSizePreset;
  onWindowSizePresetChange?: (preset: WindowSizePreset) => void;
  customDimensions?: CustomWindowDimensions;
  onCustomDimensionsChange?: (dims: CustomWindowDimensions) => void;
}

export default function NotebookList({ 
  notebooks, 
  allNotebooks,
  categories, 
  activeCategoryId,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onSelectCategory,
  onDelete, 
  onDeleteCategory,
  onUpdate, 
  onReorder,
  onAdd,
  searchQuery,
  language,
  listFontSize = 11,
  linkFontSize = 13,
  linkOpenMode = 'window',
  onLinkOpenModeChange,
  windowSizePreset = 'standard',
  onWindowSizePresetChange,
  customDimensions = { width: 1560, height: 980 },
  onCustomDimensionsChange
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [customWInput, setCustomWInput] = useState(() => String(customDimensions.width));
  const [customHInput, setCustomHInput] = useState(() => String(customDimensions.height));
  const [isSaveNoticeVisible, setIsSaveNoticeVisible] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ビューモード（リスト表示 / カード表示）
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('bookmark_view_mode');
    return (saved === 'grid' || saved === 'list') ? saved : 'list';
  });

  useEffect(() => {
    localStorage.setItem('bookmark_view_mode', viewMode);
  }, [viewMode]);

  // リスト表示のカラム幅ステート（ローカルストレージ永続化）
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const saved = localStorage.getItem('solid_col_widths');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          source: typeof parsed.source === 'number' ? Math.max(MIN_COLUMN_WIDTHS.source, parsed.source) : DEFAULT_COLUMN_WIDTHS.source,
          timestamp: typeof parsed.timestamp === 'number' ? Math.max(MIN_COLUMN_WIDTHS.timestamp, parsed.timestamp) : DEFAULT_COLUMN_WIDTHS.timestamp,
          directory: typeof parsed.directory === 'number' ? Math.max(MIN_COLUMN_WIDTHS.directory, parsed.directory) : DEFAULT_COLUMN_WIDTHS.directory,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const [activeResizingCol, setActiveResizingCol] = useState<string | null>(null);
  const resizingRef = useRef<{
    targetKey: keyof ColumnWidths;
    startX: number;
    startWidth: number;
    isInverse: boolean;
  } | null>(null);

  const startResizing = useCallback((colKey: 'title' | 'source' | 'timestamp' | 'directory', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetKey: keyof ColumnWidths = colKey === 'title' ? 'source' : colKey;
    const isInverse = colKey === 'title';

    resizingRef.current = {
      targetKey,
      startX: e.clientX,
      startWidth: columnWidths[targetKey],
      isInverse,
    };
    setActiveResizingCol(colKey);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      // タイトルの右仕切り線を右に引っ張ると、ソース幅を縮めてタイトルを広げる
      const adjustedDelta = resizingRef.current.isInverse ? -delta : delta;
      const newWidth = Math.max(
        MIN_COLUMN_WIDTHS[resizingRef.current.targetKey],
        Math.min(320, resizingRef.current.startWidth + adjustedDelta)
      );
      setColumnWidths(prev => {
        const updated = { ...prev, [resizingRef.current!.targetKey]: newWidth };
        try {
          localStorage.setItem('solid_col_widths', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      setActiveResizingCol(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  const handleResetWidths = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem('solid_col_widths');
    } catch {
      // ignore
    }
  };

  const handleCopyUrl = (e: React.MouseEvent, id: string, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      });
    }
  };

  // customDimensionsが変更されたときにインプット数値を同期
  useEffect(() => {
    setCustomWInput(String(customDimensions.width));
    setCustomHInput(String(customDimensions.height));
  }, [customDimensions.width, customDimensions.height]);

  const handleSaveCustom = (overrideW?: number, overrideH?: number) => {
    const rawW = overrideW ?? parseInt(customWInput, 10);
    const rawH = overrideH ?? parseInt(customHInput, 10);
    const finalW = Math.max(400, Math.min(3840, isNaN(rawW) ? customDimensions.width : rawW));
    const finalH = Math.max(300, Math.min(2160, isNaN(rawH) ? customDimensions.height : rawH));
    
    onCustomDimensionsChange?.({ width: finalW, height: finalH });
    onWindowSizePresetChange?.('custom');
    setIsSaveNoticeVisible(true);
    setTimeout(() => setIsSaveNoticeVisible(false), 2000);
  };

  // 初回スクロール位置に応じた初期件数の計算（スクロール位置復元用）
  const [visibleCount, setVisibleCount] = useState(() => {
    const saved = localStorage.getItem('notebook_list_scroll_top');
    const top = saved ? parseInt(saved, 10) : 0;
    return top > 0 ? Math.max(80, Math.ceil((top + 1500) / 40)) : 80;
  });

  // ドラッグ＆ドロップ用ステート
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  
  const listContainerRef = useRef<HTMLDivElement>(null);
  const prevCategoryRef = useRef(activeCategoryId);
  const prevSearchRef = useRef(searchQuery);

  const t = i18n[language];

  // 初回マウント時に保存されたスクロール位置を復元
  useEffect(() => {
    const savedScroll = localStorage.getItem('notebook_list_scroll_top');
    if (savedScroll && listContainerRef.current) {
      const parsedScroll = parseInt(savedScroll, 10);
      if (!isNaN(parsedScroll) && parsedScroll > 0) {
        requestAnimationFrame(() => {
          if (listContainerRef.current) {
            listContainerRef.current.scrollTop = parsedScroll;
          }
        });
      }
    }
  }, []);

  // ユーザーが能動的にフォルダや検索条件を変更した時のみスクロールと件数をリセット
  useEffect(() => {
    if (prevCategoryRef.current !== activeCategoryId || prevSearchRef.current !== searchQuery) {
      prevCategoryRef.current = activeCategoryId;
      prevSearchRef.current = searchQuery;
      setVisibleCount(80);
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      localStorage.setItem('notebook_list_scroll_top', '0');
    }
  }, [activeCategoryId, searchQuery]);

  // カテゴリマップ
  const catMap = useMemo(() => new Map<string, Category>(categories.map(c => [c.id, c])), [categories]);

  // 各カテゴリ配下のアイテム総数を計算（直接＋全サブフォルダ内）
  const folderTotalCounts = useMemo(() => {
    const directCounts = new Map<string, number>();
    for (const nb of allNotebooks) {
      if (nb.categoryId) {
        directCounts.set(nb.categoryId, (directCounts.get(nb.categoryId) || 0) + 1);
      }
    }

    const childrenMap = new Map<string, string[]>();
    for (const c of categories) {
      if (c.parentId) {
        const arr = childrenMap.get(c.parentId) || [];
        arr.push(c.id);
        childrenMap.set(c.parentId, arr);
      }
    }

    const memo = new Map<string, number>();
    function countTotal(catId: string): number {
      if (memo.has(catId)) return memo.get(catId)!;
      let sum = directCounts.get(catId) || 0;
      const childIds = childrenMap.get(catId) || [];
      for (const cid of childIds) {
        sum += countTotal(cid);
      }
      memo.set(catId, sum);
      return sum;
    }

    for (const c of categories) {
      countTotal(c.id);
    }
    return memo;
  }, [categories, allNotebooks]);

  // 現在選択されているフォルダの直下にあるサブフォルダ一覧
  // カオルさまのご要望：中身が空（直接のアイテムもサブフォルダ内のアイテムも0件）のフォルダはカード表示しない
  const currentSubCategories = useMemo(() => {
    let list: Category[];
    if (activeCategoryId === '__UNASSIGNED__') return [];
    if (!activeCategoryId) {
      list = categories.filter(c => !c.parentId);
    } else {
      list = categories.filter(c => c.parentId === activeCategoryId);
    }
    // アイテム総数が0件のフォルダ（区切り線目的などの空フォルダ）は除外
    return list.filter(sub => {
      const count = folderTotalCounts.get(sub.id) || 0;
      return count > 0;
    });
  }, [categories, activeCategoryId, folderTotalCounts]);

  const getCategoryName = (id: string) => {
    if (!id) return t.unassigned;
    const c = catMap.get(id);
    return c ? (c.path || c.name) : t.unassigned;
  };

  const getCategoryShortName = (id: string) => {
    if (!id) return t.unassigned;
    const c = catMap.get(id);
    return c ? c.name : t.unassigned;
  };

  // パンくずリスト用の階層配列を取得
  const breadcrumbs = useMemo((): Category[] => {
    if (!activeCategoryId || activeCategoryId === '__UNASSIGNED__') return [];
    const crumbs: Category[] = [];
    let curr: Category | undefined = catMap.get(activeCategoryId);
    while (curr) {
      crumbs.unshift(curr);
      curr = curr.parentId ? catMap.get(curr.parentId) : undefined;
    }
    return crumbs;
  }, [activeCategoryId, catMap]);

  const filteredNotebooks = useMemo(() => {
    if (!searchQuery.trim()) return notebooks;
    const q = searchQuery.toLowerCase().trim();
    return notebooks.filter(nb => 
      nb.title.toLowerCase().includes(q) || 
      nb.url.toLowerCase().includes(q)
    );
  }, [notebooks, searchQuery]);

  // 高速なインクリメンタル描画スライス
  const displayedNotebooks = useMemo(() => {
    return filteredNotebooks.slice(0, visibleCount);
  }, [filteredNotebooks, visibleCount]);

  const getHostname = (url: string): string => {
    try {
      const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/:]+)/i);
      return match ? match[1] : 'external';
    } catch {
      return 'external';
    }
  };

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  };

  const handleOpenLink = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    // Ctrl / Cmd / Shift クリックはブラウザ本来のタブ動作を尊重
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    openLink(url, {
      mode: linkOpenMode,
      preset: windowSizePreset,
      customDimensions
    });
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    setSelectedIds(newIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotebooks.length && filteredNotebooks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotebooks.map(nb => nb.id)));
    }
  };

  // 2段階削除用の確認ステートとタイマー（誤操作防止）
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmRowDeleteId, setConfirmRowDeleteId] = useState<string | null>(null);
  const [confirmFolderDeleteId, setConfirmFolderDeleteId] = useState<string | null>(null);
  const bulkDeleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rowDeleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const folderDeleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (bulkDeleteTimerRef.current) clearTimeout(bulkDeleteTimerRef.current);
      if (rowDeleteTimerRef.current) clearTimeout(rowDeleteTimerRef.current);
      if (folderDeleteTimerRef.current) clearTimeout(folderDeleteTimerRef.current);
    };
  }, []);

  const handleFolderDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDeleteCategory) return;
    if (confirmFolderDeleteId !== id) {
      setConfirmFolderDeleteId(id);
      if (folderDeleteTimerRef.current) clearTimeout(folderDeleteTimerRef.current);
      folderDeleteTimerRef.current = setTimeout(() => {
        setConfirmFolderDeleteId(null);
      }, 4000);
    } else {
      if (folderDeleteTimerRef.current) clearTimeout(folderDeleteTimerRef.current);
      setConfirmFolderDeleteId(null);
      onDeleteCategory(id);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      if (bulkDeleteTimerRef.current) clearTimeout(bulkDeleteTimerRef.current);
      bulkDeleteTimerRef.current = setTimeout(() => {
        setConfirmBulkDelete(false);
      }, 4000);
    } else {
      if (bulkDeleteTimerRef.current) clearTimeout(bulkDeleteTimerRef.current);
      setConfirmBulkDelete(false);
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleRowDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmRowDeleteId !== id) {
      setConfirmRowDeleteId(id);
      if (rowDeleteTimerRef.current) clearTimeout(rowDeleteTimerRef.current);
      rowDeleteTimerRef.current = setTimeout(() => {
        setConfirmRowDeleteId(null);
      }, 4000);
    } else {
      if (rowDeleteTimerRef.current) clearTimeout(rowDeleteTimerRef.current);
      setConfirmRowDeleteId(null);
      onDelete([id]);
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    }
  };

  const startEdit = (e: React.MouseEvent, nb: Notebook) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(nb.id);
    setEditTitle(nb.title);
    setEditUrl(nb.url);
    setEditCategoryId(nb.categoryId || '');
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      let formattedUrl = editUrl.trim();
      if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      onUpdate(id, {
        title: editTitle.trim(),
        url: formattedUrl || undefined,
        categoryId: editCategoryId
      });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // ドラッグ＆ドロップハンドラー
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingId && draggingId !== id) {
      setDragOverId(id);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingId || e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId && onReorder) {
      onReorder(sourceId, targetId);
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="border border-border-main bg-panel-bg p-4 pt-6 relative w-full flex-1 flex flex-col min-h-0 mt-3 shadow-sm">
      <div className="absolute -top-3 left-4 bg-base-bg px-2.5 py-0.5 text-[10px] text-text-bright font-bold tracking-widest flex items-center gap-1.5 z-30 border border-border-main shadow-sm font-mono">
        <Layers size={12} className="text-text-bright" />
        <span>{t.dataBanks}</span>
      </div>

      {/* パンくずリスト & サブフォルダ展開トグル */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2 bg-base-bg border border-border-main text-[10px] shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-[200px]">
          <FolderOpen size={13} className="shrink-0 text-text-bright" />
          <span className="shrink-0 font-bold text-text-dim">{t.currentLocation}</span>
          
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`hover:text-text-bright transition-colors font-medium shrink-0 ${!activeCategoryId ? 'text-text-bright font-bold' : 'text-text-dim'}`}
          >
            [ {t.allData} ]
          </button>

          {activeCategoryId === '__UNASSIGNED__' && (
            <>
              <ChevronRight size={11} className="shrink-0 text-text-dim" />
              <span className="text-text-bright font-bold italic">{t.unassigned}</span>
            </>
          )}

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <ChevronRight size={11} className="shrink-0 text-text-dim" />
                {isLast ? (
                  <span className="text-text-bright font-bold truncate max-w-[240px]" title={crumb.path || crumb.name}>
                    {crumb.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectCategory(crumb.id)}
                    className="text-text-dim hover:text-text-bright transition-colors truncate max-w-[140px]"
                    title={crumb.path || crumb.name}
                  >
                    {crumb.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 現在のフォルダの削除ボタン（2段階確認） */}
        {activeCategoryId && activeCategoryId !== '__UNASSIGNED__' && onDeleteCategory && (
          <button
            type="button"
            onClick={(e) => handleFolderDeleteClick(e, activeCategoryId)}
            className={`flex items-center gap-1 text-[9.5px] px-2 py-1 border transition-all cursor-pointer shrink-0 ${
              confirmFolderDeleteId === activeCategoryId
                ? 'bg-red-900/60 text-red-200 border-red-500 font-bold animate-pulse'
                : 'border-border-main/60 text-text-dim hover:text-[#ff7b72] hover:border-red-500/30 bg-panel-bg'
            }`}
            title={confirmFolderDeleteId === activeCategoryId ? (language === 'JP' ? '再クリックでこのフォルダを削除' : 'Click again to confirm delete') : (language === 'JP' ? 'フォルダ削除' : 'DELETE FOLDER')}
          >
            <Trash2 size={11} className={confirmFolderDeleteId === activeCategoryId ? 'animate-bounce' : ''} />
            <span>{confirmFolderDeleteId === activeCategoryId ? (language === 'JP' ? '削除確定？' : 'CONFIRM?') : (language === 'JP' ? 'フォルダ削除' : 'DELETE FOLDER')}</span>
          </button>
        )}

        {/* 全サブフォルダのブックマークを展開するトグル */}
        {activeCategoryId !== '__UNASSIGNED__' && (
          <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-text-dim hover:text-text-bright text-[9.5px] font-medium tracking-wide bg-panel-bg px-2 py-1 border border-border-main/60">
            <input
              type="checkbox"
              checked={includeSubfolders}
              onChange={e => onToggleIncludeSubfolders(e.target.checked)}
              className="cursor-pointer accent-border-light"
            />
            <span>{t.includeSubfolders}</span>
          </label>
        )}
      </div>

      {/* スクロール可能メインエリア */}
      <div 
        ref={listContainerRef}
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          localStorage.setItem('notebook_list_scroll_top', String(scrollTop));
          if (scrollHeight - scrollTop - clientHeight < 250) {
            if (visibleCount < filteredNotebooks.length) {
              setVisibleCount(prev => Math.min(prev + 100, filteredNotebooks.length));
            }
          }
        }}
        className="flex-1 flex flex-col overflow-y-auto pr-1 min-h-0 gap-4"
      >

        {/* 1. 直下のサブフォルダ一覧セクション */}
        {currentSubCategories.length > 0 && !searchQuery && (
          <div className="border border-border-main bg-base-bg/60 p-3 relative flex flex-col shrink-0">
            <div className="text-[10px] font-bold text-text-bright mb-2.5 flex items-center justify-between tracking-wider">
              <span className="flex items-center gap-1.5">
                <Folder size={12} className="text-text-bright" />
                {t.subFolders} ({currentSubCategories.length})
              </span>
              <span className="text-[9px] text-text-dim/70 font-normal">
                {t.clickToOpen}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {currentSubCategories.map(sub => {
                const count = folderTotalCounts.get(sub.id) || 0;
                return (
                  <div
                    key={sub.id}
                    onClick={() => onSelectCategory(sub.id)}
                    className="flex items-center justify-between p-2.5 bg-panel-bg border border-border-main hover:border-border-light hover:bg-border-main/30 text-left transition-all group cursor-pointer"
                    title={`${sub.name}\nパス: ${sub.path || sub.name}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <Folder size={14} className="text-text-normal group-hover:text-text-bright shrink-0 transition-colors" />
                      <span 
                        className="font-bold text-text-bright truncate"
                        style={{ fontSize: `${listFontSize}px` }}
                      >
                        {sub.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono text-text-bright font-bold px-1.5 py-0.5 bg-base-bg border border-border-main/60">
                        {count}
                      </span>
                      {onDeleteCategory && (
                        <button
                          type="button"
                          onClick={(e) => handleFolderDeleteClick(e, sub.id)}
                          className={`p-1 transition-all border cursor-pointer ${
                            confirmFolderDeleteId === sub.id
                              ? 'bg-red-900/60 text-red-200 border-red-500 font-bold px-1.5 animate-pulse'
                              : 'opacity-0 group-hover:opacity-100 border-transparent text-text-dim/60 hover:text-[#ff7b72] hover:border-red-500/30 hover:bg-red-950/20'
                          }`}
                          title={confirmFolderDeleteId === sub.id ? (language === 'JP' ? '再クリックでフォルダ削除' : 'Click again to confirm delete') : t.delete}
                        >
                          {confirmFolderDeleteId === sub.id ? (
                            <span className="flex items-center gap-1 text-[9px] text-red-200 font-mono">
                              <Trash2 size={11} className="shrink-0 animate-bounce" />
                              {language === 'JP' ? '削除確認' : 'CONFIRM'}
                            </span>
                          ) : (
                            <Trash2 size={12} className="shrink-0" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. ブックマーク一覧セクション */}
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* リスト制御ヘッダー */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-dim border-b border-border-main pb-2 mb-2 px-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-normal flex items-center gap-1">
                <FileText size={11} className="text-text-bright" />
                {t.directBookmarks}
              </span>
              <span>&nbsp;|&nbsp; {t.sortDate} &nbsp; {t.totalRecs} <strong className="text-text-bright font-mono">{filteredNotebooks.length}</strong></span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* 開き方モード（独立ウィンドウ / 新規タブ） */}
              <div className="flex items-center gap-1.5 border border-border-main bg-base-bg px-2 py-0.5 select-none" title={language === 'JP' ? 'リンククリック時の開き方を選択' : 'Select link open mode'}>
                <span className="text-text-dim flex items-center gap-1 font-mono text-[9px] font-bold">
                  <AppWindow size={11} className="text-text-dim" />
                  <span>{t.openMode}</span>
                </span>
                <div className="flex border border-border-main rounded-xs overflow-hidden leading-none text-[9px] font-bold font-mono">
                  <button
                    type="button"
                    onClick={() => onLinkOpenModeChange?.('window')}
                    className={`px-2 py-1 transition-colors cursor-pointer ${
                      linkOpenMode === 'window' 
                        ? 'bg-border-light text-white font-bold' 
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                    title={language === 'JP' ? '独立した新しい別ウィンドウで開く（おすすめ）' : 'Open in a standalone new window'}
                  >
                    {t.openWindow}
                  </button>
                  <button
                    type="button"
                    onClick={() => onLinkOpenModeChange?.('tab')}
                    className={`px-2 py-1 transition-colors cursor-pointer ${
                      linkOpenMode === 'tab' 
                        ? 'bg-border-light text-white font-bold' 
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                    title={language === 'JP' ? 'ブラウザの新しいタブで開く' : 'Open in a new browser tab'}
                  >
                    {t.openTab}
                  </button>
                </div>
              </div>

              {/* 独立ウィンドウサイズ選択（ウィンドウモード時のみ） */}
              {linkOpenMode === 'window' && (
                <div className="flex flex-wrap items-center gap-1.5 border border-border-main bg-base-bg px-2 py-0.5 select-none" title={language === 'JP' ? '独立ウィンドウの表示サイズを選択・カスタマイズ' : 'Select or customize window size'}>
                  <span className="text-text-dim flex items-center gap-1 font-mono text-[9px] font-bold">
                    <span>{t.windowSize}</span>
                  </span>
                  <div className="relative">
                    <select
                      value={windowSizePreset}
                      onChange={(e) => {
                        const newPreset = e.target.value as WindowSizePreset;
                        onWindowSizePresetChange?.(newPreset);
                        if (newPreset === 'custom') {
                          setIsCustomExpanded(true);
                        }
                      }}
                      className="appearance-none bg-base-bg border border-border-main text-text-bright hover:border-border-light pl-2 pr-5 py-0.5 text-[9px] font-mono font-bold transition-colors cursor-pointer focus:outline-none"
                    >
                      <option value="standard">{t.sizeStandard}</option>
                      <option value="wide">{t.sizeWide}</option>
                      <option value="ultra">{t.sizeUltra}</option>
                      <option value="fhd">{t.sizeFhd}</option>
                      <option value="max">{t.sizeMax}</option>
                      <option value="compact">{t.sizeCompact}</option>
                      <option value="custom">
                        {language === 'JP' 
                          ? `登録カスタム (${customDimensions.width}×${customDimensions.height})` 
                          : `CUSTOM (${customDimensions.width}×${customDimensions.height})`}
                      </option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-text-dim">
                      <ChevronDown size={10} />
                    </div>
                  </div>

                  {/* カスタムサイズ設定トグルボタン */}
                  <button
                    type="button"
                    onClick={() => {
                      if (windowSizePreset !== 'custom') {
                        onWindowSizePresetChange?.('custom');
                      }
                      setIsCustomExpanded(prev => !prev);
                    }}
                    className={`p-1 border transition-colors cursor-pointer ${
                      windowSizePreset === 'custom' || isCustomExpanded
                        ? 'bg-border-light text-text-bright border-border-light'
                        : 'border-border-main text-text-dim hover:text-text-bright'
                    }`}
                    title={language === 'JP' ? 'ウィンドウサイズをピクセル単位で微調整・登録' : 'Customize & register window size'}
                  >
                    <SlidersHorizontal size={10} />
                  </button>

                  {/* カスタムサイズ入力＆登録欄（custom選択時、またはトグル展開時） */}
                  {(windowSizePreset === 'custom' || isCustomExpanded) && (
                    <div className="flex items-center gap-1.5 pl-1.5 border-l border-border-main">
                      <div className="flex items-center gap-1 font-mono text-[9px]">
                        <span className="text-text-dim">{t.customWidth}</span>
                        <input
                          type="number"
                          min={400}
                          max={3840}
                          step={20}
                          value={customWInput}
                          onChange={(e) => setCustomWInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustom(); }}
                          className="w-13 px-1 py-0.5 bg-input-bg border border-border-main text-text-bright text-[9px] font-mono font-bold text-center focus:outline-none focus:border-border-light"
                          title={language === 'JP' ? '横幅（ピクセル） - Enterで登録' : 'Width (px) - Press Enter to save'}
                        />
                      </div>
                      <span className="text-text-dim font-mono text-[9px]">×</span>
                      <div className="flex items-center gap-1 font-mono text-[9px]">
                        <span className="text-text-dim">{t.customHeight}</span>
                        <input
                          type="number"
                          min={300}
                          max={2160}
                          step={20}
                          value={customHInput}
                          onChange={(e) => setCustomHInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustom(); }}
                          className="w-13 px-1 py-0.5 bg-input-bg border border-border-main text-text-bright text-[9px] font-mono font-bold text-center focus:outline-none focus:border-border-light"
                          title={language === 'JP' ? '高さ（ピクセル） - Enterで登録' : 'Height (px) - Press Enter to save'}
                        />
                      </div>
                      <span className="text-text-dim font-mono text-[8px]">px</span>

                      {/* 登録・保存ボタン */}
                      <button
                        type="button"
                        onClick={() => handleSaveCustom()}
                        className={`flex items-center gap-1 px-1.5 py-0.5 border font-mono text-[9px] font-bold transition-all cursor-pointer ${
                          isSaveNoticeVisible
                            ? 'bg-emerald-900/80 border-emerald-500 text-emerald-200'
                            : 'bg-base-bg hover:bg-border-main border-border-main text-text-bright hover:border-border-light'
                        }`}
                        title={language === 'JP' ? 'このサイズを登録保存する' : 'Save this custom size'}
                      >
                        {isSaveNoticeVisible ? (
                          <>
                            <Check size={9} className="text-emerald-400" />
                            <span>{t.customSaved}</span>
                          </>
                        ) : (
                          <>
                            <Save size={9} className="text-text-dim" />
                            <span>{t.saveCustom}</span>
                          </>
                        )}
                      </button>

                      {/* 画面最大化（MAX）プリセット切り替えボタン（カスタム値は上書きされず保持されます） */}
                      <button
                        type="button"
                        onClick={() => {
                          onWindowSizePresetChange?.('max');
                        }}
                        className={`flex items-center gap-0.5 px-1 py-0.5 border font-mono text-[8px] font-bold transition-colors cursor-pointer ${
                          windowSizePreset === 'max'
                            ? 'bg-border-light text-text-bright border-border-light'
                            : 'bg-base-bg hover:bg-border-main text-text-dim hover:text-text-bright border-border-main'
                        }`}
                        title={language === 'JP' ? '画面最大サイズで開く（登録したカスタムサイズはそのまま保持されます）' : 'Open in full screen (keeps your saved custom size)'}
                      >
                        <Maximize2 size={9} />
                        <span>MAX</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ブックマーク追加ボタン */}
              <button 
                type="button"
                onClick={() => setIsAddFormOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 border transition-colors font-bold text-[10px] tracking-wide cursor-pointer ${
                  isAddFormOpen 
                    ? 'bg-border-light text-text-bright border-border-light' 
                    : 'bg-base-bg hover:bg-border-main text-text-normal hover:text-text-bright border-border-main'
                }`}
                title={isAddFormOpen ? t.closeForm : t.addBookmark}
              >
                <Plus size={12} className={isAddFormOpen ? "rotate-45 transition-transform" : "transition-transform"} />
                <span>{isAddFormOpen ? t.closeForm : t.addBookmark}</span>
              </button>

              {filteredNotebooks.length > 0 && (
                <div className="flex gap-4 items-center border-l border-border-main/50 pl-3">
                   <button 
                      onClick={toggleSelectAll}
                      className="hover:text-text-bright transition-colors flex items-center gap-1 cursor-pointer"
                   >
                      {selectedIds.size === filteredNotebooks.length && filteredNotebooks.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
                      {t.selectAll}
                   </button>
                   {selectedIds.size > 0 && (
                       <button 
                          type="button"
                          onClick={handleBulkDeleteClick}
                          className={`transition-all flex items-center gap-1.5 font-bold cursor-pointer px-2 py-0.5 border ${
                            confirmBulkDelete 
                              ? 'bg-red-900/40 text-red-300 border-red-500 animate-pulse' 
                              : 'text-[#ff7b72] hover:text-[#ff9b94] border-transparent hover:border-red-500/30 hover:bg-red-950/20'
                          }`}
                          title={confirmBulkDelete ? t.confirmDelete : t.deleteSelected}
                       >
                          <Trash2 size={12} className={confirmBulkDelete ? 'animate-bounce' : ''} />
                          <span>{confirmBulkDelete ? t.confirmDeleteSelected : `${t.deleteSelected} (${selectedIds.size})`}</span>
                       </button>
                   )}
                </div>
              )}

              {/* リスト表示コントロール (Reset Widths & 表示切替) */}
              <div className="flex items-center gap-2 ml-auto">
                {viewMode === 'list' && (
                  <button
                    type="button"
                    onClick={handleResetWidths}
                    className="flex items-center gap-1 px-2 py-1 border border-border-main bg-base-bg text-text-dim hover:text-text-bright hover:border-border-light transition-colors text-[9px] font-mono font-bold cursor-pointer"
                    title={language === 'JP' ? '列の幅を初期状態に戻す' : 'Reset column widths to default'}
                  >
                    <RotateCcw size={10} className="shrink-0" />
                    <span>{t.resetWidths}</span>
                  </button>
                )}

                {/* カード / リスト 切り替えトグル（内側にカード、外側にリスト） */}
                <div className="flex items-center border border-border-main bg-base-bg overflow-hidden leading-none text-[9px] font-mono font-bold">
                  {/* カード（内側） */}
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 px-2 py-1 transition-colors cursor-pointer border-r border-border-main/40 ${
                      viewMode === 'grid'
                        ? 'bg-border-light text-white font-bold'
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                    title={t.viewModeGrid}
                  >
                    <LayoutGrid size={11} />
                    <span className="hidden sm:inline">{t.viewModeGrid}</span>
                  </button>
                  {/* リスト（外側・右端） */}
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 px-2 py-1 transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-border-light text-white font-bold'
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                    title={t.viewModeList}
                  >
                    <List size={11} />
                    <span className="hidden sm:inline">{t.viewModeList}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* インライン ブックマーク追加フォーム */}
          {isAddFormOpen && (
            <AddNotebookForm
              categories={categories}
              activeCategoryId={activeCategoryId}
              onAdd={(items) => {
                onAdd(items);
                setIsAddFormOpen(false);
              }}
              onClose={() => setIsAddFormOpen(false)}
              language={language}
            />
          )}
          
          {/* ブックマークリスト */}
          {filteredNotebooks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-dim/60 text-[10px] gap-2">
              {currentSubCategories.length > 0 && !includeSubfolders ? (
                <div className="flex flex-col items-center gap-1.5 max-w-md text-center px-4 py-3 bg-base-bg border border-border-main/50">
                  <CornerDownRight size={14} className="text-text-bright mb-1" />
                  <span className="text-text-normal font-medium">{t.noDirectBookmarksInFolder}</span>
                </div>
              ) : (
                <span>{notebooks.length === 0 ? t.awaitingInit : 'NO MATCHING RESULTS'}</span>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col pb-4 w-full">
              <div className="w-full flex flex-col">
                {/* テーブル列ヘッダー */}
                <div className="w-full flex items-center text-[10px] font-bold text-text-dim border-b border-border-main pb-2 px-2 shrink-0 tracking-wider select-none gap-2 sm:gap-3">
                  <span className="w-5 shrink-0" title="並び替え用ドラッグハンドル"></span>
                  <span className="w-8 shrink-0"></span>

                  {/* ノードタイトル */}
                  <div className="flex-1 min-w-[140px] relative flex items-center pr-3">
                    <span className="truncate">{t.nodeTitle}</span>
                    {/* リサイズ仕切り線 */}
                    <div 
                      onMouseDown={(e) => startResizing('title', e)}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex justify-center items-center group/resizer z-20"
                      title={language === 'JP' ? 'ドラッグして列幅を変更' : 'Drag to resize column'}
                    >
                      <div className={`w-[1px] h-3.5 transition-colors ${
                        activeResizingCol === 'title' ? 'bg-text-bright w-[2px]' : 'bg-border-main group-hover/resizer:bg-text-bright group-hover/resizer:w-[2px]'
                      }`} />
                    </div>
                  </div>

                  {/* ソース */}
                  <div 
                    style={{ width: `${columnWidths.source}px` }} 
                    className="shrink-0 relative hidden md:flex items-center px-2 pr-3"
                  >
                    <span className="truncate">{t.source}</span>
                    <div 
                      onMouseDown={(e) => startResizing('source', e)}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex justify-center items-center group/resizer z-20"
                      title={language === 'JP' ? 'ドラッグして列幅を変更' : 'Drag to resize column'}
                    >
                      <div className={`w-[1px] h-3.5 transition-colors ${
                        activeResizingCol === 'source' ? 'bg-text-bright w-[2px]' : 'bg-border-main group-hover/resizer:bg-text-bright group-hover/resizer:w-[2px]'
                      }`} />
                    </div>
                  </div>

                  {/* タイムスタンプ */}
                  <div 
                    style={{ width: `${columnWidths.timestamp}px` }} 
                    className="shrink-0 relative hidden sm:flex items-center justify-end px-2 pr-3"
                  >
                    <span className="truncate">{t.timestamp}</span>
                    <div 
                      onMouseDown={(e) => startResizing('timestamp', e)}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex justify-center items-center group/resizer z-20"
                      title={language === 'JP' ? 'ドラッグして列幅を変更' : 'Drag to resize column'}
                    >
                      <div className={`w-[1px] h-3.5 transition-colors ${
                        activeResizingCol === 'timestamp' ? 'bg-text-bright w-[2px]' : 'bg-border-main group-hover/resizer:bg-text-bright group-hover/resizer:w-[2px]'
                      }`} />
                    </div>
                  </div>

                  {/* ディレクトリ */}
                  <div 
                    style={{ width: `${columnWidths.directory}px` }} 
                    className="shrink-0 relative hidden lg:flex items-center justify-end px-2 pr-3"
                  >
                    <span className="truncate">{t.directory}</span>
                    <div 
                      onMouseDown={(e) => startResizing('directory', e)}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex justify-center items-center group/resizer z-20"
                      title={language === 'JP' ? 'ドラッグして列幅を変更' : 'Drag to resize column'}
                    >
                      <div className={`w-[1px] h-3.5 transition-colors ${
                        activeResizingCol === 'directory' ? 'bg-text-bright w-[2px]' : 'bg-border-main group-hover/resizer:bg-text-bright group-hover/resizer:w-[2px]'
                      }`} />
                    </div>
                  </div>

                  {/* 権限 / 操作（右端にピッタリ固定） */}
                  <div className="w-20 shrink-0 relative flex items-center justify-end pr-1">
                    <span className="truncate">{t.role}</span>
                  </div>
                </div>

                {displayedNotebooks.map((nb) => {
                const host = getHostname(nb.url);
                const isDragging = draggingId === nb.id;
                const isDragOver = dragOverId === nb.id;

                return (
                  <div
                    key={nb.id}
                    draggable={!editingId}
                    onDragStart={(e) => handleDragStart(e, nb.id)}
                    onDragOver={(e) => handleDragOver(e, nb.id)}
                    onDragLeave={(e) => handleDragLeave(e, nb.id)}
                    onDrop={(e) => handleDrop(e, nb.id)}
                    onDragEnd={handleDragEnd}
                    className={`w-full flex items-center py-2.5 px-2 border-b border-border-main/50 hover:bg-border-main/20 group transition-all gap-2 sm:gap-3 ${
                      selectedIds.has(nb.id) ? 'bg-border-main/15' : ''
                    } ${isDragging ? 'opacity-40 bg-border-main/30 border-dashed border-border-light' : ''} ${
                      isDragOver ? 'border-t-2 border-t-text-bright bg-border-main/25' : ''
                    }`}
                  >
                    {/* ドラッグハンドル */}
                    <div 
                      className="w-5 flex justify-center items-center shrink-0 cursor-grab active:cursor-grabbing text-text-dim/40 hover:text-text-bright group-hover:text-text-dim transition-colors"
                      title={language === 'JP' ? 'ドラッグして並び替え' : 'Drag to reorder'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={13} />
                    </div>

                    {/* 選択チェックボックス */}
                    <div 
                       className="w-8 flex justify-center shrink-0 cursor-pointer"
                       onClick={(e) => toggleSelect(nb.id, e)}
                    >
                       {selectedIds.has(nb.id) ? 
                          <CheckSquare size={14} className="text-text-bright" /> : 
                          <Square size={14} className="text-text-dim group-hover:text-text-normal" />
                       }
                    </div>

                    {editingId === nb.id ? (
                      <div 
                        className="flex-1 min-w-0 bg-base-bg border border-border-light p-2.5 my-1 flex flex-col gap-2 rounded-xs shadow-md z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-mono text-text-dim font-bold">{t.editTitleLabel}</label>
                            <input
                              type="text"
                              style={{ fontSize: `${linkFontSize}px` }}
                              className="w-full bg-input-bg border border-border-main focus:border-border-light text-text-bright px-2 py-1 outline-none font-bold"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit(nb.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              autoFocus
                              placeholder="Title"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-mono text-text-dim font-bold">{t.editUrlLabel}</label>
                            <input
                              type="text"
                              className="w-full bg-input-bg border border-border-main focus:border-border-light text-text-bright px-2 py-1 outline-none font-mono text-[12px]"
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit(nb.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-main/40">
                          <div className="flex items-center gap-1.5 min-w-[200px] max-w-[360px]">
                            <label className="text-[9px] font-mono text-text-dim font-bold shrink-0">{t.editFolderLabel}:</label>
                            <select
                              value={editCategoryId}
                              onChange={(e) => setEditCategoryId(e.target.value)}
                              className="w-full bg-input-bg border border-border-main text-text-bright text-[11px] px-2 py-0.5 outline-none font-mono truncate"
                            >
                              <option value="">{t.unassigned}</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.path || c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => saveEdit(nb.id)}
                              className="bg-border-light text-text-bright hover:bg-white hover:text-black px-3 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                            >
                              {t.save}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="border border-border-main text-text-dim hover:text-text-bright px-2.5 py-1 text-[10px] font-mono transition-colors cursor-pointer"
                            >
                              {t.cancel}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ノードタイトル・リンク（残り幅をすべて使い、ブラウザ枠まで広がる） */}
                        <div className="flex-1 min-w-[140px] flex items-center gap-2.5 overflow-hidden pr-3">
                          <div className="w-6 h-6 flex items-center justify-center bg-base-bg text-text-normal shrink-0 border border-border-main/50 group-hover:border-border-light transition-colors">
                            <FileText size={12} />
                          </div>
                          <div className="flex items-center gap-1.5 overflow-hidden flex-1 group/edit min-w-0">
                            <a 
                              href={nb.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => handleOpenLink(e, nb.url)}
                              style={{ fontSize: `${linkFontSize}px` }}
                              className="text-text-bright hover:underline truncate font-bold transition-colors cursor-pointer"
                              title={
                                linkOpenMode === 'window'
                                  ? (language === 'JP' ? `${nb.title} (新しい別ウィンドウで開く)` : `${nb.title} (Open in new window)`)
                                  : nb.title
                              }
                            >
                              {nb.title}
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openLink(nb.url, { mode: 'window', preset: windowSizePreset, customDimensions });
                              }}
                              className="text-text-dim hover:text-text-bright opacity-0 group-hover/edit:opacity-100 transition-opacity p-0.5 shrink-0 cursor-pointer"
                              title={language === 'JP' ? '常に独立ウィンドウで開く' : 'Open in standalone window'}
                            >
                              <AppWindow size={11} />
                            </button>
                            <button 
                                onClick={(e) => startEdit(e, nb)}
                                className="text-text-dim hover:text-text-bright opacity-0 group-hover/edit:opacity-100 transition-opacity p-1 shrink-0 cursor-pointer"
                                title="Edit Title"
                            >
                                <Pencil size={11} />
                            </button>
                          </div>
                        </div>

                        {/* ソース */}
                        <div 
                          style={{ width: `${columnWidths.source}px` }} 
                          className="shrink-0 hidden md:flex items-center gap-1.5 text-[10px] text-text-dim truncate font-mono px-2"
                          title={host}
                        >
                          <Database size={10} className="shrink-0 text-text-dim" />
                          <span className="truncate">{host}</span>
                        </div>

                        {/* タイムスタンプ */}
                        <div 
                          style={{ width: `${columnWidths.timestamp}px` }} 
                          className="shrink-0 hidden sm:block text-right text-text-dim text-[10px] font-mono px-2 truncate"
                        >
                          {formatDate(nb.createdAt)}
                        </div>

                        {/* ディレクトリ */}
                        <div 
                          style={{ width: `${columnWidths.directory}px` }} 
                          className="shrink-0 hidden lg:block text-right text-text-dim text-[10px] truncate px-2"
                          title={getCategoryName(nb.categoryId)}
                        >
                          <span className="hover:text-text-normal truncate block">
                            {getCategoryShortName(nb.categoryId)}
                          </span>
                        </div>

                        {/* 権限 / 操作（ブラウザ右端枠にピッタリ固定） */}
                        <div className="w-20 shrink-0 flex items-center justify-end gap-1 text-text-dim text-[10px] font-bold pr-1">
                          <span className="hidden sm:inline opacity-60 mr-1">{t.owner}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRowDeleteClick(e, nb.id)}
                            className={`p-1.5 transition-all border cursor-pointer ${
                              confirmRowDeleteId === nb.id
                                ? 'bg-red-900/60 text-red-200 border-red-500 font-bold px-2 animate-pulse'
                                : 'border-transparent text-text-dim/50 hover:text-[#ff7b72] hover:border-red-500/30 hover:bg-red-950/20'
                            }`}
                            title={confirmRowDeleteId === nb.id ? t.confirmDeleteRow : t.delete}
                          >
                            {confirmRowDeleteId === nb.id ? (
                              <span className="flex items-center gap-1 text-[9px] text-red-200 font-mono">
                                <Trash2 size={11} className="shrink-0 animate-bounce" />
                                {t.confirmDeleteRow}
                              </span>
                            ) : (
                              <Trash2 size={12} className="shrink-0" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              </div>

              {/* さらに読み込むボタン & 表示件数サマリー */}
              {visibleCount < filteredNotebooks.length && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 mt-3 bg-panel-bg border border-border-main text-[11px]">
                  <span className="text-text-dim font-mono">
                    {t.showingCount}: <strong className="text-text-bright font-bold">{displayedNotebooks.length}</strong> / {filteredNotebooks.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => Math.min(prev + 100, filteredNotebooks.length))}
                    className="px-4 py-1.5 bg-border-main hover:bg-border-light text-text-bright font-bold tracking-wider transition-colors cursor-pointer text-[10px]"
                  >
                    {t.loadMore}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* カード型表示（K-Navigatorスタイルのカードグリッド） */
            <div className="flex flex-col pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 pt-1">
                {displayedNotebooks.map((nb) => {
                  const host = getHostname(nb.url);
                  const isSelected = selectedIds.has(nb.id);
                  const isEditing = editingId === nb.id;
                  const catName = getCategoryName(nb.categoryId);
                  const isCopied = copiedId === nb.id;

                  const isDragging = draggingId === nb.id;
                  const isDragOver = dragOverId === nb.id;

                  return (
                    <div
                      key={nb.id}
                      draggable={!editingId}
                      onDragStart={(e) => handleDragStart(e, nb.id)}
                      onDragOver={(e) => handleDragOver(e, nb.id)}
                      onDragLeave={(e) => handleDragLeave(e, nb.id)}
                      onDrop={(e) => handleDrop(e, nb.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-base-bg border transition-all p-3.5 flex flex-col justify-between group/card relative rounded-xs select-none ${
                        isSelected 
                          ? 'border-border-light bg-border-main/20 ring-1 ring-border-light shadow-md' 
                          : 'border-border-main hover:border-border-light hover:bg-border-main/10'
                      } ${
                        isDragging ? 'opacity-40 bg-border-main/30 border-dashed border-border-light' : ''
                      } ${
                        isDragOver ? 'ring-2 ring-text-bright border-text-bright bg-border-main/30 scale-[1.01]' : ''
                      }`}
                    >
                      {/* 上部ヘッダー: ドラッグハンドル + チェックボックス + ドメインバッジ + アクションボタン群 */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {/* ドラッグハンドル */}
                            <div
                              className="p-1 -ml-1 text-text-dim/40 hover:text-text-bright group-hover/card:text-text-dim transition-colors cursor-grab active:cursor-grabbing shrink-0"
                              title={language === 'JP' ? 'ドラッグして並び替え' : 'Drag to reorder'}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={13} />
                            </div>

                            {/* 選択チェックボックス */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(nb.id, e);
                              }}
                              onDragStart={(e) => e.stopPropagation()}
                              className="text-text-dim hover:text-text-bright transition-colors cursor-pointer shrink-0"
                              title={isSelected ? "Deselect" : "Select"}
                            >
                              {isSelected ? <CheckSquare size={13} className="text-text-bright" /> : <Square size={13} />}
                            </button>

                            {/* ドメイン/ホスト名バッジ */}
                            <div 
                              className="flex items-center gap-1.5 px-2 py-0.5 bg-input-bg border border-border-main rounded-xs text-[10px] font-mono font-bold text-text-bright truncate max-w-[150px] shadow-xs"
                              title={host}
                            >
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`} 
                                alt="" 
                                className="w-3.5 h-3.5 shrink-0 object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span className="truncate text-text-bright">{host}</span>
                            </div>
                          </div>

                          {/* アクションボタングループ */}
                          <div className="flex items-center gap-0.5 shrink-0" onDragStart={(e) => e.stopPropagation()}>
                            {/* 独立ウィンドウで開く */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openLink(nb.url, { mode: 'window', preset: windowSizePreset, customDimensions });
                              }}
                              className="p-1 text-text-dim hover:text-text-bright hover:bg-border-main/50 transition-colors rounded-xs cursor-pointer"
                              title={language === 'JP' ? '独立ウィンドウで開く' : 'Open in standalone window'}
                            >
                              <AppWindow size={12} />
                            </button>

                            {/* URLコピー */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyUrl(e, nb.id, nb.url)}
                              className="p-1 text-text-dim hover:text-text-bright hover:bg-border-main/50 transition-colors rounded-xs cursor-pointer"
                              title={isCopied ? t.copied : t.copyUrl}
                            >
                              {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>

                            {/* 編集 */}
                            <button
                              type="button"
                              onClick={(e) => startEdit(e, nb)}
                              className="p-1 text-text-dim hover:text-text-bright hover:bg-border-main/50 transition-colors rounded-xs cursor-pointer"
                              title={t.edit}
                            >
                              <Pencil size={12} />
                            </button>

                            {/* 削除 */}
                            <button
                              type="button"
                              onClick={(e) => handleRowDeleteClick(e, nb.id)}
                              className={`p-1 transition-all rounded-xs cursor-pointer ${
                                confirmRowDeleteId === nb.id
                                  ? 'bg-red-900/60 text-red-200 border border-red-500 animate-pulse px-1.5'
                                  : 'text-text-dim hover:text-red-400 hover:bg-red-950/20'
                              }`}
                              title={confirmRowDeleteId === nb.id ? t.confirmDeleteRow : t.delete}
                            >
                              {confirmRowDeleteId === nb.id ? (
                                <span className="flex items-center gap-0.5 text-[9px] text-red-200 font-mono font-bold">
                                  <Trash2 size={11} className="shrink-0" />
                                  <span>{t.confirmDeleteRow}</span>
                                </span>
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* タイトル & リンク編集 / 通常表示エリア */}
                        {isEditing ? (
                          <div className="flex flex-col gap-2 p-2 bg-input-bg border border-border-light rounded-xs mb-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-mono text-text-dim font-bold">{t.editTitleLabel}</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-base-bg border border-border-main focus:border-border-light text-text-bright px-2 py-1 text-[12px] font-bold outline-none font-sans"
                                placeholder="Title"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(nb.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-mono text-text-dim font-bold">{t.editUrlLabel}</label>
                              <input
                                type="text"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                className="w-full bg-base-bg border border-border-main focus:border-border-light text-text-bright px-2 py-1 text-[11px] font-mono outline-none"
                                placeholder="https://..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(nb.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-mono text-text-dim font-bold">{t.editFolderLabel}</label>
                              <select
                                value={editCategoryId}
                                onChange={(e) => setEditCategoryId(e.target.value)}
                                className="w-full bg-base-bg border border-border-main text-text-bright text-[10px] px-1.5 py-1 outline-none font-mono truncate font-bold"
                              >
                                <option value="">{t.unassigned}</option>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.path || c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border-main/50">
                              <button
                                type="button"
                                onClick={() => saveEdit(nb.id)}
                                className="bg-border-light text-white px-2.5 py-1 text-[10px] font-mono font-bold hover:bg-white hover:text-black transition-colors cursor-pointer"
                              >
                                {t.save}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="border border-border-main text-text-dim hover:text-text-bright px-2 py-1 text-[10px] font-mono cursor-pointer"
                              >
                                {t.cancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* タイトルエリア */}
                            <div className="mb-3">
                              <a
                                href={nb.url}
                                onClick={(e) => handleOpenLink(e, nb.url)}
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: `${linkFontSize}px` }}
                                className="font-bold text-text-bright hover:underline line-clamp-2 leading-snug cursor-pointer transition-colors block"
                                title={nb.title}
                              >
                                {nb.title}
                              </a>
                            </div>

                            {/* 詳細メタ情報（URL & 所属フォルダ） */}
                            <div className="flex flex-col gap-1.5 mb-4 text-[10px] font-mono text-text-dim">
                              {/* URL表示 */}
                              <div className="flex items-center gap-1.5 text-text-bright truncate" title={nb.url}>
                                <Globe size={11} className="shrink-0 text-text-dim" />
                                <span className="truncate text-[10px] select-all font-medium text-text-bright">{nb.url}</span>
                              </div>

                              {/* 所属フォルダ */}
                              <div className="flex items-center gap-1.5 text-text-dim/80 truncate" title={catName}>
                                <Folder size={11} className="shrink-0 text-text-dim/60" />
                                <span className="truncate text-[10px]">{catName}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* フッター行: 日付 + OPEN → ボタン (K-Navigatorスタイル) */}
                      <div className="pt-2.5 border-t border-border-main/50 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-text-dim text-[9px]">{formatDate(nb.createdAt)}</span>

                        {/* OPEN → ボタン */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenLink(e as any, nb.url)}
                          onDragStart={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-text-bright hover:underline font-mono font-bold text-[10px] tracking-wider transition-colors cursor-pointer"
                          title={language === 'JP' ? 'リンクを開く' : 'Open Link'}
                        >
                          <span>{t.openLinkBtn}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* さらに読み込むボタン & 表示件数サマリー */}
              {visibleCount < filteredNotebooks.length && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 mt-3 bg-panel-bg border border-border-main text-[11px]">
                  <span className="text-text-dim font-mono">
                    {t.showingCount}: <strong className="text-text-bright font-bold">{displayedNotebooks.length}</strong> / {filteredNotebooks.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => Math.min(prev + 100, filteredNotebooks.length))}
                    className="px-4 py-1.5 bg-border-main hover:bg-border-light text-text-bright font-bold tracking-wider transition-colors cursor-pointer text-[10px]"
                  >
                    {t.loadMore}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
