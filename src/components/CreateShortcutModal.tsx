import React, { useState, useEffect } from 'react';
import { Link2, Folder, X, Check, Globe } from 'lucide-react';
import { Category, Notebook } from '../types';
import { Language, i18n } from '../i18n';
import { getHierarchicalCategories, getCategoryIndentedLabel } from '../utils/categoryUtils';

interface Props {
  isOpen: boolean;
  targetNotebook: Notebook | null;
  categories: Category[];
  language: Language;
  onCreateShortcut: (targetNotebook: Notebook, destinationCategoryId: string) => void;
  onClose: () => void;
}

export function CreateShortcutModal({
  isOpen,
  targetNotebook,
  categories,
  language,
  onCreateShortcut,
  onClose
}: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  useEffect(() => {
    if (targetNotebook) {
      // 初期値は本体のカテゴリ、無ければ未割り当て
      setSelectedCategoryId(targetNotebook.categoryId || '');
    }
  }, [targetNotebook]);

  if (!isOpen || !targetNotebook) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateShortcut(targetNotebook, selectedCategoryId);
    onClose();
  };

  const t = i18n[language];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-panel-bg border-2 border-border-light max-w-md w-full p-5 shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col gap-4 text-[11px] font-sans">
        
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b border-border-main pb-2.5">
          <div className="flex items-center gap-2 text-text-bright font-bold">
            <Link2 size={16} />
            <span className="text-xs tracking-wider">
              {language === 'JP' ? 'ショートカットの作成' : 'CREATE SHORTCUT'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-text-bright p-1 cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-[10.5px] text-text-normal leading-relaxed">
          {language === 'JP' 
            ? '本体のブックマークを参照するショートカットを作成します。本体のタイトルやURLが編集された場合、ショートカット側にも自動的に最新情報が反映されます。'
            : 'Create a shortcut pointing to the target bookmark. Any updates to the target title or URL will automatically reflect in shortcuts.'}
        </p>

        {/* 参照元ブックマーク概要ボックス */}
        <div className="bg-base-bg border border-border-main p-3 rounded-xs flex flex-col gap-1.5 font-mono">
          <div className="text-[9px] text-text-dim font-bold tracking-wider">
            {language === 'JP' ? '【参照元本体ブックマーク】' : '[TARGET BOOKMARK]'}
          </div>
          <div className="text-[11px] font-bold text-text-bright truncate flex items-center gap-1.5">
            <Globe size={12} className="text-text-dim shrink-0" />
            <span className="truncate">{targetNotebook.title}</span>
          </div>
          <div className="text-[9.5px] text-text-dim truncate">
            {targetNotebook.url}
          </div>
        </div>

        {/* 配置先フォルダ選択フォーム */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-bright flex items-center gap-1.5">
              <Folder size={12} className="text-text-dim" />
              <span>{language === 'JP' ? 'ショートカットの配置先フォルダ:' : 'Destination Folder:'}</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-base-bg border border-border-main focus:border-border-light text-text-bright text-[11px] px-2.5 py-1.5 outline-none font-mono cursor-pointer"
            >
              <option value="">{t.unassigned}</option>
              {getHierarchicalCategories(categories).map(c => (
                <option key={c.id} value={c.id}>{getCategoryIndentedLabel(c, categories)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-main">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-border-main text-text-dim hover:text-text-bright hover:border-border-light transition-colors text-[10px] font-mono cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent-bg border border-accent-text text-accent-text font-bold hover:bg-accent-text hover:text-base-bg transition-colors text-[10px] font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Check size={12} />
              <span>{language === 'JP' ? 'ショートカットを作成' : 'Create Shortcut'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
