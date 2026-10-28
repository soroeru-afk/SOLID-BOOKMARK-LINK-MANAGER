import React, { useState, useEffect } from 'react';
import { Bookmark, Folder, FolderPlus, Check, X, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { Language, i18n } from '../i18n';
import { getHierarchicalCategories, getCategoryIndentedLabel } from '../utils/categoryUtils';
import { fetchPageTitle } from '../utils/titleFetcher';

interface Props {
  isOpen: boolean;
  initialTitle: string;
  initialUrl: string;
  initialCategoryId?: string;
  categories: Category[];
  language: Language;
  onSave: (title: string, url: string, categoryId: string) => void;
  onAddCategory?: (name: string, parentId?: string | null) => void;
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
  onAddCategory,
  onCancel
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  // インライン新規フォルダ作成ステート
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');

  useEffect(() => {
    setTitle(initialTitle);
    setUrl(initialUrl);
    setCategoryId(initialCategoryId);
    setIsCreatingFolder(false);
    setNewFolderName('');
    setNewFolderParentId('');

    // PWA共有などでタイトルが未設定、またはURLと同じ場合に自動タイトル取得を実行
    if (isOpen && initialUrl && (!initialTitle || initialTitle.trim() === initialUrl.trim() || initialTitle === 'Shared Link')) {
      fetchPageTitle(initialUrl).then((fetchedTitle) => {
        if (fetchedTitle && fetchedTitle.trim()) {
          setTitle(fetchedTitle.trim());
        }
      }).catch(() => {});
    }
  }, [initialTitle, initialUrl, initialCategoryId, isOpen]);

  if (!isOpen) return null;

  const t = i18n[language];

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newFolderName.trim() || !onAddCategory) return;

    const name = newFolderName.trim();
    const pId = newFolderParentId || null;
    const newId = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

    onAddCategory(name, pId);
    setCategoryId(newId);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSave(title.trim() || 'New Bookmark', url.trim(), categoryId);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-panel-bg border-2 border-border-light max-w-md w-full p-5 relative shadow-2xl rounded-xs text-text-normal font-sans animate-in zoom-in-95 duration-150"
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
              ? 'Webページから受け取ったリンクです。保存先のフォルダを選択（または作成）して保存してください。' 
              : 'Webpage link captured! Select or create a destination folder and click Save.'}
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

          {/* 保存先フォルダ（プルダウン ＆ 新規作成ボタン） */}
          <div className="flex flex-col gap-2 bg-base-bg p-3 border border-border-main rounded-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-text-bright flex items-center gap-1.5 text-[11px]">
                <Folder size={14} className="text-amber-400" />
                <span>{language === 'JP' ? '📁 保存先フォルダ (プルダウン選択):' : '📁 Save to Folder:'}</span>
              </label>

              {onAddCategory && (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(prev => !prev)}
                  className="text-[10px] text-accent-text hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  title={language === 'JP' ? '新しい保存先フォルダを作成' : 'Create new folder'}
                >
                  <FolderPlus size={12} />
                  <span>{language === 'JP' ? '+ 新規フォルダを作成' : '+ New Folder'}</span>
                </button>
              )}
            </div>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-8 px-2 bg-input-bg border border-border-main text-text-bright text-xs focus:border-border-light outline-none rounded-xs cursor-pointer font-sans"
            >
              <option value="">{language === 'JP' ? '未割り当て (Unassigned)' : 'Unassigned'}</option>
              {getHierarchicalCategories(categories).map(cat => (
                <option key={cat.id} value={cat.id}>
                  📁 {getCategoryIndentedLabel(cat, categories)}
                </option>
              ))}
            </select>

            {/* 新規フォルダ作成 インライン入力フォーム */}
            {isCreatingFolder && onAddCategory && (
              <div className="flex flex-col gap-2 p-2.5 bg-panel-bg border border-accent-text/50 rounded-xs mt-1 animate-in fade-in duration-150">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-accent-text font-bold">
                    {language === 'JP' ? '新規フォルダ名:' : 'New Folder Name:'}
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder={language === 'JP' ? '例: 最新ニュース / 一時保存' : 'Folder name'}
                    className="w-full h-7 px-2 bg-input-bg border border-border-main text-text-bright text-xs outline-none focus:border-border-light"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-text-dim">
                    {language === 'JP' ? '親フォルダ (任意):' : 'Parent Folder:'}
                  </label>
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                    className="w-full h-7 px-1.5 bg-input-bg border border-border-main text-text-bright text-[11px] outline-none cursor-pointer"
                  >
                    <option value="">{language === 'JP' ? '-- 最上位（ルート） --' : '-- Root --'}</option>
                    {getHierarchicalCategories(categories).map(cat => (
                      <option key={cat.id} value={cat.id}>📁 {getCategoryIndentedLabel(cat, categories)}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-2.5 py-1 bg-base-bg border border-border-main text-text-dim hover:text-text-bright text-[10px] cursor-pointer"
                  >
                    {t.cancel || 'キャンセル'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="px-3 py-1 bg-accent-bg text-accent-text font-bold border border-border-light text-[10px] cursor-pointer disabled:opacity-40"
                  >
                    {language === 'JP' ? '作成して選択' : 'Create & Select'}
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-text-dim mt-0.5">
              {language === 'JP' 
                ? '※ 保存したいフォルダを選択（または作成）してください。「未割り当て」のまま保存することもできます。' 
                : '* Choose or create the folder where this link should be stored.'}
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

