import React, { useState } from 'react';
import { Bookmark, Copy, Check, X, ExternalLink, HelpCircle, Sparkles } from 'lucide-react';
import { Language, i18n } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export function BookmarkletModal({ isOpen, onClose, language }: Props) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const t = i18n[language];
  const appOrigin = window.location.origin + window.location.pathname;

  // ブックマークレット用JavaScriptコード
  const bookmarkletCode = `javascript:(function(){var t=encodeURIComponent(document.title),u=encodeURIComponent(location.href);window.open('${appOrigin}?add_title='+t+'&add_url='+u,'_blank');})();`;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-panel-bg border-2 border-border-light max-w-lg w-full p-5 relative shadow-2xl rounded-xs text-text-normal font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-text-dim hover:text-text-bright p-1 cursor-pointer transition-colors"
          title={t.cancel}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-text-bright font-bold text-sm border-b border-border-main/50 pb-2.5 mb-4">
          <Sparkles size={16} className="text-amber-400" />
          <span>{language === 'JP' ? 'PC用 1クリックWeb保存ボタン（ブックマークレット）' : '1-Click Web Saver (Bookmarklet)'}</span>
        </div>

        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-text-normal">
            {language === 'JP' 
              ? '他のWebサイトを見ている時に、下のボタンを押すだけで現在表示しているページのタイトルとURLを本アプリに即座にストックできます！' 
              : 'Save any webpage title & URL instantly while browsing! Drag the button below to your browser bookmark bar.'}
          </p>

          {/* ドラッグ用ボタンエリア */}
          <div className="bg-base-bg border border-dashed border-border-light p-4 flex flex-col items-center justify-center gap-2 text-center rounded-xs">
            <span className="text-[11px] font-bold text-text-dim">
              {language === 'JP' ? '👇 下のボタンをブラウザの「ブックマークバー」にドラッグ＆ドロップしてください' : '👇 Drag this button to your browser bookmark bar:'}
            </span>
            
            <a
              href={bookmarkletCode}
              onClick={(e) => {
                // 通常クリック時は説明とコードコピー
                e.preventDefault();
                handleCopyCode(e);
              }}
              draggable={true}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-bg text-accent-text font-bold font-mono text-xs border border-border-light shadow-md hover:brightness-110 active:scale-95 cursor-grab active:cursor-grabbing rounded-xs transition-transform select-none"
              title={language === 'JP' ? 'ブックマークバーへドラッグ＆ドロップしてください' : 'Drag to bookmark bar'}
            >
              <Bookmark size={14} className="fill-current" />
              <span>＋Solidに保存</span>
            </a>
          </div>

          {/* 使い方ステップ */}
          <div className="bg-base-bg/60 border border-border-main p-3 rounded-xs flex flex-col gap-2 text-[11px]">
            <span className="font-bold text-text-bright flex items-center gap-1">
              <HelpCircle size={13} className="text-text-dim" />
              {language === 'JP' ? '【使い方ステップ】' : '[How to Use]'}
            </span>
            <ol className="list-decimal list-inside space-y-1 text-text-dim pl-1">
              <li>
                {language === 'JP' ? '上の「＋Solidに保存」ボタンをブラウザのブックマークバーにドラッグします。' : 'Drag the "＋Solidに保存" button above to your bookmark bar.'}
              </li>
              <li>
                {language === 'JP' ? '好きなWebサイト（ニュース・記事など）を見ている時に、ブックマークバーの「＋Solidに保存」を押します。' : 'While visiting any webpage, click "＋Solidに保存" on your bookmark bar.'}
              </li>
              <li>
                {language === 'JP' ? '本アプリが自動で開き、ページ情報がそのまま1クリックで登録されます！' : 'This app opens and automatically captures and saves the page!'}
              </li>
            </ol>
          </div>

          {/* 手動URLコピー */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-input-bg border border-border-main hover:border-border-light text-text-bright text-[11px] font-mono font-bold transition-colors cursor-pointer rounded-xs"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? (language === 'JP' ? 'コードをコピーしました' : 'Code Copied!') : (language === 'JP' ? 'JavaScriptコードをコピー' : 'Copy JS Code')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-border-light text-white font-bold text-[11px] font-mono hover:bg-white hover:text-black transition-colors cursor-pointer rounded-xs"
            >
              {t.closeForm || '閉じる'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
