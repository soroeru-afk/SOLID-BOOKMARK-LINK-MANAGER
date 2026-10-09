import React, { useState, useEffect } from 'react';
import { Bookmark, Folder, Check, X, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { Language, i18n } from '../i18n';

interface Props {
  isOpen: boolean;
  initialTitle: string;
  initialUrl: string;
  initialCategoryId?: string;
  categories: Category[];
  language: Language;
  onSave: (title: string, url: string, categoryId: string) => void;
  onCancel: () => void;
}

export function IncomingBookmarkModal({
  isOpen,
  initialTitle,
  initialUrl,
  initialCategoryId = '',
  categories,
  language,
  onSave,
  onCancel
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  useEffect(() => {
    setTitle(initialTitle);
    setUrl(initialUrl);
    setCategoryId(initialCategoryId);
  }, [initialTitle, initialUrl, initialCategoryId, isOpen]);

  if (!isOpen) return null;

  const t = i18n[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSave(title.trim() || 'New Bookmark', url.trim(), categoryId);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-panel-bg border-2 border-border-light max-w-md w-full p-5 relative shadow-2xl rounded-xs text-text-normal font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 text-text-dim hover:text-text-bright p-1 cursor-pointer transition-colors"
          title={t.cancel}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-text-bright font-bold text-sm border-b border-border-main/50 pb-2.5 mb-4">
          <Sparkles size={16} className="text-amber-400" />
          <span>{language === 'JP' ? '1クリック保存：追加先フォルダの選択' : '1-Click Saver: Select Destination'}</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <p className="text-text-dim leading-relaxed text-[11px]">
            {language === 'JP' 
              ? 'Webページから受け取ったリンクです。保存先のフォルダ（カテゴリ）を選択して保存してください。' 
              : 'Webpage link captured! Select a destination folder and click Save.'}
          </p>

          {/* タイトル入力 */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-text-bright flex items-center gap-1.5 text-[11px]">
              <Bookmark size={13} className="text-amber-400" />
              <span>{language === 'JP' ? 'ページタイトル:' : 'Page Title:'}</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-8 px-2.5 bg-input-bg border border-border-main text-text-bright text-xs focus:border-border-light outline-none rounded-xs font-sans"
              required
            />
          </div>

          {/* URL入力 */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-text-bright flex items-center gap-1.5 text-[11px]">
              <span className="text-amber-400 font-mono">🔗</span>
              <span>{language === 'JP' ? 'URLアドレス:' : 'URL:'}</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full h-8 px-2.5 bg-input-bg border border-border-main text-text-bright text-xs font-mono focus:border-border-light outline-none rounded-xs"
              required
            />
          </div>

          {/* 保存先フォルダ（プルダウン） */}
          <div className="flex flex-col gap-1 bg-base-bg p-3 border border-border-main rounded-xs">
            <label className="font-bold text-text-bright flex items-center gap-1.5 text-[11px]">
              <Folder size={14} className="text-amber-400" />
              <span>{language === 'JP' ? '📁 保存先フォルダ (プルダウン選択):' : '📁 Save to Folder:'}</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-8 px-2 bg-input-bg border border-border-main text-text-bright text-xs focus:border-border-light outline-none rounded-xs cursor-pointer font-sans"
            >
              <option value="">{language === 'JP' ? '未割り当て (Unassigned)' : 'Unassigned'}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  📁 {cat.path || cat.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-text-dim mt-0.5">
              {language === 'JP' 
                ? '※ 保存したいフォルダを選択してください。「未割り当て」のまま保存することもできます。' 
                : '* Choose the folder where this link should be stored.'}
            </p>
          </div>

          {/* ボタンエリア */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-main/50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright font-bold text-xs transition-colors cursor-pointer rounded-xs"
            >
              {t.cancel || 'キャンセル'}
            </button>
            
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-accent-bg text-accent-text font-bold text-xs border border-border-light shadow-md hover:brightness-110 cursor-pointer rounded-xs transition-transform active:scale-95"
            >
              <Check size={14} />
              <span>{language === 'JP' ? 'このフォルダに保存' : 'Save Bookmark'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
