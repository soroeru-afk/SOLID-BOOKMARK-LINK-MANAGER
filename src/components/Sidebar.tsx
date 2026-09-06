import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutGrid, Folders, Plus, Folder, FolderOpen, 
  Download, Upload, FileCode, Pencil, Trash2, RotateCcw,
  ChevronRight, ChevronDown, ChevronsUpDown, FolderTree, Search, X
} from 'lucide-react';
import { Category, Notebook } from '../types';
import { Language, i18n } from '../i18n';

interface Props {
  categories: Category[];
  notebooks: Notebook[];
  onAddCategory: (name: string, parentId?: string | null) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  activeCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  language: Language;
  onExportJson: () => void;
  onImportJson: (content: string) => void;
  onImportHtml: (content: string) => void;
  onResetAllData?: () => void;
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
  language, 
  onExportJson, 
  onImportJson, 
  onImportHtml,
  onResetAllData
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
  
  // 展開中のカテゴリIDセット
  // 初期状態はすべて折りたたまれた状態にし、クリックした階層だけを順次開いていく
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const isResizingRef = useRef(false);
  const t = i18n[language];

  // activeCategory が変更された際、その先祖フォルダを自動展開して迷子を防止
  useEffect(() => {
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
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(moveEvent.clientX, MAX_SIDEBAR_WIDTH));
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

  // フォルダ検索フィルター
  const filteredTree = useMemo(() => {
    if (!folderSearchQuery.trim()) {
      return categoryTree;
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
    for (const root of categoryTree) {
      const filteredRoot = filterNode(root);
      if (filteredRoot) {
        result.push(filteredRoot);
      }
    }
    return result;
  }, [categoryTree, folderSearchQuery]);

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
  const renderNode = (node: CategoryTreeNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isActive = activeCategory === node.id;
    const isEditing = editingCatId === node.id;

    // スリムなインデント計算 (1階層あたり10px)
    const indentPx = node.level * 10 + 4;

    return (
      <div key={node.id} className="flex flex-col min-w-full">
        <div 
          className={`group/cat flex items-center h-8 pr-1.5 text-[11px] border transition-colors select-none ${
            isActive 
              ? 'border-border-light bg-border-main text-text-bright font-semibold' 
              : 'border-transparent text-text-normal hover:text-text-bright hover:bg-border-main/30'
          }`}
          style={{ paddingLeft: `${indentPx}px` }}
        >
          {/* トグル展開アイコン */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center text-text-dim hover:text-text-bright shrink-0 mr-0.5"
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
              if (hasChildren) setExpandedIds(prev => new Set(prev).add(node.id));
            }}
          >
            {isExpanded && hasChildren ? (
              <FolderOpen size={13} className={isActive ? 'text-text-bright' : 'text-text-normal group-hover/cat:text-text-bright'} />
            ) : (
              <Folder size={13} className={isActive ? 'text-text-bright' : 'text-text-normal group-hover/cat:text-text-bright'} />
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
              className="min-w-0 flex-1 h-6 px-1.5 bg-base-bg border border-border-light text-text-bright focus:outline-none text-[11px]"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                onSelectCategory(node.id);
                if (hasChildren) setExpandedIds(prev => new Set(prev).add(node.id));
              }}
              className="min-w-0 flex-1 text-left truncate cursor-pointer font-medium tracking-wide text-text-normal group-hover/cat:text-text-bright"
              title={`${node.name}\nパス: ${node.path || node.name}`}
            >
              {node.name}
            </button>
          )}

          {/* 件数バッジ */}
          <span className="text-[9px] text-text-dim group-hover/cat:text-text-normal ml-1.5 px-1 shrink-0 font-mono">
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
                className="text-text-dim hover:text-text-bright p-0.5"
                title={language === 'JP' ? 'サブフォルダを追加' : 'Add Subfolder'}
              >
                <Plus size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => startEditCategory(e, node)}
                className="text-text-dim hover:text-text-bright p-0.5"
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

        {/* サブフォルダ追加フォーム */}
        {addingParentId === node.id && (
          <form 
            onSubmit={(e) => handleAddSub(e, node.id)} 
            className="flex gap-1 my-1" 
            style={{ paddingLeft: `${indentPx + 14}px` }}
          >
            <input
              autoFocus
              type="text"
              value={newSubCatName}
              onChange={e => setNewSubCatName(e.target.value)}
              onBlur={() => { if (!newSubCatName) setAddingParentId(null); }}
              placeholder={t.dirName}
              className="flex-1 min-w-0 h-6 px-1.5 text-[10px] bg-base-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light"
            />
            <button type="submit" className="h-6 px-2 text-[10px] bg-border-light text-text-bright hover:bg-accent-bg shrink-0">
              +
            </button>
          </form>
        )}

        {/* 子要素レンダリング */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col border-l border-border-main/25 ml-2.5">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      style={{ width: `${sidebarWidth}px` }}
      className="relative shrink-0 h-full border-r border-border-main bg-base-bg flex flex-col p-4 gap-3 z-20 select-none transition-none overflow-hidden"
    >
      {/* ドラッグリサイズ用の境界バー */}
      <div
        onMouseDown={handleMouseDownResizer}
        onDoubleClick={handleDoubleClickResizer}
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-border-light/70 transition-colors z-30 ${
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
      <div className="border border-border-main bg-panel-bg p-2.5 relative flex flex-col shrink-0">
        <div className="absolute top-0 left-0 bg-base-bg px-2 -mt-[0.55rem] ml-3 text-[9px] text-text-dim font-bold">
          {t.systemStatus}
        </div>
        <div className="flex flex-col gap-1 text-[10px] text-text-dim mt-0.5">
          <div className="flex justify-between">
            <span>{t.coreNode}</span>
            <span className="text-text-normal">{t.online}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.dbConnection}</span>
            <span className="text-text-normal">{t.established}</span>
          </div>
        </div>
      </div>

      {/* ディレクトリ一覧パネル */}
      <div className="border border-border-main bg-panel-bg p-2.5 relative flex flex-col flex-1 min-h-[300px] overflow-hidden">
        <div className="absolute top-0 left-0 bg-base-bg px-2 -mt-[0.55rem] ml-3 text-[9px] text-text-dim font-bold">
          {t.directorySets}
        </div>
        
        {/* 新規ディレクトリ追加 & 展開・折りたたみ操作 */}
        <div className="mt-1 flex flex-col gap-1.5 shrink-0">
          {!isAddingRoot ? (
            <div className="flex gap-1.5">
              <button 
                onClick={() => setIsAddingRoot(true)}
                className="flex-1 min-w-0 h-7 flex items-center justify-center gap-1.5 border border-border-light hover:bg-border-main text-text-bright transition-colors text-[10px] font-medium tracking-wider"
              >
                <Plus size={12} /> {t.newDir}
              </button>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={expandAll}
                  className="h-7 px-2 border border-border-main hover:border-border-light text-text-dim hover:text-text-bright text-[9px]"
                  title={t.expandAll}
                >
                  <FolderTree size={12} />
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="h-7 px-2 border border-border-main hover:border-border-light text-text-dim hover:text-text-bright text-[9px]"
                  title={t.collapseAll}
                >
                  <ChevronsUpDown size={12} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddRoot} className="flex gap-1.5">
              <input
                autoFocus
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onBlur={() => { if (!newCatName) setIsAddingRoot(false); }}
                placeholder={t.dirName}
                className="w-full h-7 px-2 bg-base-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[10px]"
              />
              <button type="submit" className="h-7 px-2.5 bg-border-light text-text-bright hover:bg-accent-bg hover:text-accent-text transition-colors text-[10px] shrink-0">
                +
              </button>
            </form>
          )}

          {/* フォルダ検索フィルター（大量フォルダの即時絞り込み） */}
          <div className="relative flex items-center">
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

          {/* すべてのデータ & 未割り当て */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <button 
              onClick={() => onSelectCategory(null)}
              className={`w-full h-7 flex items-center justify-between px-2.5 border ${
                activeCategory === null 
                  ? 'border-border-light bg-border-main text-text-bright font-semibold' 
                  : 'border-transparent text-text-normal hover:text-text-bright hover:bg-border-main/30'
              } transition-colors text-[11px] cursor-pointer`}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <Folders size={13} className="shrink-0" />
                <span className="font-bold truncate">[ {t.allData} ]</span>
              </div>
              <span className="text-[9px] font-mono opacity-80 shrink-0 ml-1">[{notebooks.length}]</span>
            </button>

            {unassignedCount > 0 && (
              <button 
                onClick={() => onSelectCategory('__UNASSIGNED__')}
                className={`w-full h-6 flex items-center justify-between px-2.5 border ${
                  activeCategory === '__UNASSIGNED__' 
                    ? 'border-border-light bg-border-main text-text-bright font-semibold' 
                    : 'border-transparent text-text-normal hover:text-text-bright hover:bg-border-main/30'
                } transition-colors text-[10px] cursor-pointer`}
              >
                <span className="italic truncate">{t.unassigned}</span>
                <span className="text-[9px] font-mono opacity-80 shrink-0 ml-1">[{unassignedCount}]</span>
              </button>
            )}
          </div>
        </div>

        {/* フォルダツリー一覧（縦・横スクロール両対応） */}
        <div className="flex flex-col gap-0.5 mt-1 flex-1 overflow-y-auto overflow-x-auto pr-1">
          {filteredTree.length === 0 ? (
            <div className="text-[10px] text-text-dim text-center py-6">
              {folderSearchQuery ? 'NO MATCHING DIRECTORIES' : 'NO DIRECTORIES'}
            </div>
          ) : (
            filteredTree.map(rootNode => renderNode(rootNode))
          )}
        </div>

        {/* ディレクトリ数カウンター & 幅調整ヒント */}
        <div className="pt-1.5 mt-auto border-t border-border-main text-[9px] flex justify-between text-text-normal font-medium shrink-0">
          <span>{t.dirCount}:</span>
          <span className="text-text-bright font-mono">{categories.length}</span>
        </div>

        {/* データ管理 (JSON / HTML) */}
        <div className="mt-2 pt-2 border-t border-border-main flex flex-col gap-1 shrink-0">
          <div className="text-[9px] text-text-normal font-bold tracking-wider mb-0.5">{t.dataManagement}</div>
          
          <button 
            onClick={onExportJson} 
            className="w-full h-6 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-panel-bg hover:border-border-light transition-colors text-[9px] cursor-pointer"
          >
            <Download size={11} className="shrink-0" /> <span className="truncate">{t.exportJson}</span>
          </button>
          
          <button 
            onClick={() => jsonInputRef.current?.click()} 
            className="w-full h-6 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-panel-bg hover:border-border-light transition-colors text-[9px] cursor-pointer"
          >
            <FileCode size={11} className="shrink-0" /> <span className="truncate">{t.importJson}</span>
          </button>
          
          <button 
            onClick={() => htmlInputRef.current?.click()} 
            className="w-full h-6 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-panel-bg hover:border-border-light transition-colors text-[9px] cursor-pointer"
          >
            <Upload size={11} className="shrink-0" /> <span className="truncate">{t.importHtml}</span>
          </button>

          {onResetAllData && (
            <button 
              onClick={onResetAllData} 
              className="w-full h-6 flex items-center justify-start px-2 gap-2 border border-border-main text-text-normal font-medium bg-base-bg hover:text-text-bright hover:bg-panel-bg hover:border-border-light transition-colors text-[9px] mt-0.5 cursor-pointer"
              title={t.clearAllData}
            >
              <RotateCcw size={11} className="shrink-0" /> <span className="truncate">{t.clearAllData}</span>
            </button>
          )}
          
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
