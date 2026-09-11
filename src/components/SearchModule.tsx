import React from 'react';
import { Search, X, Folder, Globe, Filter } from 'lucide-react';
import { Language, i18n } from '../i18n';

export type SearchScope = 'current' | 'all';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchScope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
  totalFilteredCount: number;
  totalPoolCount: number;
  activeCategoryName: string | null;
  language: Language;
}

export default function SearchModule({
  searchQuery,
  onSearchChange,
  searchScope,
  onScopeChange,
  totalFilteredCount,
  totalPoolCount,
  activeCategoryName,
  language
}: Props) {
  const t = i18n[language];

  return (
    <div className="border border-border-main bg-panel-bg px-4 py-2.5 relative w-full shrink-0 flex flex-col gap-2">
      <div className="absolute top-0 left-0 bg-base-bg px-2 -mt-[0.6rem] ml-4 text-[10px] text-text-dim font-bold tracking-widest flex items-center gap-1.5">
        <Filter size={11} className="text-text-bright" />
        {t.searchModule}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-0.5">
        {/* 検索入力欄 */}
        <div className="flex-1 relative flex items-center">
          <Search size={14} className="absolute left-3 text-text-dim pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onSearchChange('');
            }}
            placeholder={t.searchPlaceholder}
            className="w-full h-8 pl-9 pr-8 bg-base-bg border border-border-main text-text-bright placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[11px] font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-text-dim hover:text-text-bright transition-colors p-0.5 cursor-pointer"
              title={t.clearSearch}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 検索スコープ切り替え & 件数バッジ */}
        <div className="flex items-center gap-2 shrink-0">
          {/* スコープボタン */}
          <div className="flex items-center border border-border-main bg-base-bg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => onScopeChange('current')}
              className={`flex items-center gap-1 px-2 py-1 transition-colors font-medium cursor-pointer ${
                searchScope === 'current'
                  ? 'bg-border-light text-white font-bold'
                  : 'text-text-dim hover:text-text-bright'
              }`}
              title={activeCategoryName ? `現在: ${activeCategoryName}` : t.searchScopeCurrent}
            >
              <Folder size={11} />
              <span>{t.searchScopeCurrent}</span>
            </button>
            <button
              type="button"
              onClick={() => onScopeChange('all')}
              className={`flex items-center gap-1 px-2 py-1 transition-colors font-medium cursor-pointer ${
                searchScope === 'all'
                  ? 'bg-border-light text-white font-bold'
                  : 'text-text-dim hover:text-text-bright'
              }`}
              title={t.searchScopeAll}
            >
              <Globe size={11} />
              <span>{t.searchScopeAll}</span>
            </button>
          </div>

          {/* ヒット件数バッジ */}
          <div className="px-2.5 py-1 bg-base-bg border border-border-main text-[10px] font-mono text-text-dim flex items-center gap-1.5 shrink-0">
            <span>{t.matchesFound}:</span>
            <strong className={`font-bold ${searchQuery ? 'text-text-bright' : 'text-text-normal'}`}>
              {totalFilteredCount}
            </strong>
            <span className="text-[9px] text-text-dim/60">/ {totalPoolCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
