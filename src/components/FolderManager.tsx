import React, { useState, useMemo } from 'react';
import { Category, Notebook } from '../types';
import { Language, i18n } from '../i18n';
import { getHierarchicalCategories, getCategoryIndentedLabel } from '../utils/categoryUtils';
import { 
  FolderTree, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ChevronsUp, 
  ChevronsDown, 
  Search, 
  FolderInput, 
  ExternalLink, 
  Check, 
  X, 
  Layers,
  ArrowUpDown,
  CornerDownRight,
  FolderPlus,
  GripVertical
} from 'lucide-react';

interface Props {
  categories: Category[];
  notebooks: Notebook[];
  onAddCategory: (name: string, parentId?: string | null) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onChangeParentCategory: (id: string, newParentId: string | null) => void;
  onMoveCategoryOrder: (id: string, direction: 'top' | 'up' | 'down' | 'bottom') => void;
  onReorderCategorySiblings?: (parentId: string | null, sourceIndex: number, targetIndex: number) => void;
  onSortCategorySiblings: (parentId: string | null, mode: 'name-asc' | 'count-desc') => void;
  onSelectCategory: (id: string) => void;
  onClose: () => void;
  language: Language;
}

export interface FolderTreeNode extends Category {
  level: number;
  children: FolderTreeNode[];
  directCount: number;
  totalCount: number;
  siblingIndex: number;
  siblingTotal: number;
}

export const FolderManager: React.FC<Props> = ({
  categories,
  notebooks,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onChangeParentCategory,
  onMoveCategoryOrder,
  onReorderCategorySiblings,
  onSortCategorySiblings,
  onSelectCategory,
  onClose,
  language
}) => {
  const t = i18n[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'root' | 'sub'>('all');
  
  // 展開中の親カテゴリID（初期状態：全展開）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(categories.map(c => c.id)));
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Parent changing state
  const [changingParentId, setChangingParentId] = useState<string | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');

  // Adding subfolder state
  const [addingSubParentId, setAddingSubParentId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Adding root folder state
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 同一階層ドラッグ＆ドロップ用ステート
  const [draggedNode, setDraggedNode] = useState<{ id: string; parentId: string | null; siblingIndex: number } | null>(null);
  const [dragOverSiblingId, setDragOverSiblingId] = useState<string | null>(null);

  // Compute direct and total bookmark counts
  const directCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const nb of notebooks) {
      if (nb.categoryId) {
        map.set(nb.categoryId, (map.get(nb.categoryId) || 0) + 1);
      }
    }
    return map;
  }, [notebooks]);

  // Compute full hierarchical tree preserving custom order
  const { tree, flatList, descendantMap } = useMemo(() => {
    const nodeMap = new Map<string, FolderTreeNode>();
    
    // First pass: create nodes
    for (const c of categories) {
      const dCount = directCounts.get(c.id) || 0;
      nodeMap.set(c.id, {
        ...c,
        level: 0,
        children: [],
        directCount: dCount,
        totalCount: dCount,
        siblingIndex: 0,
        siblingTotal: 0,
      });
    }

    // Build hierarchy
    const roots: FolderTreeNode[] = [];
    for (const c of categories) {
      const node = nodeMap.get(c.id)!;
      if (c.parentId && nodeMap.has(c.parentId)) {
        nodeMap.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Assign sibling indexes and update totals
    const descMap = new Map<string, Set<string>>();

    function updateTree(node: FolderTreeNode, lvl: number): { total: number; allDescendants: Set<string> } {
      node.level = lvl;
      let total = node.directCount;
      const descendants = new Set<string>([node.id]);

      const childCount = node.children.length;
      node.children.forEach((child, idx) => {
        child.siblingIndex = idx;
        child.siblingTotal = childCount;
        const res = updateTree(child, lvl + 1);
        total += res.total;
        res.allDescendants.forEach(id => descendants.add(id));
      });

      node.totalCount = total;
      descMap.set(node.id, descendants);
      return { total, allDescendants: descendants };
    }

    const rootCount = roots.length;
    roots.forEach((root, idx) => {
      root.siblingIndex = idx;
      root.siblingTotal = rootCount;
      updateTree(root, 0);
    });

    // Flatten tree respecting expansion state (折りたたまれた親の子孫は非表示にする)
    const flat: FolderTreeNode[] = [];
    function flatten(nodes: FolderTreeNode[]) {
      for (const n of nodes) {
        flat.push(n);
        // 子孫の表示は親が expandedIds に含まれている場合のみ
        if (expandedIds.has(n.id) && n.children.length > 0) {
          flatten(n.children);
        }
      }
    }
    flatten(roots);

    return { tree: roots, flatList: flat, descendantMap: descMap };
  }, [categories, directCounts, expandedIds]);

  // Filtered Tree or List
  const filteredNodes = useMemo(() => {
    let list = flatList;

    if (levelFilter === 'root') {
      list = list.filter(n => n.level === 0);
    } else if (levelFilter === 'sub') {
      list = list.filter(n => n.level > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(n => 
        n.name.toLowerCase().includes(q) || 
        (n.path && n.path.toLowerCase().includes(q))
      );
    }

    return list;
  }, [flatList, levelFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleStartRename = (node: FolderTreeNode) => {
    setEditingId(node.id);
    setEditName(node.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onUpdateCategory(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleAddRootSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRootName.trim()) {
      onAddCategory(newRootName.trim(), null);
      setNewRootName('');
      setIsAddingRoot(false);
    }
  };

  const handleAddSubSubmit = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (newSubName.trim()) {
      onAddCategory(newSubName.trim(), parentId);
      setNewSubName('');
      setAddingSubParentId(null);
      setExpandedIds(prev => new Set(prev).add(parentId));
    }
  };

  const handleOpenParentChanger = (node: FolderTreeNode) => {
    setChangingParentId(node.id);
    setTargetParentId(node.parentId || '__ROOT__');
  };

  const handleSaveParentChange = (id: string) => {
    const newParent = targetParentId === '__ROOT__' ? null : targetParentId;
    onChangeParentCategory(id, newParent);
    setChangingParentId(null);
  };

  const handleSelectAndGo = (id: string) => {
    onSelectCategory(id);
    onClose();
  };

  // 同一階層ドラッグ＆ドロップ処理
  const handleDragStart = (e: React.DragEvent, node: FolderTreeNode) => {
    const payload = {
      id: node.id,
      parentId: node.parentId || null,
      siblingIndex: node.siblingIndex
    };
    setDraggedNode(payload);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'category-sibling-reorder', ...payload }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetNode: FolderTreeNode) => {
    if (!draggedNode) return;
    const sameParent = (draggedNode.parentId || null) === (targetNode.parentId || null);
    if (!sameParent) return; // 同一階層のみ並び替え許可
    if (draggedNode.id === targetNode.id) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSiblingId !== targetNode.id) {
      setDragOverSiblingId(targetNode.id);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetNode: FolderTreeNode) => {
    if (dragOverSiblingId === targetNode.id) {
      setDragOverSiblingId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNode: FolderTreeNode) => {
    e.preventDefault();
    setDragOverSiblingId(null);
    if (!draggedNode) return;

    const sameParent = (draggedNode.parentId || null) === (targetNode.parentId || null);
    if (!sameParent) {
      setDraggedNode(null);
      return;
    }

    if (draggedNode.id !== targetNode.id && onReorderCategorySiblings) {
      onReorderCategorySiblings(draggedNode.parentId, draggedNode.siblingIndex, targetNode.siblingIndex);
    }
    setDraggedNode(null);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDragOverSiblingId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-panel-bg border border-border-main overflow-hidden text-text-normal select-none relative">
      {/* 01 TOP BAR / CONTROLS */}
      <div className="p-3 md:p-4 border-b border-border-main bg-base-bg/60 flex flex-col gap-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-border-main border border-border-light flex items-center justify-center text-accent-text">
              <FolderTree size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[12px] md:text-[13px] text-text-bright tracking-wider">
                  {t.folderManager}
                </h2>
                <span className="font-mono text-[10px] text-accent-text bg-accent-bg px-2 py-0.5 border border-border-light">
                  {categories.length} {language === 'JP' ? 'フォルダ' : 'FOLDERS'}
                </span>
              </div>
              <p className="text-[10px] text-text-dim mt-0.5">
                {language === 'JP' 
                  ? 'フォルダの同階層並び替え（D&D・上下ボタン）・階層移動・親子関係の再編・名称変更を一括管理できます'
                  : 'Manage folder order via Drag & Drop or buttons, deep hierarchies, and naming'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingRoot(true)}
              className="px-3 py-1.5 bg-border-light hover:bg-accent-bg text-text-bright hover:text-accent-text border border-border-light font-bold text-[10px] tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus size={12} />
              <span>{t.newRootFolder}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-panel-bg hover:bg-border-main text-text-bright border border-border-main hover:border-border-light font-bold text-[10px] tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X size={12} />
              <span>{t.backToBookmarks}</span>
            </button>
          </div>
        </div>

        {/* 02 TOOLBAR / SEARCH & QUICK ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Search filter */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'JP' ? 'フォルダ名またはパスで検索...' : 'FILTER FOLDERS BY NAME OR PATH...'}
                className="w-full h-7 pl-7 pr-7 bg-panel-bg border border-border-main text-text-bright text-[10px] placeholder:text-text-dim/60 focus:outline-none focus:border-border-light"
              />
              <Search size={11} className="absolute left-2 top-2 text-text-dim pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-text-dim hover:text-text-bright"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Level filter tabs */}
            <div className="flex border border-border-main bg-panel-bg">
              <button
                type="button"
                onClick={() => setLevelFilter('all')}
                className={`px-2 py-1 text-[9px] font-mono tracking-wider cursor-pointer ${levelFilter === 'all' ? 'bg-accent-bg text-accent-text font-bold' : 'text-text-dim hover:text-text-bright'}`}
              >
                {t.allLevels}
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter('root')}
                className={`px-2 py-1 text-[9px] font-mono tracking-wider cursor-pointer border-l border-border-main ${levelFilter === 'root' ? 'bg-accent-bg text-accent-text font-bold' : 'text-text-dim hover:text-text-bright'}`}
              >
                {t.rootOnly}
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter('sub')}
                className={`px-2 py-1 text-[9px] font-mono tracking-wider cursor-pointer border-l border-border-main ${levelFilter === 'sub' ? 'bg-accent-bg text-accent-text font-bold' : 'text-text-dim hover:text-text-bright'}`}
              >
                {t.subOnly}
              </button>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExpandAll}
              className="h-7 px-2.5 border border-border-main bg-panel-bg hover:border-border-light text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer"
              title={t.expandAll}
            >
              <ChevronsDown size={11} />
              <span>{t.expandAll}</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="h-7 px-2.5 border border-border-main bg-panel-bg hover:border-border-light text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer"
              title={t.collapseAll}
            >
              <ChevronsUp size={11} />
              <span>{t.collapseAll}</span>
            </button>
            <div className="h-4 w-px bg-border-main mx-1" />
            <button
              type="button"
              onClick={() => onSortCategorySiblings(null, 'name-asc')}
              className="h-7 px-2.5 border border-border-main bg-panel-bg hover:border-border-light text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer"
              title={language === 'JP' ? 'ルートフォルダを名前順にソート' : 'SORT ROOTS A-Z'}
            >
              <ArrowUpDown size={11} />
              <span>{t.sortAlphabetical}</span>
            </button>
            <button
              type="button"
              onClick={() => onSortCategorySiblings(null, 'count-desc')}
              className="h-7 px-2.5 border border-border-main bg-panel-bg hover:border-border-light text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer"
              title={language === 'JP' ? 'ルートフォルダを件数順にソート' : 'SORT ROOTS BY COUNT'}
            >
              <Layers size={11} />
              <span>{t.sortByCount}</span>
            </button>
          </div>
        </div>

        {/* Add Root Form Inline */}
        {isAddingRoot && (
          <form onSubmit={handleAddRootSubmit} className="flex gap-2 p-2 bg-panel-bg border border-accent-text/40 animate-in fade-in duration-150">
            <span className="text-[10px] text-accent-text font-bold flex items-center px-1">
              {t.newRootFolder}:
            </span>
            <input
              autoFocus
              type="text"
              value={newRootName}
              onChange={e => setNewRootName(e.target.value)}
              placeholder={t.dirName}
              className="flex-1 h-7 px-2 bg-base-bg border border-border-main text-text-bright text-[10px] focus:outline-none focus:border-border-light"
            />
            <button
              type="submit"
              className="px-3 h-7 bg-accent-bg text-accent-text border border-border-light font-bold text-[10px] cursor-pointer"
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => setIsAddingRoot(false)}
              className="px-3 h-7 bg-transparent border border-border-main text-text-dim hover:text-text-bright text-[10px] cursor-pointer"
            >
              {t.cancel}
            </button>
          </form>
        )}
      </div>

      {/* 03 FOLDER LIST / HIERARCHY TABLE */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 divide-y divide-border-main/40 font-sans">
        {filteredNodes.length === 0 ? (
          <div className="py-16 text-center text-text-dim text-[11px] font-mono">
            {language === 'JP' ? '一致するフォルダが見つかりません' : 'NO MATCHING FOLDERS FOUND'}
          </div>
        ) : (
          filteredNodes.map((node) => {
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedIds.has(node.id);
            const isEditing = editingId === node.id;
            const isChangingParent = changingParentId === node.id;
            const isAddingSub = addingSubParentId === node.id;
            const isConfirmingDelete = confirmDeleteId === node.id;
            const isFirst = node.siblingIndex === 0;
            const isLast = node.siblingIndex === node.siblingTotal - 1;
            const isDragged = draggedNode?.id === node.id;
            const isDragOver = dragOverSiblingId === node.id;

            // Indentation depth
            const indentPadding = node.level * 20;

            // Allowed parent candidates (exclude itself and all its descendants to avoid circular loops)
            const disallowedIds = descendantMap.get(node.id) || new Set([node.id]);
            const parentCandidates = categories.filter(c => !disallowedIds.has(c.id));

            return (
              <div 
                key={node.id} 
                onDragOver={(e) => handleDragOver(e, node)}
                onDragLeave={(e) => handleDragLeave(e, node)}
                onDrop={(e) => handleDrop(e, node)}
                className={`group py-2 px-2 transition-colors flex flex-col gap-2 ${
                  isDragOver
                    ? 'border-2 border-accent-text bg-accent-bg/40 font-bold'
                    : isChangingParent 
                      ? 'bg-accent-bg/20 border-l-2 border-accent-text' 
                      : isDragged 
                        ? 'opacity-40 bg-border-main/30'
                        : 'hover:bg-border-main/20'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Left: Drag Handle, Tree line, Folder Icon, Name & Hierarchy Indicators */}
                  <div className="flex items-center gap-2 min-w-0 flex-1" style={{ paddingLeft: `${indentPadding}px` }}>
                    {/* D&D Reorder Handle (同階層のみ) */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, node)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-text-dim hover:text-accent-text hover:bg-border-main/40 shrink-0 transition-colors"
                      title={t.dragToReorder || 'ドラッグして同階層で並び替え'}
                    >
                      <GripVertical size={13} />
                    </div>

                    {/* Expand/Collapse Chevron if children exist */}
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(node.id)}
                        className="w-5 h-5 flex items-center justify-center text-text-dim hover:text-text-bright shrink-0 cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0 flex items-center justify-center text-text-dim/40">
                        {node.level > 0 ? <CornerDownRight size={11} /> : '•'}
                      </span>
                    )}

                    {/* Depth Level Badge */}
                    <span className="font-mono text-[9px] px-1.5 py-0.5 border border-border-main bg-base-bg text-text-dim shrink-0">
                      LV.{node.level}
                    </span>

                    {/* Folder Icon */}
                    <Folder size={13} className="text-accent-text shrink-0" />

                    {/* Folder Name / Inline Rename Input */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1 max-w-sm">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename(node.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-6 px-1.5 text-[11px] bg-base-bg border border-border-light text-text-bright focus:outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(node.id)}
                          className="h-6 px-2 bg-accent-bg text-accent-text border border-border-light text-[9px] font-bold cursor-pointer"
                        >
                          <Check size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="h-6 px-2 bg-panel-bg text-text-dim border border-border-main text-[9px] cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          onClick={() => handleStartRename(node)}
                          className="font-bold text-[11px] md:text-xs text-text-bright truncate cursor-pointer hover:underline"
                          title={language === 'JP' ? 'クリックして名称変更' : 'Click to rename'}
                        >
                          {node.name}
                        </span>

                        {/* Full Path Breadcrumb (for deep hierarchies) */}
                        {node.level > 0 && node.path && (
                          <span className="text-[9px] text-text-dim truncate max-w-[220px] font-mono hidden sm:inline" title={node.path}>
                            [{node.path}]
                          </span>
                        )}
                      </div>
                    )}

                    {/* Item count pills */}
                    <div className="flex items-center gap-1 font-mono text-[9px] shrink-0 ml-1">
                      <span className="text-text-dim bg-base-bg px-1.5 py-0.5 border border-border-main" title={language === 'JP' ? '直下ブックマーク数' : 'Direct bookmarks'}>
                        {node.directCount}
                      </span>
                      {hasChildren && (
                        <span className="text-accent-text bg-accent-bg px-1.5 py-0.5 border border-border-light" title={language === 'JP' ? '配下を含む全ブックマーク数' : 'Total bookmarks including subfolders'}>
                          Σ {node.totalCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Reorder Buttons, Parent Changer, Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Sibling Index Tag */}
                    <span className="font-mono text-[9px] text-text-dim px-1 hidden md:inline">
                      #{node.siblingIndex + 1}/{node.siblingTotal}
                    </span>

                    {/* 01 Reorder sibling buttons (Industrial style, just like K-Navigator / Music Player) */}
                    <div className="flex items-center border border-border-main bg-base-bg">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => onMoveCategoryOrder(node.id, 'top')}
                        className="px-1.5 py-1 text-[9px] font-mono text-text-dim hover:text-text-bright disabled:opacity-20 disabled:pointer-events-none hover:bg-border-main/50 transition-colors cursor-pointer"
                        title={t.moveTop}
                      >
                        <ChevronsUp size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => onMoveCategoryOrder(node.id, 'up')}
                        className="px-1.5 py-1 text-[9px] font-mono text-text-dim hover:text-text-bright disabled:opacity-20 disabled:pointer-events-none hover:bg-border-main/50 transition-colors border-l border-border-main cursor-pointer"
                        title={t.moveUp}
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => onMoveCategoryOrder(node.id, 'down')}
                        className="px-1.5 py-1 text-[9px] font-mono text-text-dim hover:text-text-bright disabled:opacity-20 disabled:pointer-events-none hover:bg-border-main/50 transition-colors border-l border-border-main cursor-pointer"
                        title={t.moveDown}
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => onMoveCategoryOrder(node.id, 'bottom')}
                        className="px-1.5 py-1 text-[9px] font-mono text-text-dim hover:text-text-bright disabled:opacity-20 disabled:pointer-events-none hover:bg-border-main/50 transition-colors border-l border-border-main cursor-pointer"
                        title={t.moveBottom}
                      >
                        <ChevronsDown size={11} />
                      </button>
                    </div>

                    {/* 02 Change Parent / Hierarchy Re-assign */}
                    <button
                      type="button"
                      onClick={() => handleOpenParentChanger(node)}
                      className="px-2 py-1 border border-border-main bg-base-bg hover:border-border-light text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      title={language === 'JP' ? '親フォルダを変更して階層を移動' : 'Change parent folder'}
                    >
                      <FolderInput size={11} />
                      <span className="hidden sm:inline">{t.changeParent}</span>
                    </button>

                    {/* 03 Add Subfolder */}
                    <button
                      type="button"
                      onClick={() => {
                        setAddingSubParentId(node.id);
                        setNewSubName('');
                      }}
                      className="px-2 py-1 border border-border-main bg-base-bg hover:border-border-light text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      title={language === 'JP' ? 'この配下にサブフォルダを追加' : 'Add subfolder under this'}
                    >
                      <Plus size={11} />
                      <span className="hidden lg:inline">{t.subfolder}</span>
                    </button>

                    {/* 04 Rename */}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartRename(node)}
                        className="p-1 border border-border-main bg-base-bg hover:border-border-light text-text-dim hover:text-text-bright cursor-pointer"
                        title={t.edit}
                      >
                        <Pencil size={11} />
                      </button>
                    )}

                    {/* 05 Delete */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isConfirmingDelete) {
                          onDeleteCategory(node.id);
                          setConfirmDeleteId(null);
                        } else {
                          setConfirmDeleteId(node.id);
                        }
                      }}
                      className={`px-2 py-1 border text-[9px] font-mono tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                        isConfirmingDelete
                          ? 'border-red-500 bg-red-950/60 text-red-200 font-bold animate-pulse'
                          : 'border-border-main bg-base-bg text-[#ff7b72] hover:border-red-500/40 hover:text-red-400'
                      }`}
                      title={isConfirmingDelete ? 'CONFIRM DELETE' : t.delete}
                    >
                      <Trash2 size={11} />
                      {isConfirmingDelete ? (
                        <span>{language === 'JP' ? '本当に削除？' : 'CONFIRM'}</span>
                      ) : (
                        <span className="hidden sm:inline">{t.delete}</span>
                      )}
                    </button>
                    {isConfirmingDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 border border-border-main bg-base-bg text-text-dim hover:text-text-bright cursor-pointer"
                        title={t.cancel}
                      >
                        <X size={11} />
                      </button>
                    )}

                    {/* 06 View Bookmarks Jump */}
                    <button
                      type="button"
                      onClick={() => handleSelectAndGo(node.id)}
                      className="px-2.5 py-1 bg-border-light hover:bg-accent-bg text-text-bright hover:text-accent-text border border-border-light font-bold text-[9px] font-mono tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      title={language === 'JP' ? 'このフォルダを選択してブックマーク一覧を開く' : 'View bookmarks for this folder'}
                    >
                      <ExternalLink size={10} />
                      <span>{t.viewBookmarks}</span>
                    </button>
                  </div>
                </div>

                {/* Subfolder Form Row */}
                {isAddingSub && (
                  <form 
                    onSubmit={e => handleAddSubSubmit(e, node.id)}
                    className="flex items-center gap-2 p-2 bg-base-bg border border-accent-text/40 mt-1"
                    style={{ marginLeft: `${indentPadding + 24}px` }}
                  >
                    <span className="text-[10px] text-accent-text font-bold font-mono">
                      + {t.newSubfolder}:
                    </span>
                    <input
                      autoFocus
                      type="text"
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      placeholder={t.dirName}
                      className="flex-1 h-6 px-2 bg-panel-bg border border-border-main text-text-bright text-[10px] focus:outline-none focus:border-border-light"
                    />
                    <button
                      type="submit"
                      className="px-2.5 h-6 bg-accent-bg text-accent-text border border-border-light font-bold text-[9px] cursor-pointer"
                    >
                      {t.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingSubParentId(null)}
                      className="px-2.5 h-6 bg-transparent border border-border-main text-text-dim hover:text-text-bright text-[9px] cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </form>
                )}

                {/* Parent Changer Inline Selector */}
                {isChangingParent && (
                  <div 
                    className="flex flex-wrap items-center gap-2 p-2 bg-base-bg border border-accent-text/50 mt-1"
                    style={{ marginLeft: `${indentPadding}px` }}
                  >
                    <span className="text-[10px] font-bold text-accent-text font-mono flex items-center gap-1">
                      <FolderInput size={12} />
                      {t.changeParent}:
                    </span>
                    <select
                      value={targetParentId}
                      onChange={e => setTargetParentId(e.target.value)}
                      className="flex-1 min-w-[200px] h-7 px-2 bg-panel-bg border border-border-main text-text-bright text-[10px] focus:outline-none focus:border-border-light"
                    >
                      <option value="__ROOT__">
                        -- {t.moveToRoot} --
                      </option>
                      {getHierarchicalCategories(parentCandidates).map(candidate => (
                        <option key={candidate.id} value={candidate.id}>
                          {getCategoryIndentedLabel(candidate, categories)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSaveParentChange(node.id)}
                      className="px-3 h-7 bg-accent-bg text-accent-text border border-border-light font-bold text-[9px] font-mono tracking-wider cursor-pointer"
                    >
                      {t.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangingParentId(null)}
                      className="px-3 h-7 bg-panel-bg border border-border-main text-text-dim hover:text-text-bright text-[9px] font-mono tracking-wider cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 04 FOOTER / STATUS BAR */}
      <div className="p-2.5 border-t border-border-main bg-base-bg/80 flex flex-wrap items-center justify-between gap-3 text-[10px] text-text-dim font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>{categories.length} {language === 'JP' ? 'フォルダ登録済み' : 'TOTAL FOLDERS'}</span>
          <span>•</span>
          <span>{notebooks.length} {language === 'JP' ? 'ブックマーク総数' : 'TOTAL BOOKMARKS'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{language === 'JP' ? '※並び順と階層はサイドバーと即時同期・自動保存されます（ドラッグ＆ドロップは同一階層のみ有効）' : 'SYNCED WITH SIDEBAR & SAVED AUTOMATICALLY (DRAG & DROP SIBLINGS ONLY)'}</span>
        </div>
      </div>
    </div>
  );
};
