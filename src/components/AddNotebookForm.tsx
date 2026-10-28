import React, { useState, useEffect } from 'react';
import { ChevronDown, Database, Type, X, Plus, FolderPlus, Check, Loader2 } from 'lucide-react';
import { Category } from '../types';
import { Language, i18n } from '../i18n';
import { getHierarchicalCategories, getCategoryIndentedLabel } from '../utils/categoryUtils';

interface Props {
  categories: Category[];
  activeCategoryId: string | null;
  onAdd: (items: {title: string, url: string, categoryId: string}[]) => void;
  onAddCategory?: (name: string, parentId?: string | null) => void;
  onClose: () => void;
  language: Language;
}

export default function AddNotebookForm({ categories, activeCategoryId, onAdd, onAddCategory, onClose, language }: Props) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // インライン新規フォルダ作成用ステート
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');

  const t = i18n[language];

  // 現在選択されているカテゴリを初期値として設定
  useEffect(() => {
    if (activeCategoryId && activeCategoryId !== '__UNASSIGNED__') {
      setCategoryId(activeCategoryId);
    } else {
      setCategoryId('');
    }
  }, [activeCategoryId]);

// HTMLエンティティのデコード
  const decodeHtmlEntities = (str: string): string => {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      return txt.value;
    } catch {
      return str;
    }
  };

  const fetchTitle = async (targetUrl: string) => {
    let cleanUrl = sanitizeUrl(targetUrl);
    if (!cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setIsFetching(true);
    let resolvedTitle = '';

    try {
      // 1. YouTube専用 oEmbed API（ブラウザ直アクセス最速＆100%成功）
      if (/(?:youtube\.com\/(?:watch\?|shorts\/|live\/)|youtu\.be\/)/i.test(cleanUrl)) {
        try {
          const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`, {
            signal: AbortSignal.timeout(4000)
          });
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData?.title && typeof ytData.title === 'string' && ytData.title.trim()) {
              resolvedTitle = decodeHtmlEntities(ytData.title.trim());
            }
          }
        } catch (e) {
          console.warn('YouTube oEmbed title fetch failed, fallback to Jina', e);
        }
      }

      // 2. Tier 1: Jina Reader API (CORS完全対応・最速・日本語タイトル抽出に圧倒的な精度)
      if (!resolvedTitle) {
        try {
          const jinaRes = await fetch(`https://r.jina.ai/${cleanUrl}`, {
            headers: {
              'Accept': 'application/json',
              'X-No-Cache': 'true'
            },
            signal: AbortSignal.timeout(6000)
          });
          if (jinaRes.ok) {
            const data = await jinaRes.json();
            if (data?.data?.title && typeof data.data.title === 'string' && data.data.title.trim()) {
              resolvedTitle = decodeHtmlEntities(data.data.title.trim());
            }
          }
        } catch (e) {
          console.warn('Tier 1 (Jina) title fetch failed, trying fallback...', e);
        }
      }

      // 3. Tier 2: Microlink API (フォールバック)
      if (!resolvedTitle) {
        try {
          const mlRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}`, {
            signal: AbortSignal.timeout(5000)
          });
          if (mlRes.ok) {
            const data = await mlRes.json();
            if (data?.data?.title && typeof data.data.title === 'string' && data.data.title.trim()) {
              resolvedTitle = decodeHtmlEntities(data.data.title.trim());
            }
          }
        } catch (e) {
          console.warn('Tier 2 (Microlink) title fetch failed, trying local server...', e);
        }
      }

      // 4. Tier 3: ローカル開発サーバー (/api/fetch-title)
      if (!resolvedTitle) {
        try {
          const localRes = await fetch(`/api/fetch-title?url=${encodeURIComponent(cleanUrl)}`, {
            signal: AbortSignal.timeout(3000)
          });
          if (localRes.ok) {
            const data = await localRes.json();
            if (data?.title && typeof data.title === 'string' && data.title.trim()) {
              resolvedTitle = decodeHtmlEntities(data.title.trim());
            }
          }
        } catch {
          // ignore local server error on static Pages
        }
      }

      // タイトルが取得できたら自動設定
      if (resolvedTitle && resolvedTitle.trim()) {
        setTitle(resolvedTitle.trim());
      }
    } catch (error) {
      console.error('Failed to fetch title', error);
    } finally {
      setIsFetching(false);
    }
  };

  // 二重貼り付けや重複プロトコルを自動修復・クリーンアップする関数
  const sanitizeUrl = (input: string): string => {
    let clean = input.trim();
    if (!clean) return '';

    // https://...https://... のように二重貼り付けされた場合の自動修復
    const secondHttpIdx = clean.slice(7).search(/https?:\/\//i);
    if (secondHttpIdx !== -1) {
      const splitIdx = secondHttpIdx + 7;
      const firstPart = clean.slice(0, splitIdx);
      const secondPart = clean.slice(splitIdx);
      if (firstPart === secondPart || firstPart.startsWith(secondPart) || secondPart.startsWith(firstPart)) {
        clean = secondPart;
      } else {
        // 重複部分の後半を優先
        clean = secondPart;
      }
    }

    return clean;
  };
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const clean = sanitizeUrl(rawVal);
    setUrl(clean);

    if (!title.trim() && clean.length > 7 && (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('.'))) {
      fetchTitle(clean);
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // ブラウザのデフォルト貼り付け動作による二重入力を完全遮断
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.trim()) {
      const clean = sanitizeUrl(pastedText);
      setUrl(clean);
      if (!title.trim()) {
        fetchTitle(clean);
      }
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newFolderName.trim() || !onAddCategory) return;
    
    const name = newFolderName.trim();
    const pId = newFolderParentId || null;
    
    const parent = pId ? categories.find(c => c.id === pId) : null;
    const path = parent ? `${parent.path || parent.name} / ${name}` : name;
    const newId = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    
    onAddCategory(name, pId);
    setCategoryId(newId);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'single') {
      if (!url.trim()) return;
      let finalTitle = title.trim();
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      if (!finalTitle) {
        try {
          finalTitle = new URL(finalUrl).hostname;
        } catch {
          finalTitle = 'New Link';
        }
      }

      onAdd([{ title: finalTitle, url: finalUrl, categoryId }]);
      setTitle('');
      setUrl('');
      onClose();
    } else {
      if (!bulkText.trim()) return;
      const rawUrls = bulkText.split(/\s+/).filter(u => u.trim().length > 0);
      if (rawUrls.length === 0) return;
      
      const items = rawUrls.map(u => {
        let cleanU = u.trim();
        if (!/^https?:\/\//i.test(cleanU)) {
          cleanU = 'https://' + cleanU;
        }
        let parsedTitle = cleanU;
        try {
          const urlObj = new URL(cleanU);
          parsedTitle = urlObj.hostname;
        } catch {
          // fallback
        }
        
        return {
          title: parsedTitle,
          url: cleanU,
          categoryId
        };
      });
      
      onAdd(items);
      setBulkText('');
      setMode('single');
      onClose();
    }
  };

  return (
    <div className="border border-border-main bg-base-bg p-3.5 mb-3 relative w-full shrink-0 flex flex-col gap-3 animate-in fade-in duration-150">
      {/* フォームヘッダー */}
      <div className="flex items-center justify-between border-b border-border-main/50 pb-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-text-bright tracking-wider flex items-center gap-1">
            <Plus size={12} className="text-text-bright" />
            {t.addBookmark}
          </span>
          <div className="flex items-center gap-2 border-l border-border-main/50 pl-3">
            <button 
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center gap-1.5 text-[10px] tracking-wide transition-colors cursor-pointer ${
                mode === 'single' ? 'text-text-bright font-bold' : 'text-text-dim hover:text-text-normal'
              }`}
            >
              <Type size={11} /> {t.manualInput}
            </button>
            <button 
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex items-center gap-1.5 text-[10px] tracking-wide transition-colors cursor-pointer ${
                mode === 'bulk' ? 'text-text-bright font-bold' : 'text-text-dim hover:text-text-normal'
              }`}
            >
              <Database size={11} /> {t.bulkExtract}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-text-dim hover:text-text-bright transition-colors p-1 cursor-pointer flex items-center gap-1 text-[10px]"
          title={t.closeForm}
        >
          <X size={13} />
          <span>{t.closeForm}</span>
        </button>
      </div>
      
      {/* フォームボディ */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'single' ? (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row items-end gap-3 w-full">
              {/* URL入力（自動タイトル取得連動） */}
              <div className="flex-[1.5] w-full">
                <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider flex items-center justify-between">
                  <span>{t.dataStreamUrl} <strong className="text-amber-400">*</strong></span>
                  {isFetching && (
                    <span className="text-[9px] text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                      <Loader2 size={10} className="animate-spin" />
                      {language === 'JP' ? 'タイトル自動取得中...' : 'FETCHING TITLE...'}
                    </span>
                  )}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  onPaste={handleUrlPaste}
                  onBlur={() => {
                    const clean = sanitizeUrl(url);
                    setUrl(clean);
                    if (!title.trim() && clean) {
                      fetchTitle(clean);
                    }
                  }}
                  placeholder="https://..."
                  className="w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[11px] font-mono"
                  autoFocus
                  required
                />
              </div>

              {/* タイトル入力 */}
              <div className="flex-[1.5] w-full">
                <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>{t.title}</span>
                    {isFetching && (
                      <span className="inline-flex items-center gap-1 text-[8.5px] text-accent-text font-bold animate-pulse">
                        <Loader2 size={10} className="animate-spin" />
                        <span>{language === 'JP' ? 'タイトル自動取得中...' : 'Fetching title...'}</span>
                      </span>
                    )}
                  </span>
                  <span className="text-[8.5px] text-text-dim/60">{language === 'JP' ? '※URL入力で自動補完されます' : 'Auto-filled from URL'}</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={language === 'JP' ? 'タイトル（空欄でURLから自動設定）' : t.enterNodeId}
                  className="w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[11px]"
                />
              </div>

              {/* カテゴリ選択プルダウン & 新規フォルダ作成トグルボタン */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[9.5px] text-text-dim tracking-wider">{t.targetDir}</label>
                  {onAddCategory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(prev => !prev)}
                      className="text-[9px] text-accent-text hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      title={language === 'JP' ? '新しい保存先フォルダをその場で作成' : 'Create new folder inline'}
                    >
                      <FolderPlus size={11} />
                      <span>{language === 'JP' ? '+ 新規フォルダ' : '+ New Folder'}</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select 
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="appearance-none w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light transition-colors text-[10.5px] cursor-pointer"
                  >
                    <option value="">{t.unassigned}</option>
                    {getHierarchicalCategories(categories).map(c => (
                      <option key={c.id} value={c.id}>📁 {getCategoryIndentedLabel(c, categories)}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-dim">
                    <ChevronDown size={13} />
                  </div>
                </div>
              </div>

              {/* 登録ボタン */}
              <button 
                type="submit"
                disabled={!url.trim()}
                className="h-8 px-4 bg-border-main hover:bg-border-light text-text-bright active:bg-accent-bg active:text-accent-text transition-colors border border-border-main shrink-0 tracking-wider font-bold text-[10px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {t.allocate}
              </button>
            </div>

            {/* 新規フォルダ作成 インライン入力フォーム */}
            {isCreatingFolder && onAddCategory && (
              <div className="flex flex-col sm:flex-row items-end gap-2 p-2.5 bg-panel-bg border border-accent-text/40 rounded-xs animate-in fade-in duration-150">
                <div className="flex-1 w-full">
                  <label className="block text-[9px] text-accent-text font-bold mb-1">
                    {language === 'JP' ? '新規フォルダ名:' : 'New Folder Name:'}
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder={language === 'JP' ? '例: ニュース / 資料' : 'Folder name'}
                    className="w-full h-7 px-2 bg-base-bg border border-border-main text-text-bright text-[10.5px] focus:border-border-light outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex-1 w-full max-w-[200px]">
                  <label className="block text-[9px] text-text-dim mb-1">
                    {language === 'JP' ? '親フォルダ（任意）:' : 'Parent Folder:'}
                  </label>
                  <select
                    value={newFolderParentId}
                    onChange={e => setNewFolderParentId(e.target.value)}
                    className="w-full h-7 px-1.5 bg-base-bg border border-border-main text-text-bright text-[10px] outline-none cursor-pointer"
                  >
                    <option value="">{language === 'JP' ? '-- ルート（最上位） --' : '-- Root --'}</option>
                    {getHierarchicalCategories(categories).map(c => (
                      <option key={c.id} value={c.id}>📁 {getCategoryIndentedLabel(c, categories)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCreateFolderSubmit}
                    disabled={!newFolderName.trim()}
                    className="h-7 px-3 bg-accent-bg text-accent-text border border-border-light font-bold text-[9.5px] cursor-pointer disabled:opacity-40"
                  >
                    {language === 'JP' ? '作成して選択' : 'Create & Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="h-7 px-2 bg-transparent border border-border-main text-text-dim hover:text-text-bright text-[9.5px] cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="w-full">
              <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider">{t.pasteText}</label>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder="https://example.com/link1&#10;https://example.com/link2&#10;..."
                className="w-full h-20 p-2.5 bg-panel-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors resize-none font-mono text-[10px]"
                autoFocus
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
              <div className="flex-1 w-full max-w-[320px]">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[9.5px] text-text-dim tracking-wider">{t.targetDir}</label>
                  {onAddCategory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(prev => !prev)}
                      className="text-[9px] text-accent-text hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <FolderPlus size={11} />
                      <span>{language === 'JP' ? '+ 新規フォルダ' : '+ New Folder'}</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select 
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="appearance-none w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light transition-colors text-[10.5px]"
                  >
                    <option value="">{t.unassigned}</option>
                    {getHierarchicalCategories(categories).map(c => (
                      <option key={c.id} value={c.id}>📁 {getCategoryIndentedLabel(c, categories)}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-dim">
                    <ChevronDown size={13} />
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={!bulkText.trim()}
                className="h-8 px-4 bg-border-main hover:bg-border-light text-text-bright active:bg-accent-bg active:text-accent-text transition-colors border border-border-main shrink-0 tracking-wider flex items-center gap-1.5 font-bold text-[10px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Database size={11} /> {t.extractAllocate}
              </button>
            </div>

            {/* 一括登録時の新規フォルダ作成フォーム */}
            {isCreatingFolder && onAddCategory && (
              <div className="flex flex-col sm:flex-row items-end gap-2 p-2.5 bg-panel-bg border border-accent-text/40 rounded-xs animate-in fade-in duration-150">
                <div className="flex-1 w-full">
                  <label className="block text-[9px] text-accent-text font-bold mb-1">
                    {language === 'JP' ? '新規フォルダ名:' : 'New Folder Name:'}
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder={language === 'JP' ? '例: 一括保存フォルダ' : 'Folder name'}
                    className="w-full h-7 px-2 bg-base-bg border border-border-main text-text-bright text-[10.5px] focus:border-border-light outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex-1 w-full max-w-[200px]">
                  <label className="block text-[9px] text-text-dim mb-1">
                    {language === 'JP' ? '親フォルダ（任意）:' : 'Parent Folder:'}
                  </label>
                  <select
                    value={newFolderParentId}
                    onChange={e => setNewFolderParentId(e.target.value)}
                    className="w-full h-7 px-1.5 bg-base-bg border border-border-main text-text-bright text-[10px] outline-none cursor-pointer"
                  >
                    <option value="">{language === 'JP' ? '-- ルート（最上位） --' : '-- Root --'}</option>
                    {getHierarchicalCategories(categories).map(c => (
                      <option key={c.id} value={c.id}>📁 {getCategoryIndentedLabel(c, categories)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCreateFolderSubmit}
                    disabled={!newFolderName.trim()}
                    className="h-7 px-3 bg-accent-bg text-accent-text border border-border-light font-bold text-[9.5px] cursor-pointer disabled:opacity-40"
                  >
                    {language === 'JP' ? '作成して選択' : 'Create & Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="h-7 px-2 bg-transparent border border-border-main text-text-dim hover:text-text-bright text-[9.5px] cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
