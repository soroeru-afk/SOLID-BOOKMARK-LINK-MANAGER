import React, { useState, useMemo, useRef, useCallback } from 'react';
import { X, Check, CheckSquare, Square, Search, PlusCircle, AlertCircle, CheckCircle2, ArrowRight, FolderPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Category, Notebook } from '../types';
import { Language } from '../i18n';

export type ComparisonStatus = 'new' | 'update' | 'same';

export interface ComparisonItem {
  id: string; // 一意キー
  status: ComparisonStatus;
  incoming: {
    title: string;
    url: string;
    categoryId: string;
    categoryName?: string;
    color?: string;
    isShortcut?: boolean;
    targetId?: string;
  };
  existing?: {
    id: string;
    title: string;
    url: string;
    categoryId: string;
    categoryName?: string;
    color?: string;
    isShortcut?: boolean;
    targetId?: string;
  };
  diffs: string[];
}

interface Props {
  isOpen: boolean;
  incomingCategories: Category[];
  incomingNotebooks: Notebook[];
  existingCategories: Category[];
  existingNotebooks: Notebook[];
  language: Language;
  onConfirmImport: (selectedItems: ComparisonItem[], newCategories: Category[]) => void;
  onClose: () => void;
  initialScope?: 'stock' | 'all';
  stockCategoryId?: string;
  stockCategoryIds?: Set<string>;
}

export function ImportComparisonModal({
  isOpen,
  incomingCategories,
  incomingNotebooks,
  existingCategories,
  existingNotebooks,
  language,
  onConfirmImport,
  onClose,
  initialScope = 'stock',
  stockCategoryId,
  stockCategoryIds
}: Props) {
  // カオルさまご指定: ストックリスト（日常・作業メモ）をメイン対象とするスコープ切替
  const [comparisonScope, setComparisonScope] = useState<'stock' | 'all'>(initialScope);

  // モーダルが開かれた時に初期スコープを設定
  React.useEffect(() => {
    if (isOpen) {
      setComparisonScope(initialScope);
    }
  }, [isOpen, initialScope]);

  // カオルさまご指定: インポートデータ内のストックリスト関連カテゴリIDを特定
  const incomingStockCategoryIds = useMemo(() => {
    if (!isOpen) return new Set<string>();
    const stockCat = incomingCategories.find(c => 
      c.id === 'stock_root' || 
      c.name.includes('ストックリスト') || 
      c.name.toLowerCase().includes('stock list') ||
      (c.path && c.path.includes('ストックリスト'))
    );
    if (!stockCat) return new Set<string>();
    const ids = new Set<string>([stockCat.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of incomingCategories) {
        if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
          ids.add(c.id);
          added = true;
        }
      }
    }
    return ids;
  }, [isOpen, incomingCategories]);

  // カオルさまご指定: スコープに応じたインポート対象ブックマークの絞り込み（ストックリスト選択時はストックのみを対象！）
  const scopedIncomingNotebooks = useMemo(() => {
    if (comparisonScope === 'stock') {
      // 1. ファイル内にストックリスト関連カテゴリが存在する場合 -> その配下のアイテムのみ
      if (incomingStockCategoryIds.size > 0) {
        return incomingNotebooks.filter(nb => nb.categoryId && incomingStockCategoryIds.has(nb.categoryId));
      }
      // 2. もしインポートファイル自体が小さなストックリストJSON（例: 個別エクスポートで100件以下）の場合
      if (incomingNotebooks.length <= 100 && incomingCategories.length <= 5) {
        return incomingNotebooks;
      }
      // 3. 全体バックアップ（6000件超など）からストックリストを抽出する場合、ストックリスト配下がないなら0件
      return [];
    }
    return incomingNotebooks;
  }, [comparisonScope, incomingNotebooks, incomingStockCategoryIds, incomingCategories]);

  // スコープに応じた既存ブックマークプールの絞り込み
  const scopedExistingNotebooks = useMemo(() => {
    if (comparisonScope === 'stock' && stockCategoryIds && stockCategoryIds.size > 0) {
      return existingNotebooks.filter(nb => nb.categoryId && stockCategoryIds.has(nb.categoryId));
    }
    return existingNotebooks;
  }, [comparisonScope, existingNotebooks, stockCategoryIds]);

  // 新規追加されるフォルダの検出（スコープに応じたフォルダのみ）
  const newFolders = useMemo(() => {
    if (!isOpen) return [];
    const existingCatIds = new Set(existingCategories.map(c => c.id));
    const existingCatPaths = new Set(existingCategories.map(c => (c.path || c.name || '').trim()));

    const targetIncomingCats = comparisonScope === 'stock'
      ? (incomingStockCategoryIds.size > 0 
          ? incomingCategories.filter(c => incomingStockCategoryIds.has(c.id) && c.id !== 'stock_root')
          : (incomingNotebooks.length <= 100 ? incomingCategories : []))
      : incomingCategories;

    return targetIncomingCats.filter(inc => {
      if (!inc.id) return false;
      if (existingCatIds.has(inc.id)) return false;
      const path = (inc.path || inc.name || '').trim();
      if (existingCatPaths.has(path)) return false;
      return true;
    });
  }, [isOpen, comparisonScope, incomingCategories, incomingStockCategoryIds, incomingNotebooks.length, existingCategories]);

  // 新規フォルダパネルの展開・折りたたみ
  const [isFolderPanelOpen, setIsFolderPanelOpen] = useState(false);

  // 比較解析ロジック（O(N) 高速マップ判定）
  const comparisonItems: ComparisonItem[] = useMemo(() => {
    if (!isOpen) return [];

    // URL正規化関数
    const normalizeUrl = (url: string) => {
      try {
        let u = url.trim().toLowerCase();
        if (u.endsWith('/')) u = u.slice(0, -1);
        return u;
      } catch {
        return url.trim().toLowerCase();
      }
    };

    // 既存ブックマークのURLマップ & IDマップ (スコープ絞り込み済みプールを使用)
    const existingUrlMap = new Map<string, Notebook>();
    const existingIdMap = new Map<string, Notebook>();
    for (const nb of scopedExistingNotebooks) {
      existingIdMap.set(nb.id, nb);
      if (nb.url) {
        existingUrlMap.set(normalizeUrl(nb.url), nb);
      }
    }

    // カテゴリ名マップの事前計算
    const existingCatNameMap = new Map<string, string>();
    for (const c of existingCategories) {
      existingCatNameMap.set(c.id, c.path || c.name);
    }
    const incomingCatNameMap = new Map<string, string>();
    for (const c of incomingCategories) {
      incomingCatNameMap.set(c.id, c.path || c.name);
    }

    const unassignedLabel = language === 'JP' ? '未割り当て' : 'Unassigned';
    const getIncCatName = (catId?: string) => (catId ? incomingCatNameMap.get(catId) || unassignedLabel : unassignedLabel);
    const getExistCatName = (catId?: string) => (catId ? existingCatNameMap.get(catId) || unassignedLabel : unassignedLabel);

    const items: ComparisonItem[] = [];

    // カオルさまご指定: scopedIncomingNotebooks（ストックリスト選択時はストックのみ）で比較ループを実行！
    for (let i = 0; i < scopedIncomingNotebooks.length; i++) {
      const inc = scopedIncomingNotebooks[i];
      const normUrl = inc.url ? normalizeUrl(inc.url) : '';
      const existingMatch = (normUrl ? existingUrlMap.get(normUrl) : undefined) || existingIdMap.get(inc.id);

      // スコープが stock で、インポート元に categoryId が無い場合は stockCategoryId を補完
      const targetCatId = inc.categoryId || (comparisonScope === 'stock' ? (stockCategoryId || '') : '');
      const incCatName = getIncCatName(targetCatId);

      if (!existingMatch) {
        // 新規アイテム
        items.push({
          id: `comp_new_${i}_${inc.id || Date.now()}`,
          status: 'new',
          incoming: {
            title: inc.title || (language === 'JP' ? '無題のブックマーク' : 'Untitled'),
            url: inc.url || '',
            categoryId: targetCatId,
            categoryName: incCatName,
            color: inc.color,
            isShortcut: inc.isShortcut,
            targetId: inc.targetId
          },
          diffs: []
        });
      } else {
        // 既存アイテムが存在する
        const existCatName = getExistCatName(existingMatch.categoryId);
        const diffs: string[] = [];

        if ((inc.title || '').trim() !== (existingMatch.title || '').trim()) {
          diffs.push('title');
        }
        if (normUrl !== normalizeUrl(existingMatch.url || '')) {
          diffs.push('url');
        }
        if (incCatName !== existCatName) {
          diffs.push('category');
        }
        if (inc.color !== existingMatch.color) {
          diffs.push('color');
        }

        if (diffs.length > 0) {
          // 内容に違いがある -> 変更・競合 (update)
          items.push({
            id: `comp_upd_${i}_${inc.id}`,
            status: 'update',
            incoming: {
              title: inc.title || '',
              url: inc.url || '',
              categoryId: inc.categoryId || '',
              categoryName: incCatName,
              color: inc.color,
              isShortcut: inc.isShortcut,
              targetId: inc.targetId
            },
            existing: {
              id: existingMatch.id,
              title: existingMatch.title || '',
              url: existingMatch.url || '',
              categoryId: existingMatch.categoryId || '',
              categoryName: existCatName,
              color: existingMatch.color,
              isShortcut: existingMatch.isShortcut,
              targetId: existingMatch.targetId
            },
            diffs
          });
        } else {
          // 内容が完全に一致 -> 同一 (same)
          items.push({
            id: `comp_same_${i}_${inc.id}`,
            status: 'same',
            incoming: {
              title: inc.title || '',
              url: inc.url || '',
              categoryId: inc.categoryId || '',
              categoryName: incCatName,
              color: inc.color,
              isShortcut: inc.isShortcut,
              targetId: inc.targetId
            },
            existing: {
              id: existingMatch.id,
              title: existingMatch.title || '',
              url: existingMatch.url || '',
              categoryId: existingMatch.categoryId || '',
              categoryName: existCatName,
              color: existingMatch.color,
              isShortcut: existingMatch.isShortcut,
              targetId: existingMatch.targetId
            },
            diffs: []
          });
        }
      }
    }

    return items;
  }, [isOpen, scopedIncomingNotebooks, incomingCategories, scopedExistingNotebooks, existingCategories, language, comparisonScope, stockCategoryId]);

  // 選択中のアイテムIDセット (Prompt Mixer準拠: デフォルトでは「新規」と「変更・競合」をON、「同一」はOFF)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of comparisonItems) {
      if (item.status === 'new' || item.status === 'update') {
        initial.add(item.id);
      }
    }
    return initial;
  });

  // モーダルオープン時またはアイテム再計算時に初期選択を更新
  React.useEffect(() => {
    if (comparisonItems.length > 0) {
      const initial = new Set<string>();
      for (const item of comparisonItems) {
        if (item.status === 'new' || item.status === 'update') {
          initial.add(item.id);
        }
      }
      setSelectedIds(initial);
    }
  }, [comparisonItems]);

  // フィルタタブ ('all' | 'update' | 'new' | 'same')
  const [activeTab, setActiveTab] = useState<'all' | 'update' | 'new' | 'same'>('new');
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState('');

  // 6400件以上の大容量データ対応: 高速レンダリング（仮想化・段階的表示）
  const [visibleLimit, setVisibleLimit] = useState(80);

  // タブや検索クエリが変化した時は表示件数を初期リセット
  React.useEffect(() => {
    setVisibleLimit(80);
  }, [activeTab, searchQuery]);

  // 各ステータスの件数集計
  const counts = useMemo(() => {
    let newCount = 0;
    let updateCount = 0;
    let sameCount = 0;
    for (const item of comparisonItems) {
      if (item.status === 'new') newCount++;
      else if (item.status === 'update') updateCount++;
      else if (item.status === 'same') sameCount++;
    }
    return {
      total: comparisonItems.length,
      new: newCount,
      update: updateCount,
      same: sameCount
    };
  }, [comparisonItems]);

  // フィルタリングされたアイテムリスト
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return comparisonItems.filter(item => {
      // タブフィルター
      if (activeTab === 'new' && item.status !== 'new') return false;
      if (activeTab === 'update' && item.status !== 'update') return false;
      if (activeTab === 'same' && item.status !== 'same') return false;

      // 検索フィルター
      if (q) {
        const titleMatch = item.incoming.title.toLowerCase().includes(q) || (item.existing?.title.toLowerCase().includes(q) ?? false);
        const urlMatch = item.incoming.url.toLowerCase().includes(q) || (item.existing?.url.toLowerCase().includes(q) ?? false);
        const catMatch = (item.incoming.categoryName?.toLowerCase().includes(q) ?? false) || (item.existing?.categoryName?.toLowerCase().includes(q) ?? false);
        if (!titleMatch && !urlMatch && !catMatch) return false;
      }
      return true;
    });
  }, [comparisonItems, activeTab, searchQuery]);

  // DOMにレンダリングする件数（高速化）
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleLimit);
  }, [filteredItems, visibleLimit]);

  // スクロール検知で追加読み込み
  const listContainerRef = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setVisibleLimit(prev => Math.min(prev + 100, filteredItems.length));
    }
  }, [filteredItems.length]);

  // チェック操作
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // カオルさまご指定: 「差分のみ全選択 (新規+変更)」
  const selectDiffsOnly = () => {
    const next = new Set<string>();
    for (const item of comparisonItems) {
      if (item.status === 'new' || item.status === 'update') {
        next.add(item.id);
      }
    }
    setSelectedIds(next);
  };

  // カオルさまご指定: 「表示中を全選択」
  const selectCurrentViewOnly = () => {
    const next = new Set(selectedIds);
    for (const item of filteredItems) {
      next.add(item.id);
    }
    setSelectedIds(next);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectNewOnly = () => {
    const next = new Set<string>();
    for (const item of comparisonItems) {
      if (item.status === 'new') next.add(item.id);
    }
    setSelectedIds(next);
  };

  const selectUpdateOnly = () => {
    const next = new Set<string>();
    for (const item of comparisonItems) {
      if (item.status === 'update') next.add(item.id);
    }
    setSelectedIds(next);
  };

  // インポート実行ハンドラー
  const handleConfirm = () => {
    const chosenItems = comparisonItems.filter(item => selectedIds.has(item.id));
    onConfirmImport(chosenItems, incomingCategories);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-panel-bg border-2 border-border-light max-w-4xl w-full h-[92vh] max-h-[880px] shadow-2xl flex flex-col font-sans relative overflow-hidden rounded-xs text-[11px]">
        
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b border-border-main px-4 py-3 bg-base-bg shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="bg-base-bg px-2 py-0.5 text-[9px] text-text-bright font-bold border border-border-main font-mono tracking-wider shadow-2xs">
              IMPORT COMPARISON
            </span>
            <h2 className="text-[13px] font-bold text-text-bright tracking-wider">
              {comparisonScope === 'stock' 
                ? (language === 'JP' ? '★ ストックリスト 比較インポート' : '★ Stock List Import Comparison')
                : (language === 'JP' ? 'ブックマーク全体 比較インポート' : 'All Bookmarks Import Comparison')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-dim hover:text-text-bright hover:bg-border-main/40 transition-colors cursor-pointer rounded-xs"
            title={language === 'JP' ? '閉じる' : 'Close'}
          >
            <X size={15} />
          </button>
        </div>

        {/* カオルさまご指定: 対象スコープ切り替えバー (ストックリストをメイン対象とする) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-base-bg/80 border-b border-border-main text-[10px] font-mono shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-dim font-bold">{language === 'JP' ? '比較対象スコープ:' : 'TARGET SCOPE:'}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setComparisonScope('stock')}
                className={`px-2.5 py-1 border transition-colors cursor-pointer rounded-2xs flex items-center gap-1.5 ${
                  comparisonScope === 'stock'
                    ? 'bg-accent-bg border-accent-text text-accent-text font-bold shadow-xs'
                    : 'bg-panel-bg border-border-main text-text-dim hover:text-text-bright'
                }`}
              >
                <span>★</span>
                <span>{language === 'JP' ? 'ストックリスト (日常作業・推奨)' : 'STOCK LIST (RECOMMENDED)'}</span>
                {comparisonScope === 'stock' && (
                  <span className="text-[8px] px-1 bg-current/20 rounded-2xs font-bold">[MAIN]</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setComparisonScope('all')}
                className={`px-2.5 py-1 border transition-colors cursor-pointer rounded-2xs flex items-center gap-1.5 ${
                  comparisonScope === 'all'
                    ? 'bg-accent-bg border-accent-text text-accent-text font-bold shadow-xs'
                    : 'bg-panel-bg border-border-main text-text-dim hover:text-text-bright'
                }`}
              >
                <span>{language === 'JP' ? 'すべてのデータ (アーカイブ全体)' : 'ALL BOOKMARKS (FULL)'}</span>
              </button>
            </div>
          </div>
          <span className="text-text-dim text-[9.5px]">
            {comparisonScope === 'stock'
              ? (language === 'JP' ? '※日常ストックリストのみと比較し、差分を正確に判定' : 'Comparing only within Stock List')
              : (language === 'JP' ? '※全体の全ブックマークと比較' : 'Comparing across all bookmarks')}
          </span>
        </div>

        {/* サマリーバー (画像準拠: 取り込み対象, 新規, 変更・競合, 同一, 選択中 + 新規フォルダ検出) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-border-main bg-panel-bg font-mono text-[10px] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 text-text-normal flex-wrap">
            <span>
              {language === 'JP' ? '取り込み対象:' : 'Incoming:'} <strong className="text-text-bright font-bold">{counts.total}</strong>
            </span>
            <span className="text-border-main">|</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <PlusCircle size={11} />
              <span>{language === 'JP' ? '新規:' : 'New:'} {counts.new}</span>
            </span>
            {/* カオルさまご指摘: ライトテーマでの黄色の視認性を強化（高コントラストバッジ） */}
            <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.5 rounded-2xs font-black">
              <AlertCircle size={11} />
              <span>{language === 'JP' ? '変更・競合:' : 'Update/Conflict:'} {counts.update}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-text-dim">
              <CheckCircle2 size={11} />
              <span>{language === 'JP' ? '同一:' : 'Same:'} {counts.same}</span>
            </span>

            {/* カオルさまご指定: 新規フォルダのサマリーバッジ */}
            {newFolders.length > 0 && (
              <>
                <span className="text-border-main">|</span>
                <button
                  type="button"
                  onClick={() => setIsFolderPanelOpen(prev => !prev)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/40 rounded-2xs cursor-pointer hover:bg-blue-950/30"
                  title={language === 'JP' ? '新しく作成されるフォルダを表示' : 'Show new folders'}
                >
                  <FolderPlus size={11} />
                  <span>{language === 'JP' ? '新規フォルダ:' : 'New Folders:'} {newFolders.length} 件</span>
                  {isFolderPanelOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              </>
            )}
          </div>

          <div className="text-[10px] font-bold">
            <span className="bg-base-bg border border-border-main px-2 py-0.5 text-text-bright">
              {language === 'JP' ? '選択中:' : 'Selected:'} <span className="text-white bg-border-light px-1.5 py-0.5 rounded-2xs font-mono">{selectedIds.size}</span> / {counts.total}
            </span>
          </div>
        </div>

        {/* カオルさまご指定: 新しくできたフォルダのプレビューアコーディオン */}
        {newFolders.length > 0 && isFolderPanelOpen && (
          <div className="px-4 py-2 border-b border-border-main bg-base-bg text-[10px] font-mono flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-150 shrink-0">
            <div className="flex items-center justify-between text-text-dim font-bold">
              <span className="flex items-center gap-1.5">
                <FolderPlus size={12} className="text-blue-500" />
                <span>{language === 'JP' ? '【このインポートで新設される新規フォルダ】' : '[NEW FOLDERS CREATED ON IMPORT]'}</span>
              </span>
              <span className="text-[9px] text-text-dim">既存ツリーの末尾・指定階層に整然と追加されます</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
              {newFolders.map(folder => (
                <span key={folder.id} className="px-2 py-0.5 bg-panel-bg border border-border-main text-text-bright font-bold rounded-2xs flex items-center gap-1 shadow-2xs">
                  <span>📁</span>
                  <span className="truncate max-w-[240px]">{folder.path || folder.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* コントロール行: タブフィルター + 一括選択ボタン + 検索バー */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 border-b border-border-main bg-base-bg/50 shrink-0">
          {/* フィルタタブ */}
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`px-2.5 py-1 border transition-colors cursor-pointer rounded-2xs flex items-center gap-1 ${
                activeTab === 'new' 
                  ? 'bg-border-light text-white font-bold border-border-light' 
                  : 'bg-base-bg border-border-main text-text-dim hover:text-text-bright'
              }`}
            >
              <span>{language === 'JP' ? '新規' : 'NEW'}</span>
              <span className="font-mono text-[9px] opacity-90">({counts.new})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('update')}
              className={`px-2.5 py-1 border transition-colors cursor-pointer rounded-2xs flex items-center gap-1 ${
                activeTab === 'update' 
                  ? 'bg-border-light text-white font-bold border-border-light' 
                  : 'bg-base-bg border-border-main text-text-dim hover:text-text-bright'
              }`}
            >
              <span>{language === 'JP' ? '変更・競合' : 'UPDATE'}</span>
              <span className="font-mono text-[9px] opacity-90">({counts.update})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('same')}
              className={`px-2.5 py-1 border transition-colors cursor-pointer rounded-2xs flex items-center gap-1 ${
                activeTab === 'same' 
                  ? 'bg-border-light text-white font-bold border-border-light' 
                  : 'bg-base-bg border-border-main text-text-dim hover:text-text-bright'
              }`}
            >
              <span>{language === 'JP' ? '同一' : 'SAME'}</span>
              <span className="font-mono text-[9px] opacity-90">({counts.same})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 border transition-colors cursor-pointer rounded-2xs flex items-center gap-1 ${
                activeTab === 'all' 
                  ? 'bg-border-light text-white font-bold border-border-light' 
                  : 'bg-base-bg border-border-main text-text-dim hover:text-text-bright'
              }`}
            >
              <span>{language === 'JP' ? 'すべて' : 'ALL'}</span>
              <span className="font-mono text-[9px] opacity-90">({counts.total})</span>
            </button>
          </div>

          {/* カオルさまご指定: 賢い選択ボタン群 & 検索入力 */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <div className="flex items-center gap-1 font-mono text-[9px]">
              {/* 差分のみ全選択（新規＋変更） */}
              <button
                type="button"
                onClick={selectDiffsOnly}
                className="px-2 py-1 bg-border-light text-white font-bold border border-border-light hover:bg-white hover:text-black transition-colors cursor-pointer rounded-2xs shadow-xs"
                title={language === 'JP' ? '同一のものを除き、新規と変更・競合のアイテムのみをすべて選択' : 'Select all new and updated items'}
              >
                {language === 'JP' ? '差分全選択 (新規+変更)' : 'Select Diffs'}
              </button>
              {/* 表示中を全選択 */}
              <button
                type="button"
                onClick={selectCurrentViewOnly}
                className="px-2 py-1 bg-base-bg border border-border-main hover:border-border-light text-text-normal hover:text-text-bright transition-colors cursor-pointer rounded-2xs"
                title={language === 'JP' ? '現在このタブに表示されているアイテムをすべて選択' : 'Select all currently filtered items'}
              >
                {language === 'JP' ? '表示中を選択' : 'Select Shown'}
              </button>
              <button
                type="button"
                onClick={selectNewOnly}
                className="px-2 py-1 bg-emerald-950/20 border border-emerald-600/50 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold transition-colors cursor-pointer rounded-2xs"
              >
                {language === 'JP' ? '新規のみ' : 'New Only'}
              </button>
              {/* カオルさまご指摘: ライトテーマでの黄色の視認性を改善（高コントラスト化） */}
              <button
                type="button"
                onClick={selectUpdateOnly}
                className="px-2 py-1 bg-amber-500/15 border border-amber-600/70 hover:border-amber-500 text-amber-800 dark:text-amber-300 font-black transition-colors cursor-pointer rounded-2xs"
              >
                {language === 'JP' ? '変更のみ' : 'Update Only'}
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2 py-1 bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright transition-colors cursor-pointer rounded-2xs"
              >
                {language === 'JP' ? '全解除' : 'Deselect'}
              </button>
            </div>

            {/* 検索入力 */}
            <div className="relative flex items-center min-w-[150px] sm:min-w-[190px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'JP' ? '項目を検索...' : 'Search items...'}
                className="w-full h-6.5 pl-6 pr-2 bg-base-bg border border-border-main text-text-bright placeholder:text-text-dim text-[10px] outline-none font-mono focus:border-border-light"
              />
              <Search size={11} className="absolute left-1.5 text-text-dim pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 text-text-dim hover:text-text-bright p-0.5"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 比較カード一覧 (大容量6400件対応: 高速仮想スクロールエリア) */}
        <div 
          ref={listContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-base-bg/20"
        >
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-text-dim font-mono text-[11px] flex flex-col items-center justify-center gap-1.5">
              <span>{language === 'JP' ? '該当する項目がありません' : 'NO MATCHING ITEMS'}</span>
            </div>
          ) : (
            displayedItems.map(item => {
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`border transition-all p-3 rounded-xs flex flex-col gap-2 cursor-pointer select-none ${
                    isSelected 
                      ? 'bg-panel-bg border-border-light shadow-xs' 
                      : 'bg-base-bg/40 border-border-main/60 opacity-80 hover:opacity-100 hover:border-border-main'
                  }`}
                >
                  {/* ヘッダー行: チェックボックス + ステータスバッジ + タイトル */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className="text-text-dim hover:text-text-bright cursor-pointer shrink-0"
                    >
                      {isSelected ? <CheckSquare size={14} className="text-text-bright" /> : <Square size={14} />}
                    </button>

                    {/* ステータスバッジ */}
                    {item.status === 'same' && (
                      <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold bg-base-bg border border-border-main text-text-dim rounded-2xs shrink-0">
                        {language === 'JP' ? 'SAME (同一一致)' : 'SAME'}
                      </span>
                    )}
                    {item.status === 'new' && (
                      <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold bg-emerald-950/20 border border-emerald-500/60 text-emerald-600 dark:text-emerald-400 rounded-2xs shrink-0 flex items-center gap-1">
                        <PlusCircle size={9.5} />
                        <span>{language === 'JP' ? 'NEW (新規追加)' : 'NEW'}</span>
                      </span>
                    )}
                    {item.status === 'update' && (
                      <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-black bg-amber-500/15 border border-amber-600/70 text-amber-800 dark:text-amber-300 rounded-2xs shrink-0 flex items-center gap-1">
                        <AlertCircle size={9.5} />
                        <span>{language === 'JP' ? 'UPDATE (変更・競合)' : 'UPDATE'}</span>
                      </span>
                    )}

                    {/* タイトル */}
                    <div className="font-bold text-text-bright text-[11px] truncate flex-1 min-w-0">
                      {item.incoming.title || item.existing?.title}
                    </div>

                    {/* 所属フォルダ表示 */}
                    <div className="text-[9.5px] font-mono text-text-dim shrink-0 hidden sm:block truncate max-w-[180px]" title={item.incoming.categoryName}>
                      📁 {item.incoming.categoryName}
                    </div>
                  </div>

                  {/* 詳細差分 / 内容ボックス (画像 Prompt Mixer 準拠の枠組み) */}
                  <div className="bg-base-bg border border-border-main/70 p-2.5 rounded-xs text-[10px] font-mono flex flex-col gap-1.5">
                    {item.status === 'same' && (
                      <div className="flex items-center justify-between text-text-dim text-[9.5px]">
                        <span>{language === 'JP' ? '同一内容（すでに存在しています）' : 'Identical content (Already exists in library)'}</span>
                        <span className="truncate max-w-[340px] text-text-dim/80">{item.incoming.url}</span>
                      </div>
                    )}

                    {item.status === 'new' && (
                      <div className="flex flex-col gap-1">
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {language === 'JP' ? '新規追加ブックマーク:' : 'Incoming Bookmark:'}
                        </div>
                        <div className="text-text-bright font-bold truncate">
                          {item.incoming.title}
                        </div>
                        <div className="text-text-dim truncate text-[9.5px]">
                          {item.incoming.url}
                        </div>
                      </div>
                    )}

                    {item.status === 'update' && item.existing && (
                      <div className="flex flex-col gap-2">
                        {/* 既存データ */}
                        <div className="flex flex-col gap-0.5 border-b border-border-main/50 pb-1.5">
                          <span className="text-[9px] text-text-dim font-bold">
                            {language === 'JP' ? '【既存データ】' : '[EXISTING DATA]'}
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate text-text-dim ${item.diffs.includes('title') ? 'line-through opacity-70' : ''}`}>
                              {item.existing.title}
                            </span>
                            <span className="text-[9px] text-text-dim shrink-0">📁 {item.existing.categoryName}</span>
                          </div>
                          <div className={`text-[9px] text-text-dim/70 truncate ${item.diffs.includes('url') ? 'line-through opacity-70' : ''}`}>
                            {item.existing.url}
                          </div>
                        </div>

                        {/* インポート側の更新データ */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-[#b45309] dark:text-amber-400 font-extrabold flex items-center gap-1">
                            <ArrowRight size={10} />
                            <span>{language === 'JP' ? '【インポート後（上書き更新）】' : '[AFTER IMPORT (OVERWRITE)]'}</span>
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate font-bold ${item.diffs.includes('title') ? 'text-[#b45309] dark:text-amber-400' : 'text-text-bright'}`}>
                              {item.incoming.title}
                            </span>
                            <span className={`text-[9px] shrink-0 font-bold ${item.diffs.includes('category') ? 'text-[#b45309] dark:text-amber-400' : 'text-text-dim'}`}>
                              📁 {item.incoming.categoryName}
                            </span>
                          </div>
                          <div className={`text-[9px] truncate ${item.diffs.includes('url') ? 'text-[#b45309] dark:text-amber-400 font-bold' : 'text-text-dim'}`}>
                            {item.incoming.url}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* さらに読み込む（スクロールまたはクリック） */}
          {visibleLimit < filteredItems.length && (
            <div className="py-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleLimit(prev => Math.min(prev + 100, filteredItems.length))}
                className="px-4 py-1.5 bg-base-bg border border-border-main hover:border-border-light text-text-bright font-mono text-[10px] cursor-pointer rounded-xs"
              >
                {language === 'JP' 
                  ? `さらに表示 (${displayedItems.length} / ${filteredItems.length} 件表示中)`
                  : `Load More (${displayedItems.length} / ${filteredItems.length})`}
              </button>
            </div>
          )}
        </div>

        {/* モーダルフッター (画像準拠: 取り込み予定 X 件, キャンセル, 選択した X 件をインポート) */}
        <div className="flex items-center justify-between border-t border-border-main px-4 py-3 bg-base-bg shrink-0">
          <div className="font-mono text-[11px] text-text-normal">
            {language === 'JP' ? '取り込み予定:' : 'To Import:'} <strong className="text-text-bright font-bold text-[12px]">{selectedIds.size}</strong> {language === 'JP' ? '件' : 'items'}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright transition-colors font-mono text-[10px] cursor-pointer rounded-xs"
            >
              {language === 'JP' ? 'キャンセル' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`px-4 py-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer rounded-xs ${
                selectedIds.size > 0
                  ? 'bg-border-light text-white hover:bg-white hover:text-black shadow-sm'
                  : 'bg-base-bg border border-border-main text-text-dim/50 cursor-not-allowed'
              }`}
            >
              <Check size={12} />
              <span>
                {language === 'JP' ? `選択した ${selectedIds.size} 件をインポート` : `Import Selected (${selectedIds.size})`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
