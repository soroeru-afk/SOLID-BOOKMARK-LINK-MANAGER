import React, { useState, useEffect } from 'react';
import { ChevronDown, Database, Type, X, Plus } from 'lucide-react';
import { Category } from '../types';
import { Language, i18n } from '../i18n';

interface Props {
  categories: Category[];
  activeCategoryId: string | null;
  onAdd: (items: {title: string, url: string, categoryId: string}[]) => void;
  onClose: () => void;
  language: Language;
}

export default function AddNotebookForm({ categories, activeCategoryId, onAdd, onClose, language }: Props) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const t = i18n[language];

  // 現在選択されているカテゴリを初期値として設定
  useEffect(() => {
    if (activeCategoryId && activeCategoryId !== '__UNASSIGNED__') {
      setCategoryId(activeCategoryId);
    } else {
      setCategoryId('');
    }
  }, [activeCategoryId]);

  const fetchTitle = async (targetUrl: string) => {
    if (!targetUrl || !targetUrl.startsWith('http')) return;
    setIsFetching(true);
    try {
      const response = await fetch(`/api/fetch-title?url=${encodeURIComponent(targetUrl)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.title && !title) {
          setTitle(data.title);
        }
      }
    } catch (error) {
      console.error('Failed to fetch title', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'single') {
      if (!title.trim() || !url.trim()) return;
      onAdd([{ title: title.trim(), url: url.trim(), categoryId }]);
      setTitle('');
      setUrl('');
      onClose();
    } else {
      if (!bulkText.trim()) return;
      const rawUrls = bulkText.split(/\s+/).filter(u => u.trim().startsWith('http'));
      if (rawUrls.length === 0) return;
      
      const items = rawUrls.map(u => {
        let parsedTitle = u;
        try {
          const urlObj = new URL(u);
          parsedTitle = urlObj.hostname;
        } catch {
          // fallback
        }
        
        return {
          title: parsedTitle,
          url: u,
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
          <div className="flex flex-col sm:flex-row items-end gap-3 w-full">
            <div className="flex-[1.5] w-full">
              <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider">{t.title}</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t.enterNodeId}
                className="w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[11px]"
                autoFocus
              />
            </div>
            <div className="flex-[1.5] w-full">
              <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider">
                {t.dataStreamUrl} {isFetching && <span className="text-[9px] text-text-dim animate-pulse">(FETCHING TITLE...)</span>}
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onBlur={() => fetchTitle(url)}
                placeholder="https://..."
                className="w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal placeholder:text-text-dim/50 focus:outline-none focus:border-border-light transition-colors text-[11px]"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider">{t.targetDir}</label>
              <div className="relative">
                <select 
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="appearance-none w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light transition-colors text-[10.5px]"
                >
                  <option value="">{t.unassigned}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.path || c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-dim">
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>
            <button 
              type="submit"
              disabled={!title.trim() || !url.trim()}
              className="h-8 px-4 bg-border-main hover:bg-border-light text-text-bright active:bg-accent-bg active:text-accent-text transition-colors border border-border-main shrink-0 tracking-wider font-bold text-[10px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t.allocate}
            </button>
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
                <label className="block text-[9.5px] text-text-dim mb-1 tracking-wider">{t.targetDir}</label>
                <div className="relative">
                  <select 
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="appearance-none w-full h-8 px-2.5 bg-panel-bg border border-border-main text-text-normal focus:outline-none focus:border-border-light transition-colors text-[10.5px]"
                  >
                    <option value="">{t.unassigned}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.path || c.name}</option>
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
          </div>
        )}
      </form>
    </div>
  );
}
