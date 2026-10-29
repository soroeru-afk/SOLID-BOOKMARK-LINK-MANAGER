import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutGrid, Folders, Plus, Folder, FolderOpen, 
  Download, Upload, FileCode, Pencil, Trash2, RotateCcw,
  ChevronRight, ChevronDown, ChevronsUpDown, ChevronsDown, ChevronsUp, FolderTree, Search, X, Bookmark,
  Palette, Settings, Check, Terminal, Zap, GripVertical, Star
} from 'lucide-react';
import { Category, Notebook } from '../types';
import { Language, i18n } from '../i18n';
import { ColorPreset } from '../utils/colorPresets';

interface Props {
  categories: Category[];
  notebooks: Notebook[];
  onAddCategory: (name: string, parentId?: string | null) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  activeCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onDropNotebooksToCategory?: (notebookIds: string[], targetCategoryId: string) => void;
  onReorderRootCategories?: (sourceId: string, targetId: string) => void;
  onReorderStockCategories?: (sourceId: string, targetId: string) => void;
  onOpenStockImport?: () => void;
  onExportStockJson?: () => void;
  language: Language;
  onExportJson: () => void;
  onImportJson: (content: string) => void;
  onImportHtml: (content: string) => void;
  onResetAllData?: () => void;
  listFontSize?: number;
  onOpenBookmarklet?: () => void;
  sidebarPosition?: 'left' | 'right';
  onOpenFolderManager?: () => void;
  isFolderManagerActive?: boolean;
  colorPresets?: ColorPreset[];
  onUpdateColorPresets?: (presets: ColorPreset[]) => void;
  showColors?: boolean;
  onToggleShowColors?: () => void;
  showListColors?: boolean;
  onToggleShowListColors?: () => void;
  onResetAllColors?: () => void;
}

interface CategoryTreeNode extends Category {
  level: number;
  children: CategoryTreeNode[];
  directCount: number;
  totalCount: number;
}

const DEFAULT_SIDEBAR_WIDTH = 340;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 750;

export default function Sidebar({ 
  categories, 
  notebooks,
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory, 
  activeCategory, 
  onSelectCategory, 
  onDropNotebooksToCategory,
  onReorderRootCategories,
  onReorderStockCategories,
  onOpenStockImport,
  onExportStockJson,
  language, 
  onExportJson, 
  onImportJson, 
  onImportHtml,
  onResetAllData,
  listFontSize = 11,
  onOpenBookmarklet,
  sidebarPosition = 'left',
  onOpenFolderManager,
  isFolderManagerActive = false,
  colorPresets = [],
  onUpdateColorPresets,
  showColors = true,
  onToggleShowColors,
  showListColors = true,
  onToggleShowListColors,
  onResetAllColors
}: Props) {
  // サイドバーの幅（localStorageで永続化）
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebar_width');
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
    return isNaN(parsed) ? DEFAULT_SIDEBAR_WIDTH : Math.max(MIN_SIDEBAR_WIDTH, Math.min(parsed, MAX_SIDEBAR_WIDTH));
  });

  const [isDragging, setIsDragging] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');

  // カオルさまご指定: [ストックリスト] と [ブックマーク] の横並びセグメントタブステート
  const [sidebarSection, setSidebarSection] = useState<'stock' | 'bookmarks'>(() => {
    const saved = localStorage.getItem('sidebar_section');
    return (saved === 'stock' || saved === 'bookmarks') ? saved : 'stock';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_section', sidebarSection);
  }, [sidebarSection]);

  // 下部ボトムコマンドバー ポップオーバー用ステート
  const [activeBottomTab, setActiveBottomTab] = useState<'data' | 'color' | 'stock' | null>(null);
  const bottomToolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bottomToolbarRef.current && !bottomToolbarRef.current.contains(e.target as Node)) {
        setActiveBottomTab(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 色管理ラベル編集ステート
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState<string>('');

  // フォルダドロップ時のハイライト状態
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  // カオルさまご指定: 最上位階層カテゴリーのドラッグ＆ドロップ並び替えステート
  const [draggedRootCatId, setDraggedRootCatId] = useState<string | null>(null);
  const [dragOverRootCatId, setDragOverRootCatId] = useState<string | null>(null);

  // カオルさまご指定: ストックリスト内サブカテゴリーのドラッグ＆ドロップ並び替えステート
  const [draggedStockCatId, setDraggedStockCatId] = useState<string | null>(null);
  const [dragOverStockCatId, setDragOverStockCatId] = useState<string | null>(null);

  const handleFolderDragOver = useCallback((e: React.DragEvent, catId: string, isRoot: boolean, isStockSub: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedStockCatId) {
      if (isStockSub && dragOverStockCatId !== catId) {
        setDragOverStockCatId(catId);
      }
    } else if (draggedRootCatId) {
      if (isRoot && dragOverRootCatId !== catId) {
        setDragOverRootCatId(catId);
      }
    } else {
      if (dragOverCatId !== catId) {
        setDragOverCatId(catId);
      }
    }
  }, [draggedStockCatId, dragOverStockCatId, draggedRootCatId, dragOverRootCatId, dragOverCatId]);

  const handleFolderDragLeave = useCallback((e: React.DragEvent, catId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverCatId === catId) {
      setDragOverCatId(null);
    }
    if (dragOverRootCatId === catId) {
      setDragOverRootCatId(null);
    }
    if (dragOverStockCatId === catId) {
      setDragOverStockCatId(null);
    }
  }, [dragOverCatId, dragOverRootCatId, dragOverStockCatId]);

  const handleFolderDrop = useCallback((e: React.DragEvent, targetCategoryId: string, isRoot: boolean, isStockSub: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCatId(null);
    setDragOverRootCatId(null);
    setDragOverStockCatId(null);

    try {
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);

      // カオルさまご指定: ストックリスト内カテゴリー同士のドラッグ＆ドロップ並び替え
      if (data && data.type === 'STOCK_SUB_CATEGORY' && data.categoryId) {
        if (data.categoryId !== targetCategoryId) {
          onReorderStockCategories?.(data.categoryId, targetCategoryId);
        }
        setDraggedStockCatId(null);
        return;
      }

      // カオルさまご指定: 最上位カテゴリー同士のドラッグ＆ドロップ並び替え
      if (data && data.type === 'ROOT_CATEGORY' && data.categoryId) {
        if (isRoot && data.categoryId !== targetCategoryId) {
          onReorderRootCategories?.(data.categoryId, targetCategoryId);
        }
        setDraggedRootCatId(null);
        return;
      }

      // ブックマークのフォルダへの移動（ストックリストや一般フォルダへ自由に放り込める）
      if (data && data.type === 'BOOKMARK_ITEMS' && Array.isArray(data.ids) && data.ids.length > 0) {
        onDropNotebooksToCategory?.(data.ids, targetCategoryId);
      } else if (data && data.type === 'BOOKMARK_ITEM' && data.id) {
        onDropNotebooksToCategory?.([data.id], targetCategoryId);
      }
    } catch (err) {
      // ignore non-json
    } finally {
      setDraggedRootCatId(null);
      setDraggedStockCatId(null);
    }
  }, [onDropNotebooksToCategory, onReorderRootCategories, onReorderStockCategories]);

  // フォルダの2段階削除ステート（誤クリック防止）
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const deleteCatTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (deleteCatTimerRef.current) clearTimeout(deleteCatTimerRef.current);
    };
  }, []);

  const handleDeleteCategoryClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteCatId !== id) {
      setConfirmDeleteCatId(id);
      if (deleteCatTimerRef.current) clearTimeout(deleteCatTimerRef.current);
      deleteCatTimerRef.current = setTimeout(() => {
        setConfirmDeleteCatId(null);
      }, 4000);
    } else {
      if (deleteCatTimerRef.current) clearTimeout(deleteCatTimerRef.current);
      setConfirmDeleteCatId(null);
      onDeleteCategory(id);
    }
  };
  
  // 展開中のカテゴリIDセット（localStorageで維持）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sidebar_expanded_ids');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return new Set(arr);
      } catch (e) {
        console.error("Failed to parse sidebar_expanded_ids", e);
      }
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem('sidebar_expanded_ids', JSON.stringify(Array.from(expandedIds)));
  }, [expandedIds]);

  const treeScrollContainerRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const isResizingRef = useRef(false);
  const t = i18n[language];

  // 初回マウント時にサイドバーのスクロール位置を復元
  useEffect(() => {
    const savedTop = localStorage.getItem('sidebar_scroll_top');
    const savedLeft = localStorage.getItem('sidebar_scroll_left');
    if (treeScrollContainerRef.current) {
      if (savedTop) treeScrollContainerRef.current.scrollTop = parseInt(savedTop, 10) || 0;
      if (savedLeft) treeScrollContainerRef.current.scrollLeft = parseInt(savedLeft, 10) || 0;
    }
  }, []);

  // activeCategory が変更された際、その先祖フォルダを自動展開して迷子を防止
  const prevActiveCategoryRef = useRef<string | null>(activeCategory);
  useEffect(() => {
    if (prevActiveCategoryRef.current === activeCategory) return;
    prevActiveCategoryRef.current = activeCategory;

    if (!activeCategory || activeCategory === '__UNASSIGNED__') return;
    const catMap = new Map(categories.map(c => [c.id, c]));
    const ancestors: string[] = [];
    let curr = catMap.get(activeCategory);
    while (curr && curr.parentId) {
      ancestors.push(curr.parentId);
      curr = catMap.get(curr.parentId);
    }
    if (ancestors.length > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        ancestors.forEach(id => next.add(id));
        return next;
      });
    }
  }, [activeCategory, categories]);

  // サイドバーのリサイズ処理（マウスドラッグ）
  const handleMouseDownResizer = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = sidebarPosition === 'right'
        ? Math.max(MIN_SIDEBAR_WIDTH, Math.min(window.innerWidth - moveEvent.clientX, MAX_SIDEBAR_WIDTH))
        : Math.max(MIN_SIDEBAR_WIDTH, Math.min(moveEvent.clientX, MAX_SIDEBAR_WIDTH));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSidebarWidth(curr => {
        localStorage.setItem('sidebar_width', curr.toString());
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleDoubleClickResizer = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    localStorage.setItem('sidebar_width', DEFAULT_SIDEBAR_WIDTH.toString());
  };

  // ツリー構造を計算
  const categoryTree = useMemo(() => {
    const directCounts = new Map<string, number>();
    for (const nb of notebooks) {
      if (nb.categoryId) {
        directCounts.set(nb.categoryId, (directCounts.get(nb.categoryId) || 0) + 1);
      }
    }

    const catMap = new Map<string, CategoryTreeNode>();
    for (const c of categories) {
      catMap.set(c.id, {
        ...c,
        level: 0,
        children: [],
        directCount: directCounts.get(c.id) || 0,
        totalCount: directCounts.get(c.id) || 0,
      });
    }

    const roots: CategoryTreeNode[] = [];
    for (const c of categories) {
      const node = catMap.get(c.id)!;
      if (c.parentId && catMap.has(c.parentId)) {
        catMap.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    function updateMeta(node: CategoryTreeNode, currentLevel: number): number {
      node.level = currentLevel;
      let sum = node.directCount;
      for (const child of node.children) {
        sum += updateMeta(child, currentLevel + 1);
      }
      node.totalCount = sum;
      return sum;
    }

    for (const r of roots) {
      updateMeta(r, 0);
    }

    return roots;
  }, [categories, notebooks]);

  // カオルさまご指定: 「★ ストックリスト」判定ヘルパー
  const isStockListNode = useCallback((c: { id: string; name: string }) => {
    return c.id === 'stock_root' || c.name.includes('ストックリスト') || c.name.toLowerCase().includes('stock list');
  }, []);

  // カオルさまご指定: ストックリスト（固定作業スペース）と一般フォルダー階層（アーカイブ）を分離
  const { stockListNode, generalTree } = useMemo(() => {
    let stockNode: CategoryTreeNode | null = null;
    const others: CategoryTreeNode[] = [];

    for (const r of categoryTree) {
      if (isStockListNode(r)) {
        stockNode = r;
      } else if (r.name.toLowerCase() === 'general' && r.totalCount === 0 && r.children.length === 0) {
        // 未使用の初期Generalフォルダーは除外
      } else {
        others.push(r);
      }
    }

    return { stockListNode: stockNode, generalTree: others };
  }, [categoryTree, isStockListNode]);

  // カオルさまご指定: 「ストックリストの数字」＋「ブックマークの数字」＝「全てのデータ」の完全整合
  const stockTotalCount = useMemo(() => {
    return stockListNode?.totalCount || 0;
  }, [stockListNode]);

  // ブックマーク側（一般フォルダ＋未割り当て）の総件数: ストックリスト以外の全件
  // これにより [ストックリスト] + [ブックマーク] = [すべてのデータ] が完全に一致します
  const bookmarksTotalCount = useMemo(() => {
    return Math.max(0, notebooks.length - stockTotalCount);
  }, [notebooks.length, stockTotalCount]);

  // ストックリスト直下へのカテゴリー追加ステート
  const [isAddingStockSubCat, setIsAddingStockSubCat] = useState(false);
  const [newStockSubCatName, setNewStockSubCatName] = useState('');

  const handleAddStockCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockSubCatName.trim()) {
      setIsAddingStockSubCat(false);
      return;
    }
    const parentId = stockListNode ? stockListNode.id : null;
    onAddCategory(newStockSubCatName.trim(), parentId);
    setNewStockSubCatName('');
    setIsAddingStockSubCat(false);
    if (stockListNode) {
      setExpandedIds(prev => new Set(prev).add(stockListNode.id));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleAddRoot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setIsAddingRoot(false);
      return;
    }
    onAddCategory(newCatName.trim(), null);
    setNewCatName('');
    setIsAddingRoot(false);
  };

  const handleAddSub = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!newSubCatName.trim()) {
      setAddingParentId(null);
      return;
    }
    onAddCategory(newSubCatName.trim(), parentId);
    setNewSubCatName('');
    setAddingParentId(null);
    setExpandedIds(prev => new Set(prev).add(parentId));
  };

  const startEditCategory = (e: React.MouseEvent, c: Category) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCatId(c.id);
    setEditCatName(c.name);
  };

  const saveEditCategory = (id: string) => {
    if (editCatName.trim()) {
      onUpdateCategory(id, editCatName.trim());
    }
    setEditingCatId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'html') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (type === 'json') {
        onImportJson(content);
      } else {
        onImportHtml(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 未分類件数
  const unassignedCount = useMemo(() => {
    return notebooks.filter(nb => !nb.categoryId).length;
  }, [notebooks]);

  // フォルダ検索フィルター（一般フォルダー階層を対象）
  const filteredTree = useMemo(() => {
    if (!folderSearchQuery.trim()) {
      return generalTree;
    }
    const q = folderSearchQuery.toLowerCase().trim();

    function filterNode(node: CategoryTreeNode): CategoryTreeNode | null {
      const matchSelf = node.name.toLowerCase().includes(q) || (node.path && node.path.toLowerCase().includes(q));
      const matchedChildren: CategoryTreeNode[] = [];

      for (const child of node.children) {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          matchedChildren.push(filteredChild);
        }
      }

      if (matchSelf || matchedChildren.length > 0) {
        return {
          ...node,
          children: matchedChildren
        };
      }
      return null;
    }

    const result: CategoryTreeNode[] = [];
    for (const root of generalTree) {
      const filteredRoot = filterNode(root);
      if (filteredRoot) {
        result.push(filteredRoot);
      }
    }
    return result;
  }, [generalTree, folderSearchQuery]);

  // 検索中は自動的に一致するフォルダを展開
  useEffect(() => {
    if (folderSearchQuery.trim()) {
      const allIds = new Set<string>();
      function collectIds(nodes: CategoryTreeNode[]) {
        for (const n of nodes) {
          allIds.add(n.id);
          collectIds(n.children);
        }
      }
      collectIds(filteredTree);
      setExpandedIds(allIds);
    }
  }, [folderSearchQuery, filteredTree]);

  // ノードのレンダリング
  const renderNode = (node: CategoryTreeNode, isStockSub: boolean = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isActive = activeCategory === node.id;
    const isEditing = editingCatId === node.id;
    const isDragOver = dragOverCatId === node.id;

    // カオルさまご指定: 最上位階層カテゴリー または ストックリスト配下カテゴリーのドラッグ並び替え判定
    const isRoot = !isStockSub && node.level === 0;
    const isRootDragging = draggedRootCatId === node.id;
    const isRootDragOver = dragOverRootCatId === node.id;

    const isStockDragging = draggedStockCatId === node.id;
    const isStockDragOver = dragOverStockCatId === node.id;

    const isDraggable = (isRoot || isStockSub) && !isEditing;
    const isItemDragging = isRootDragging || isStockDragging;
    const isItemDragOver = isRootDragOver || isStockDragOver;

    // スリムなインデント計算 (ストックリスト直下なら少し詰め、ツリーなら1階層あたり10px)
    const indentPx = isStockSub ? (node.level * 8 + 6) : (node.level * 10 + 4);

    return (
      <div key={node.id} className="flex flex-col min-w-full">
        <div 
          draggable={isDraggable}
          onDragStart={(e) => {
            if (!isDraggable) return;
            e.stopPropagation();
            const payloadType = isStockSub ? 'STOCK_SUB_CATEGORY' : 'ROOT_CATEGORY';
            const payload = JSON.stringify({ type: payloadType, categoryId: node.id });
            e.dataTransfer.setData('application/json', payload);
            e.dataTransfer.setData('text/plain', payload);
            e.dataTransfer.effectAllowed = 'move';
            if (isStockSub) {
              setDraggedStockCatId(node.id);
            } else {
              setDraggedRootCatId(node.id);
            }
          }}
          onDragEnd={() => {
            setDraggedRootCatId(null);
            setDragOverRootCatId(null);
            setDraggedStockCatId(null);
            setDragOverStockCatId(null);
          }}
          onDragOver={(e) => handleFolderDragOver(e, node.id, isRoot, isStockSub)}
          onDragLeave={(e) => handleFolderDragLeave(e, node.id)}
          onDrop={(e) => handleFolderDrop(e, node.id, isRoot, isStockSub)}
          className={`group/cat flex items-center min-h-[30px] py-0.5 pr-1.5 border transition-colors select-none ${
            isItemDragging
              ? 'opacity-40 border-dashed border-border-light bg-border-main/20'
              : isItemDragOver
                ? 'border-t-2 border-t-accent-text ring-1 ring-accent-text bg-accent-bg/30'
                : isDragOver
                  ? 'border-accent-text border-dashed bg-accent-bg/40 text-accent-text font-bold ring-1 ring-accent-text'
                  : isActive 
                    ? 'border-border-light bg-accent-bg text-accent-text font-bold shadow-sm' 
                    : 'border-transparent text-text-normal hover:text-text-bright hover:bg-border-main/30'
          }`}
          style={{ paddingLeft: `${indentPx}px` }}
        >
          {/* 最上位カテゴリ or ストックリスト内カテゴリのドラッグ並び替え用グリップハンドル */}
          {(isRoot || isStockSub) && (
            <div
              className="text-text-dim/40 group-hover/cat:text-text-bright cursor-grab active:cursor-grabbing shrink-0 -ml-1 mr-0.5"
              title={isStockSub 
                ? (language === 'JP' ? 'ドラッグしてカテゴリー順序を並び替え' : 'Drag to reorder category')
                : (language === 'JP' ? 'ドラッグして最上位カテゴリの順序を並び替え' : 'Drag to reorder root categories')}
            >
              <GripVertical size={11} />
            </div>
          )}

          {/* トグル展開アイコン */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className={`w-4 h-4 flex items-center justify-center shrink-0 mr-0.5 ${
                isActive ? 'text-accent-text' : 'text-text-dim hover:text-text-bright'
              }`}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-4 shrink-0 mr-0.5" />
          )}

          {/* フォルダアイコン */}
          <span 
            className="mr-1.5 shrink-0 cursor-pointer"
            onClick={() => {
              onSelectCategory(node.id);
              if (hasChildren) {
                toggleExpand(node.id);
              }
            }}
          >
            {isExpanded && hasChildren ? (
              <FolderOpen size={13} className={isActive ? 'text-accent-text' : 'text-text-normal group-hover/cat:text-text-bright'} />
            ) : (
              <Folder size={13} className={isActive ? 'text-accent-text' : 'text-text-normal group-hover/cat:text-text-bright'} />
            )}
          </span>

          {/* フォルダ名 または 編集フォーム */}
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editCatName}
              onChange={e => setEditCatName(e.target.value)}
              onBlur={() => saveEditCategory(node.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEditCategory(node.id);
                if (e.key === 'Escape') setEditingCatId(null);
              }}
              style={{ fontSize: `${listFontSize}px` }}
              className="min-w-0 flex-1 h-6 px-1.5 bg-base-bg border border-border-light text-text-bright font-bold focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                onSelectCategory(node.id);
                if (hasChildren) {
                  toggleExpand(node.id);
                }
              }}
              style={{ fontSize: `${listFontSize}px` }}
              className={`min-w-0 flex-1 text-left truncate cursor-pointer tracking-wide ${
                isActive 
                  ? 'text-accent-text font-bold' 
                  : 'font-medium text-text-normal group-hover/cat:text-text-bright'
              }`}
              title={`${node.name}\nパス: ${node.path || node.name}`}
            >
              {node.name}
            </button>
          )}

          {/* 件数バッジ */}
          <span className={`text-[9px] ml-1.5 px-1.5 py-0.5 shrink-0 font-mono ${
            isActive 
              ? 'text-accent-text font-bold bg-current/15 rounded-xs' 
              : 'text-text-dim group-hover/cat:text-text-normal'
          }`}>
            [{node.totalCount}]
          </span>

          {/* ホバー時のアクションボタン */}
          {!isEditing && (
            <div className={`flex items-center gap-1 ml-1 shrink-0 ${confirmDeleteCatId === node.id ? 'opacity-100' : 'opacity-0 group-hover/cat:opacity-100'}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingParentId(node.id);
                  setNewSubCatName('');
                }}
                className={`p-0.5 ${isActive ? 'text-accent-text/80 hover:text-accent-text' : 'text-text-dim hover:text-text-bright'}`}
                title={language === 'JP' ? 'サブフォルダを追加' : 'Add Subfolder'}
              >
                <Plus size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => startEditCategory(e, node)}
                className={`p-0.5 ${isActive ? 'text-accent-text/80 hover:text-accent-text' : 'text-text-dim hover:text-text-bright'}`}
                title={t.edit}
              >
                <Pencil size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteCategoryClick(e, node.id)}
                className={`p-0.5 transition-all cursor-pointer border ${
                  confirmDeleteCatId === node.id 
                    ? 'border-red-500 bg-red-900/60 text-red-200 font-bold px-1.5 animate-pulse flex items-center gap-1 text-[9px]' 
                    : 'border-transparent text-[#ff7b72] hover:text-[#ff9b94] hover:border-red-500/30 hover:bg-red-950/20'
                }`}
                title={confirmDeleteCatId === node.id ? (language === 'JP' ? '再クリックでフォルダを削除' : 'Click again to confirm delete') : t.delete}
              >
                <Trash2 size={11} className={confirmDeleteCatId === node.id ? 'animate-bounce' : ''} />
                {confirmDeleteCatId === node.id && (
                  <span>{language === 'JP' ? '削除確認' : 'CONFIRM'}</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* サブフォルダ追加フォーム (Escキー・✕ボタンでキャンセル可能) */}
        {addingParentId === node.id && (
          <form 
            onSubmit={(e) => handleAddSub(e, node.id)} 
            className="flex items-center gap-1 my-1" 
            style={{ paddingLeft: `${indentPx + 14}px` }}
          >
            <input
              autoFocus
              type="text"
              value={newSubCatName}
              onChange={e => setNewSubCatName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setAddingParentId(null);
                  setNewSubCatName('');
                }
              }}
              placeholder={`${t.dirName} (Escでキャンセル)`}
              className="flex-1 min-w-0 h-6 px-1.5 text-[10px] bg-base-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light"
            />
            <button 
              type="submit" 
              className="h-6 px-2 text-[10px] bg-accent-bg border border-accent-bg text-white hover:brightness-110 font-bold rounded-2xs cursor-pointer shadow-2xs shrink-0"
              title={language === 'JP' ? '作成' : 'Add'}
            >
              +
            </button>
            <button 
              type="button"
              onClick={() => {
                setAddingParentId(null);
                setNewSubCatName('');
              }}
              className="h-6 px-1.5 text-[10px] bg-base-bg border border-border-main text-text-dim hover:text-text-bright hover:bg-border-main/20 rounded-2xs cursor-pointer shrink-0"
              title={language === 'JP' ? 'キャンセル (やめる)' : 'Cancel'}
            >
              <X size={10} />
            </button>
          </form>
        )}

        {/* 子要素レンダリング */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col border-l border-border-main/25 ml-2.5">
            {node.children.map(child => renderNode(child, isStockSub))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      style={{ width: `${sidebarWidth}px` }}
      className={`relative shrink-0 h-full bg-base-bg flex flex-col p-4 gap-3 z-20 select-none transition-none overflow-hidden ${
        sidebarPosition === 'right' ? 'border-l border-border-main' : 'border-r border-border-main'
      }`}
    >
      {/* ドラッグリサイズ用の境界バー */}
      <div
        onMouseDown={handleMouseDownResizer}
        onDoubleClick={handleDoubleClickResizer}
        className={`absolute top-0 w-1.5 h-full cursor-col-resize hover:bg-border-light/70 transition-colors z-30 ${
          sidebarPosition === 'right' ? 'left-0' : 'right-0'
        } ${
          isDragging ? 'bg-border-light' : 'bg-transparent'
        }`}
        title={language === 'JP' ? 'ドラッグで幅を調整 (ダブルクリックで初期幅に戻す)' : 'Drag to resize sidebar (Double click to reset)'}
      />

      {/* ロゴ・アプリヘッダー */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 bg-border-main border border-border-light flex items-center justify-center text-text-bright shrink-0">
          <LayoutGrid size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-[12px] text-text-bright tracking-wider leading-none whitespace-nowrap overflow-hidden text-ellipsis" title={t.appTitle}>
            {t.appTitle}
          </h1>
        </div>
      </div>

      {/* システムステータス */}
      <div className="border border-border-main bg-panel-bg p-2.5 relative flex flex-col shrink-0 shadow-2xs">
        <div className="absolute top-0 left-0 bg-base-bg px-2 -mt-[0.55rem] ml-3 text-[9px] text-text-bright font-bold border border-border-main font-mono shadow-2xs">
          {t.systemStatus}
        </div>
        <div className="flex flex-col gap-1 text-[10px] text-text-dim mt-0.5">
          <div className="flex justify-between">
            <span>{t.coreNode}</span>
            <span className="text-text-bright font-bold">{t.online}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.dbConnection}</span>
            <span className="text-text-bright font-bold">{t.established}</span>
          </div>
          <div className="flex justify-between">
            <span>{language === 'JP' ? 'Google Drive同期' : 'Drive App Sync'}</span>
            <span className="text-accent-text font-bold">{language === 'JP' ? '自動レジューム有効' : 'AUTO RESUME'}</span>
          </div>
        </div>
      </div>

      {/* ディレクトリ一覧パネル */}
      <div className="border border-border-main bg-panel-bg p-2.5 relative flex flex-col flex-1 min-h-0 shadow-2xs">
        <div className="absolute top-0 left-0 bg-base-bg px-2 -mt-[0.55rem] ml-3 text-[9px] text-text-bright font-bold border border-border-main font-mono shadow-2xs z-10">
          {t.directorySets}
        </div>
        
        {/* すべてのデータ & 横並びタブ */}
        <div className="mt-1 flex flex-col gap-1.5 shrink-0">
          {/* すべてのデータ（常時ニュートラル表示：背景の派手な変色はせず、全件表示中ステータスを静かに提示） */}
          <div className="flex flex-col gap-0.5">
            <button 
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`w-full min-h-[28px] py-1 flex items-center justify-between px-2.5 border transition-colors cursor-pointer rounded-2xs ${
                activeCategory === null
                  ? 'border-border-light/70 bg-base-bg/60 text-text-bright shadow-2xs font-bold'
                  : 'border-border-main/40 bg-base-bg/20 text-text-normal hover:text-text-bright hover:bg-border-main/20'
              }`}
              title={language === 'JP' ? 'すべてのデータをメイン画面に表示（絞り込み解除）' : 'Show All Data'}
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <Folders size={13} className={`shrink-0 ${activeCategory === null ? 'text-accent-text' : 'text-text-dim'}`} />
                <span className="truncate tracking-wide" style={{ fontSize: `${listFontSize}px` }}>[ {t.allData} ]</span>
                {activeCategory === null && (
                  <span className="text-[8px] px-1 py-0.2 bg-border-main/40 text-text-dim rounded-2xs font-mono font-normal shrink-0">
                    {language === 'JP' ? '全件' : 'ALL'}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] font-mono shrink-0 ml-1 font-bold text-text-dim">[{notebooks.length}]</span>
            </button>
          </div>

          {/* カオルさまご指定: [ストックリスト] と [ブックマーク] の横並びセグメントタブ (合計が全件と完全一致) */}
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-base-bg border border-border-main rounded-xs text-[10px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => {
                setSidebarSection('stock');
                if (stockListNode) {
                  onSelectCategory(stockListNode.id);
                }
              }}
              className={`h-7 px-1.5 flex items-center justify-center gap-1.5 border transition-all cursor-pointer rounded-2xs ${
                sidebarSection === 'stock'
                  ? 'bg-accent-bg border-accent-text text-white font-bold shadow-xs'
                  : 'bg-transparent border-transparent text-text-dim hover:text-text-bright hover:bg-panel-bg'
              }`}
              title={language === 'JP' ? '日常作業用ストックリスト (Google Keep風)' : 'Daily Stock List'}
            >
              <Star size={11} className={sidebarSection === 'stock' ? 'fill-current text-white' : 'text-amber-400'} />
              <span className="truncate">{language === 'JP' ? 'ストックリスト' : 'STOCK LIST'}</span>
              <span className={`text-[8.5px] px-1 py-0.2 rounded-2xs font-mono font-bold ${
                sidebarSection === 'stock' ? 'bg-white/20 text-white' : 'bg-border-main text-text-dim'
              }`}>
                {stockTotalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarSection('bookmarks');
                // ブックマークタブを開いた時、もしストックリストが選択中なら選択解除または通常フォルダへ
                if (activeCategory === stockListNode?.id) {
                  onSelectCategory(null);
                }
              }}
              className={`h-7 px-1.5 flex items-center justify-center gap-1.5 border transition-all cursor-pointer rounded-2xs ${
                sidebarSection === 'bookmarks'
                  ? 'bg-accent-bg border-accent-text text-white font-bold shadow-xs'
                  : 'bg-transparent border-transparent text-text-dim hover:text-text-bright hover:bg-panel-bg'
              }`}
              title={language === 'JP' ? '大容量ブックマーク階層 (アーカイブ＋未割り当て)' : 'Bookmark Hierarchy (Archive & Unassigned)'}
            >
              <Bookmark size={11} className={sidebarSection === 'bookmarks' ? 'text-white' : 'text-text-dim'} />
              <span className="truncate">{language === 'JP' ? 'ブックマーク' : 'BOOKMARKS'}</span>
              <span className={`text-[8.5px] px-1 py-0.2 rounded-2xs font-mono font-bold ${
                sidebarSection === 'bookmarks' ? 'bg-white/20 text-white' : 'bg-border-main text-text-dim'
              }`}>
                {bookmarksTotalCount}
              </span>
            </button>
          </div>
        </div>

        {/* ── タブ1: ★ ストックリスト (Google Keep風 日常作業スペース) ── */}
        {sidebarSection === 'stock' && (
          <div className="flex flex-col flex-1 min-h-0 mt-1 gap-1.5">
            {/* ストックリスト操作ツールバー */}
            <div className="flex items-center justify-between px-1.5 py-1 bg-base-bg/80 border border-border-main rounded-xs text-[9px] font-mono shrink-0">
              <span className="text-text-dim flex items-center gap-1 font-bold">
                <span>{language === 'JP' ? 'Google Keep風カテゴリー' : 'Keep-style tags'}</span>
              </span>
              <div className="flex items-center gap-1">
                {onOpenStockImport && (
                  <button
                    type="button"
                    onClick={onOpenStockImport}
                    className="px-1.5 py-0.5 bg-panel-bg border border-border-main text-text-bright hover:bg-accent-bg hover:border-accent-bg hover:text-white font-bold rounded-2xs cursor-pointer transition-colors shadow-2xs"
                    title={language === 'JP' ? 'ストックリストのみ比較インポート (JSON)' : 'Stock List Import Comparison'}
                  >
                    {language === 'JP' ? '比較' : 'DIFF'}
                  </button>
                )}
                {onExportStockJson && (
                  <button
                    type="button"
                    onClick={onExportStockJson}
                    className="px-1.5 py-0.5 bg-panel-bg border border-border-main text-text-bright hover:bg-accent-bg hover:border-accent-bg hover:text-white font-bold rounded-2xs cursor-pointer transition-colors shadow-2xs"
                    title={language === 'JP' ? 'ストックリストのみバックアップ (JSON)' : 'Export Stock List'}
                  >
                    {language === 'JP' ? '保存' : 'EXP'}
                  </button>
                )}
                {/* カオルさまご指定: カテゴリ追加のキャンセル・引っ込ませる切り替えボタン */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingStockSubCat(prev => {
                      if (prev) setNewStockSubCatName('');
                      return !prev;
                    });
                  }}
                  className={`px-1.5 py-0.5 border font-bold rounded-2xs cursor-pointer flex items-center gap-0.5 transition-all shadow-2xs ${
                    isAddingStockSubCat
                      ? 'bg-panel-bg border-border-main text-text-dim hover:text-text-bright hover:bg-border-main/20'
                      : 'bg-accent-bg border-accent-bg text-white hover:brightness-110'
                  }`}
                  title={isAddingStockSubCat ? (language === 'JP' ? '入力を閉じる (やめる)' : 'Close') : (language === 'JP' ? 'ストックリスト内に新規カテゴリーを追加' : 'Add category to Stock List')}
                >
                  {isAddingStockSubCat ? <X size={9.5} /> : <Plus size={9.5} />}
                  <span>{isAddingStockSubCat ? (language === 'JP' ? '閉じる' : 'CLOSE') : (language === 'JP' ? 'カテゴリ追加' : 'ADD CAT')}</span>
                </button>
              </div>
            </div>

            {/* ストックリスト親ノード & カテゴリーツリー（スクロール可能） */}
            <div 
              ref={treeScrollContainerRef}
              className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-auto pr-1 gap-1"
            >
              {/* ストックリスト親ノード */}
              {stockListNode && (
                <div
                  onDragOver={(e) => handleFolderDragOver(e, stockListNode.id, false, false)}
                  onDragLeave={(e) => handleFolderDragLeave(e, stockListNode.id)}
                  onDrop={(e) => handleFolderDrop(e, stockListNode.id, false, false)}
                  onClick={() => onSelectCategory(stockListNode.id)}
                  className={`group/stock flex items-center justify-between min-h-[30px] px-2 py-1 border transition-colors cursor-pointer select-none rounded-2xs ${
                    dragOverCatId === stockListNode.id
                      ? 'border-accent-text border-dashed bg-accent-bg/40 text-accent-text font-bold ring-1 ring-accent-text'
                      : activeCategory === stockListNode.id
                        ? 'border-border-light bg-accent-bg text-accent-text font-bold shadow-sm'
                        : 'border-border-main/50 bg-base-bg/40 text-text-normal hover:text-text-bright hover:bg-border-main/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <Star size={13} className={`shrink-0 ${activeCategory === stockListNode.id ? 'text-accent-text fill-current' : 'text-amber-400 fill-current'}`} />
                    <span className="truncate font-bold" style={{ fontSize: `${listFontSize}px` }}>
                      {stockListNode.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs ${
                      activeCategory === stockListNode.id
                        ? 'text-accent-text font-bold bg-current/15'
                        : 'text-text-dim group-hover/stock:text-text-normal'
                    }`}>
                      [{stockListNode.totalCount}]
                    </span>
                  </div>
                </div>
              )}

              {/* 新規カテゴリー追加インラインフォーム (Escキー・✕ボタンでキャンセル可能) */}
              {isAddingStockSubCat && (
                <form 
                  onSubmit={handleAddStockCategory} 
                  className="flex items-center gap-1 p-1 bg-panel-bg border border-border-main rounded-2xs animate-in fade-in duration-100"
                >
                  <input
                    autoFocus
                    type="text"
                    value={newStockSubCatName}
                    onChange={e => setNewStockSubCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setIsAddingStockSubCat(false);
                        setNewStockSubCatName('');
                      }
                    }}
                    placeholder={language === 'JP' ? 'カテゴリー名 (Escでキャンセル)' : 'Category name (Esc to cancel)...'}
                    className="flex-1 min-w-0 h-6 px-1.5 text-[9.5px] bg-base-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light"
                  />
                  <button 
                    type="submit" 
                    className="h-6 px-2 text-[9.5px] bg-accent-bg border border-accent-bg text-white hover:brightness-110 shrink-0 font-bold rounded-2xs cursor-pointer shadow-2xs"
                    title={language === 'JP' ? '作成' : 'Add'}
                  >
                    +
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingStockSubCat(false);
                      setNewStockSubCatName('');
                    }}
                    className="h-6 px-1.5 text-[9.5px] bg-base-bg border border-border-main text-text-dim hover:text-text-bright hover:bg-border-main/20 shrink-0 rounded-2xs cursor-pointer transition-colors"
                    title={language === 'JP' ? 'キャンセル (やめる)' : 'Cancel'}
                  >
                    <X size={10} />
                  </button>
                </form>
              )}

              {/* ストックリスト配下カテゴリー一覧 (Google Keep風、D&D並び替え可能) */}
              {stockListNode && stockListNode.children.length > 0 ? (
                <div className="flex flex-col gap-0.5 pl-1 border-l-2 border-accent-text/30 ml-2 mt-0.5">
                  {stockListNode.children.map(child => renderNode(child, true))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-dim text-[10px] font-mono flex flex-col items-center gap-1.5">
                  <span>{language === 'JP' ? 'ストックリスト内カテゴリーがありません' : 'NO STOCK CATEGORIES'}</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingStockSubCat(true)}
                    className="text-accent-text hover:underline text-[9.5px]"
                  >
                    + {language === 'JP' ? '最初のカテゴリーを作成' : 'Create first category'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── タブ2: 📑 ブックマーク (大容量アーカイブ階層) ── */}
        {sidebarSection === 'bookmarks' && (
          <div className="flex flex-col flex-1 min-h-0 mt-1 gap-1.5">
            {/* 新規ルートディレクトリ追加 & 展開・折りたたみ & フォルダ管理 */}
            {!isAddingRoot ? (
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={() => setIsAddingRoot(true)}
                  className="flex-1 min-w-0 h-7 flex items-center justify-center gap-1.5 border border-border-light hover:bg-border-main text-text-bright transition-colors text-[10px] font-medium tracking-wider"
                >
                  <Plus size={12} /> {t.newDir}
                </button>
                <div className="flex gap-1 shrink-0">
                  {onOpenFolderManager && (
                    <button
                      type="button"
                      onClick={onOpenFolderManager}
                      className={`h-7 px-2.5 border text-[9px] font-mono tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                        isFolderManagerActive
                          ? 'border-accent-text bg-accent-bg text-accent-text font-bold'
                          : 'border-border-main hover:border-border-light text-text-dim hover:text-text-bright'
                      }`}
                      title={language === 'JP' ? 'メイン画面でフォルダー管理・並び替えを開く' : 'Open Folder Manager in Main View'}
                    >
                      <FolderTree size={12} />
                      <span className="font-bold">{language === 'JP' ? 'フォルダ管理' : 'MGR'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (expandedIds.size > 0) {
                        collapseAll();
                      } else {
                        expandAll();
                      }
                    }}
                    className="h-7 px-2 border border-border-main hover:border-border-light text-text-dim hover:text-text-bright text-[9px] cursor-pointer flex items-center justify-center shrink-0"
                    title={expandedIds.size > 0 ? (language === 'JP' ? 'すべてのフォルダを閉じる' : 'Collapse All') : (language === 'JP' ? 'すべてのフォルダを開く' : 'Expand All')}
                  >
                    {expandedIds.size > 0 ? <ChevronsUp size={12} /> : <ChevronsDown size={12} />}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddRoot} className="flex items-center gap-1 shrink-0">
                <input
                  autoFocus
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setIsAddingRoot(false);
                      setNewCatName('');
                    }
                  }}
                  placeholder={`${t.dirName} (Escでキャンセル)`}
                  className="flex-1 min-w-0 h-7 px-2 bg-base-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[10px]"
                />
                <button 
                  type="submit" 
                  className="h-7 px-2.5 bg-accent-bg border border-accent-bg text-white hover:brightness-110 transition-colors text-[10px] shrink-0 font-bold rounded-2xs cursor-pointer shadow-2xs"
                  title={language === 'JP' ? '作成' : 'Add'}
                >
                  +
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddingRoot(false);
                    setNewCatName('');
                  }}
                  className="h-7 px-2 bg-base-bg border border-border-main text-text-dim hover:text-text-bright hover:bg-border-main/20 transition-colors text-[10px] shrink-0 rounded-2xs cursor-pointer"
                  title={language === 'JP' ? 'キャンセル (やめる)' : 'Cancel'}
                >
                  <X size={11} />
                </button>
              </form>
            )}

            {/* フォルダ検索フィルター（大量フォルダの即時絞り込み） */}
            <div className="relative flex items-center shrink-0">
              <input
                type="text"
                value={folderSearchQuery}
                onChange={e => setFolderSearchQuery(e.target.value)}
                placeholder={t.filterFolders}
                className="w-full h-7 pl-7 pr-6 bg-base-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[10px]"
              />
              <Search size={11} className="absolute left-2 text-text-dim pointer-events-none" />
              {folderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFolderSearchQuery('')}
                  className="absolute right-1.5 text-text-dim hover:text-text-bright p-0.5"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* フォルダツリー一覧（一般フォルダー階層：縦・横スクロール両対応） */}
            <div 
              ref={treeScrollContainerRef}
              onScroll={(e) => {
                const { scrollTop, scrollLeft } = e.currentTarget;
                localStorage.setItem('sidebar_scroll_top', String(scrollTop));
                localStorage.setItem('sidebar_scroll_left', String(scrollLeft));
              }}
              className="flex flex-col gap-0.5 mt-0.5 flex-1 overflow-y-auto overflow-x-auto pr-1"
            >
              {filteredTree.length === 0 ? (
                <div className="text-[10px] text-text-dim text-center py-6">
                  {folderSearchQuery ? 'NO MATCHING DIRECTORIES' : 'NO DIRECTORIES'}
                </div>
              ) : (
                filteredTree.map(rootNode => renderNode(rootNode))
              )}
            </div>

            {/* 未割り当て (カオルさまご指定: 一番下に配置) */}
            {unassignedCount > 0 && (
              <div className="pt-1.5 border-t border-border-main/40 shrink-0">
                <button 
                  type="button"
                  onClick={() => onSelectCategory('__UNASSIGNED__')}
                  onDragOver={(e) => handleFolderDragOver(e, '__UNASSIGNED__', false)}
                  onDragLeave={(e) => handleFolderDragLeave(e, '__UNASSIGNED__')}
                  onDrop={(e) => handleFolderDrop(e, '__UNASSIGNED__', false)}
                  className={`w-full min-h-[26px] py-1 flex items-center justify-between px-2.5 border transition-colors cursor-pointer rounded-xs ${
                    dragOverCatId === '__UNASSIGNED__'
                      ? 'border-accent-text border-dashed bg-accent-bg/40 text-accent-text font-bold ring-1 ring-accent-text'
                      : activeCategory === '__UNASSIGNED__' 
                        ? 'border-border-light bg-accent-bg text-accent-text font-bold shadow-sm' 
                        : 'border-border-main/30 bg-base-bg/50 text-text-normal hover:text-text-bright hover:bg-border-main/30'
                  }`}
                >
                  <span className={`italic truncate ${activeCategory === '__UNASSIGNED__' ? 'text-accent-text font-bold' : ''}`} style={{ fontSize: `${listFontSize}px` }}>{t.unassigned}</span>
                  <span className={`text-[9px] font-mono shrink-0 ml-1 ${activeCategory === '__UNASSIGNED__' ? 'text-accent-text font-bold bg-current/15 px-1.5 py-0.5 rounded-xs' : 'opacity-80'}`}>[{unassignedCount}]</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ディレクトリ数カウンター & 幅調整ヒント */}
        <div className="pt-1.5 mt-auto border-t border-border-main text-[9px] flex justify-between text-text-normal font-medium shrink-0">
          <span>{t.dirCount}:</span>
          <span className="text-text-bright font-mono">{categories.length}</span>
        </div>

        {/* 画面下部コマンドバー (画像 2026y10m28d_115917750_6342ad3f.png に一致する横並び＆上開きポップオーバー) */}
        <div ref={bottomToolbarRef} className="relative mt-2 pt-1.5 border-t border-border-main shrink-0">
          {/* 上向きポップオーバーメニュー */}
          {activeBottomTab === 'data' && (
            <div className="absolute bottom-full mb-1.5 left-0 w-full z-50 bg-panel-bg border-2 border-border-light shadow-2xl p-2.5 rounded-xs flex flex-col gap-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border-main pb-1 text-[10px] font-bold text-text-bright">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="text-accent-text" />
                  <span>{t.dataManagement}</span>
                </span>
                <button type="button" onClick={() => setActiveBottomTab(null)} className="text-text-dim hover:text-text-bright p-0.5">
                  <X size={12} />
                </button>
              </div>

              <div className="bg-base-bg p-1.5 border border-border-main text-[8.5px] text-text-dim flex flex-col gap-0.5">
                <div className="flex justify-between font-bold text-text-bright">
                  <span>{language === 'JP' ? '自動レジューム (AUTO RESUME)' : 'AUTO RESUME'}</span>
                  <span className="text-accent-text font-mono">[ ACTIVE ]</span>
                </div>
                <p className="leading-tight">
                  {language === 'JP'
                    ? 'アプリ起動時に保存状態を自動ロードします。PC版Google Driveアプリの同期フォルダ内のバックアップJSONも手動/自動で連携・読み込み可能です。'
                    : 'Auto-restores saved data on app start. Compatible with Google Drive Desktop sync folders.'}
                </p>
              </div>

              <div className="flex flex-col gap-1 text-[9.5px]">
                <button 
                  onClick={() => { onExportJson(); setActiveBottomTab(null); }} 
                  className="w-full h-6.5 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-border-main/50 transition-colors cursor-pointer"
                >
                  <Download size={11} className="shrink-0 text-accent-text" /> 
                  <span className="truncate">{t.exportJson}</span>
                </button>
                
                <button 
                  onClick={() => { jsonInputRef.current?.click(); setActiveBottomTab(null); }} 
                  className="w-full h-6.5 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-border-main/50 transition-colors cursor-pointer"
                >
                  <FileCode size={11} className="shrink-0 text-accent-text" /> 
                  <span className="truncate">{t.importJson}</span>
                </button>
                
                <button 
                  onClick={() => { htmlInputRef.current?.click(); setActiveBottomTab(null); }} 
                  className="w-full h-6.5 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-border-main/50 transition-colors cursor-pointer"
                >
                  <Upload size={11} className="shrink-0 text-accent-text" /> 
                  <span className="truncate">{t.importHtml}</span>
                </button>

                {onResetAllData && (
                  <button 
                    onClick={() => { onResetAllData(); setActiveBottomTab(null); }} 
                    className="w-full h-6.5 flex items-center justify-start px-2 gap-2 border border-red-900/40 text-red-300 font-medium bg-red-950/20 hover:bg-red-900/40 hover:border-red-500 transition-colors mt-0.5 cursor-pointer"
                    title={t.clearAllData}
                  >
                    <RotateCcw size={11} className="shrink-0" /> 
                    <span className="truncate">{t.clearAllData}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeBottomTab === 'color' && (
            <div className="absolute bottom-full mb-1.5 left-0 w-full z-50 bg-panel-bg border-2 border-border-light shadow-2xl p-2.5 rounded-xs flex flex-col gap-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border-main pb-1 text-[10px] font-bold text-text-bright">
                <span className="flex items-center gap-1.5">
                  <Palette size={12} className="text-accent-text" />
                  <span>{language === 'JP' ? 'カード・リスト配色設定' : 'COLOR TAG SETTINGS'}</span>
                </span>
                <button type="button" onClick={() => setActiveBottomTab(null)} className="text-text-dim hover:text-text-bright p-0.5">
                  <X size={12} />
                </button>
              </div>

              {/* カードとリストのカラー反映 ON/OFF（全体のカラー反映） */}
              {onToggleShowColors && (
                <button
                  type="button"
                  onClick={onToggleShowColors}
                  className="w-full h-6.5 px-2 flex items-center justify-between border border-border-main bg-base-bg hover:bg-border-main/50 text-[9px] font-bold cursor-pointer transition-colors rounded-xs"
                  title={language === 'JP' ? 'カードとリスト全体のカラー反映のオン/オフ' : 'Toggle Card & List Color Reflection'}
                >
                  <span className="flex items-center gap-1.5 text-text-bright">
                    <Palette size={11} className="text-accent-text" />
                    <span>{language === 'JP' ? 'カードとリストのカラー反映' : 'Card & List Color Reflection'}</span>
                  </span>
                  <span className={`w-20 inline-block text-center py-0.2 rounded-xs font-mono text-[8.5px] ${
                    showColors ? 'bg-accent-bg text-accent-text font-bold' : 'bg-border-main text-text-dim'
                  }`}>
                    {showColors ? (language === 'JP' ? 'ON (表示)' : 'ON') : (language === 'JP' ? 'OFF (非表示)' : 'OFF')}
                  </span>
                </button>
              )}

              <p className="text-[8.5px] text-text-dim leading-tight">
                {language === 'JP' 
                  ? 'カードや項目に割り当てる配色ラベルの名前を編集できます:' 
                  : 'Customize color tag labels for cards:'}
              </p>

              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                {(colorPresets || []).filter(p => p.id !== 'none').map(preset => {
                  const isEditing = editingPresetId === preset.id;
                  return (
                    <div key={preset.id} className="flex items-center justify-between gap-1.5 p-1 bg-base-bg border border-border-main rounded-xs text-[9.5px]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 border border-black/30 shadow-xs" 
                          style={{ backgroundColor: preset.color }}
                        />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            className="flex-1 h-5 px-1 bg-panel-bg border border-border-light text-text-bright text-[9px] outline-none font-sans"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate text-text-normal font-medium">{preset.name}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (editingPresetName.trim() && onUpdateColorPresets && colorPresets) {
                                const updated = colorPresets.map(p => p.id === preset.id ? { ...p, name: editingPresetName.trim() } : p);
                                onUpdateColorPresets(updated);
                              }
                              setEditingPresetId(null);
                            }}
                            className="p-1 bg-accent-bg text-accent-text hover:opacity-90 rounded-xs text-[8.5px] font-bold cursor-pointer"
                            title={language === 'JP' ? '保存' : 'Save'}
                          >
                            <Check size={10} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPresetId(preset.id);
                              setEditingPresetName(preset.name);
                            }}
                            className="p-1 text-text-dim hover:text-text-bright cursor-pointer"
                            title={language === 'JP' ? '名前を編集' : 'Edit label'}
                          >
                            <Pencil size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 色全体を一括リセット（消去）ボタン */}
              {onResetAllColors && (
                <button
                  type="button"
                  onClick={() => {
                    onResetAllColors();
                    setActiveBottomTab(null);
                  }}
                  className="w-full h-6.5 flex items-center justify-center gap-1.5 border border-red-900/40 text-red-300 font-bold bg-red-950/20 hover:bg-red-900/40 hover:border-red-500 transition-colors mt-0.5 cursor-pointer text-[9.5px] rounded-xs"
                  title={language === 'JP' ? 'すべてのブックマークの配色を一括消去・リセット' : 'Reset all item colors'}
                >
                  <RotateCcw size={11} className="shrink-0" />
                  <span>{language === 'JP' ? '全項目の色を一括リセット (消去)' : 'RESET ALL ITEM COLORS'}</span>
                </button>
              )}
            </div>
          )}

          {activeBottomTab === 'stock' && (
            <div className="absolute bottom-full mb-1.5 left-0 w-full z-50 bg-panel-bg border-2 border-border-light shadow-2xl p-2.5 rounded-xs flex flex-col gap-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border-main pb-1 text-[10px] font-bold text-text-bright">
                <span className="flex items-center gap-1.5">
                  <Star size={12} className="text-amber-400 fill-current" />
                  <span>{language === 'JP' ? 'ストックリスト専用ツール (STOCK)' : 'STOCK LIST TOOLS'}</span>
                </span>
                <button type="button" onClick={() => setActiveBottomTab(null)} className="text-text-dim hover:text-text-bright p-0.5">
                  <X size={12} />
                </button>
              </div>

              <p className="text-[8.5px] text-text-dim leading-tight">
                {language === 'JP' 
                  ? '日々の作業用ストックリスト（日常管理）の差分比較インポートや個別バックアップが行えます。' 
                  : 'Manage daily stock list with diff comparison import and dedicated backup.'}
              </p>

              <div className="flex flex-col gap-1 text-[9.5px]">
                {onOpenStockImport && (
                  <button 
                    onClick={() => { onOpenStockImport(); setActiveBottomTab(null); }} 
                    className="w-full h-7 flex items-center justify-start px-2 gap-2 border border-accent-text bg-accent-bg/40 text-accent-text font-bold hover:bg-accent-bg transition-colors cursor-pointer"
                  >
                    <Download size={11} className="shrink-0" /> 
                    <span className="truncate">{language === 'JP' ? 'ストックリスト 比較インポート (JSON)' : 'Stock List Import Comparison'}</span>
                  </button>
                )}

                {onExportStockJson && (
                  <button 
                    onClick={() => { onExportStockJson(); setActiveBottomTab(null); }} 
                    className="w-full h-6.5 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-border-main/50 transition-colors cursor-pointer"
                  >
                    <FileCode size={11} className="shrink-0 text-accent-text" /> 
                    <span className="truncate">{language === 'JP' ? 'ストックリストのみバックアップ (JSON)' : 'Export Stock List Only'}</span>
                  </button>
                )}

                {onOpenBookmarklet && (
                  <button 
                    onClick={() => { onOpenBookmarklet(); setActiveBottomTab(null); }} 
                    className="w-full h-6.5 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-border-main/50 transition-colors cursor-pointer mt-0.5"
                  >
                    <Bookmark size={11} className="shrink-0 text-amber-400" /> 
                    <span className="truncate">{language === 'JP' ? 'ワンクリック保存 Bookmarklet コード' : 'Bookmarklet Code'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 横並びコマンドボタンバー (画像 2026y10m28d_115917750_6342ad3f.png に完全一致) */}
          <div className="flex items-center justify-between gap-1 bg-base-bg border border-border-main p-1 font-mono text-[9.5px]">
            {/* >_ 03 DATA */}
            <button
              type="button"
              onClick={() => setActiveBottomTab(prev => prev === 'data' ? null : 'data')}
              className={`flex items-center gap-1 px-1.5 py-1 border transition-colors cursor-pointer ${
                activeBottomTab === 'data'
                  ? 'border-accent-text bg-accent-bg text-accent-text font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright hover:bg-panel-bg'
              }`}
              title={t.dataManagement}
            >
              <Terminal size={11} className="shrink-0" />
              <span className="font-bold">03 DATA</span>
            </button>

            {/* COLOR */}
            <button
              type="button"
              onClick={() => setActiveBottomTab(prev => prev === 'color' ? null : 'color')}
              className={`flex items-center gap-1 px-1.5 py-1 border transition-colors cursor-pointer ${
                activeBottomTab === 'color'
                  ? 'border-accent-text bg-accent-bg text-accent-text font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright hover:bg-panel-bg'
              }`}
              title={language === 'JP' ? '色管理・配色設定' : 'Color Tag Settings'}
            >
              <Palette size={11} className="shrink-0 text-accent-text" />
              <span className="font-bold">COLOR</span>
            </button>

            {/* STOCK count */}
            <button
              type="button"
              onClick={() => setActiveBottomTab(prev => prev === 'stock' ? null : 'stock')}
              className={`flex items-center gap-1 px-1.5 py-1 border transition-colors cursor-pointer ${
                activeBottomTab === 'stock'
                  ? 'border-accent-text bg-accent-bg text-accent-text font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright hover:bg-panel-bg'
              }`}
              title={language === 'JP' ? 'ワンクリック保存 Bookmarklet' : '1-Click Bookmarklet'}
            >
              <Zap size={11} className="shrink-0 text-amber-400" />
              <span className="font-bold">STOCK</span>
              <span className="text-[8.5px] px-1 py-0.2 bg-border-main text-text-bright font-bold rounded-xs">
                {notebooks.length}
              </span>
            </button>

            {/* + Folder */}
            <button
              type="button"
              onClick={() => setIsAddingRoot(true)}
              className="p-1 text-text-dim hover:text-text-bright hover:bg-panel-bg border border-transparent transition-colors cursor-pointer"
              title={t.newDir}
            >
              <Plus size={12} />
            </button>

            {/* :: Menu icon */}
            <button
              type="button"
              onClick={() => setActiveBottomTab(prev => prev ? null : 'data')}
              className="p-1 text-text-dim hover:text-text-bright hover:bg-panel-bg border border-transparent transition-colors cursor-pointer"
              title={t.dataManagement}
            >
              <GripVertical size={12} />
            </button>
          </div>

          <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={e => handleFileChange(e, 'json')} />
          <input type="file" accept=".html,.htm" className="hidden" ref={htmlInputRef} onChange={e => handleFileChange(e, 'html')} />
        </div>
      </div>
      
      <div className="text-[8.5px] text-text-dim/50 mt-auto shrink-0 flex justify-between">
        <span>{t.systemReady}</span>
        <span className="font-mono text-text-dim/40">{sidebarWidth}px</span>
      </div>
    </aside>
  );
}
