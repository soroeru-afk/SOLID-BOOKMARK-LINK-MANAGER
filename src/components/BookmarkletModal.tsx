import React, { useState } from 'react';
import { Bookmark, Copy, Check, X, HelpCircle, Sparkles, Share2, AlertCircle, FolderPlus } from 'lucide-react';
import { Language, i18n } from '../i18n';
import { Category } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  categories?: Category[];
}

export function BookmarkletModal({ isOpen, onClose, language, categories = [] }: Props) {
  const [copied, setCopied] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  // パラメータを除外した現在のブラウザのURL
  const currentOrigin = window.location.origin + window.location.pathname;

  // 保存先アプリURL（カスタムURL設定・永続化）
  const [targetUrl, setTargetUrl] = useState<string>(() => {
    return localStorage.getItem('bookmarklet_target_url') || currentOrigin;
  });

  if (!isOpen) return null;

  const t = i18n[language];

  // 送信先URLの末尾のスラッシュ正規化
  const normalizedTargetUrl = targetUrl.trim();

  // カテゴリ指定URLフラグメント
  const catQueryFragment = selectedCategoryId ? `+'&category_id=${encodeURIComponent(selectedCategoryId)}'` : '';

  // ブックマークレット用JavaScriptコード (構文エラー修正版)
  const bookmarkletCode = `javascript:(function(){var t=encodeURIComponent(document.title),u=encodeURIComponent(location.href);var target='${normalizedTargetUrl}${normalizedTargetUrl.includes('?') ? '&' : '?'}add_title='+t+'&add_url='+u${catQueryFragment};var w=window.open(target,'_blank');if(!w||w.closed||typeof w.closed=='undefined'){location.href=target;}})();`;

  const handleTargetUrlChange = (newUrl: string) => {
    setTargetUrl(newUrl);
    localStorage.setItem('bookmarklet_target_url', newUrl);
  };

  const handleCopyCode = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
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
          <span>{language === 'JP' ? '1クリックWeb保存機能（ブックマークレット）の設定' : '1-Click Web Saver Setup'}</span>
        </div>

        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-text-normal">
            {language === 'JP' 
              ? '閲覧中のWebページの「タイトル」と「URL」を、1クリックで本アプリに自動保存するボタンの設定方法です。' 
              : 'Setup guide to save any webpage title & URL into this app with a single click while browsing!'}
          </p>

          {/* 重要なお知らせ (Chrome/Edgeのセキュリティ仕様) */}
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200/90 p-3 rounded-xs flex items-start gap-2 text-[11px]">
            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">
                {language === 'JP' ? '⚠️ Chrome / Edge をお使いの方へ' : '⚠️ For Chrome / Edge users'}
              </span>
              {language === 'JP' 
                ? '近年のブラウザセキュリティ強化により、ドラッグ＆ドロップ登録がブロックされる場合があります。以下の【2ステップ簡単登録】をおすすめします。' 
                : 'Modern browsers block dragging JavaScript links. Please use the 2-step setup below.'}
            </div>
          </div>

          {/* 2ステップ登録ガイド */}
          <div className="bg-base-bg border border-border-main p-3.5 rounded-xs flex flex-col gap-3 text-[11px]">
            <span className="font-bold text-text-bright flex items-center gap-1 text-xs">
              <HelpCircle size={14} className="text-amber-400" />
              {language === 'JP' ? '【2ステップ簡単登録手順】' : '[2-Step Easy Setup]'}
            </span>

            <div className="flex flex-col gap-2.5 text-text-dim pl-1">
              <div className="flex items-start gap-2">
                <span className="bg-accent-bg text-accent-text font-bold px-1.5 py-0.5 rounded-xs text-[10px] shrink-0 mt-0.5">STEP 1</span>
                <div>
                  <p className="font-bold text-text-normal mb-1">
                    {language === 'JP' ? '下のボタンを押して専用コードをコピーします' : 'Click the button below to copy the code'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyCode()}
                    className="flex items-center gap-2 px-3.5 py-2 bg-accent-bg text-accent-text font-bold font-mono text-xs border border-border-light shadow-md hover:brightness-110 active:scale-95 cursor-pointer rounded-xs transition-transform select-none"
                  >
                    {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                    <span>{copied ? (language === 'JP' ? '✅ コードをコピーしました！' : '✅ Code Copied!') : (language === 'JP' ? '1クリックでコードをコピー' : 'Copy JavaScript Code')}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 border-t border-border-main/40">
                <span className="bg-accent-bg text-accent-text font-bold px-1.5 py-0.5 rounded-xs text-[10px] shrink-0 mt-0.5">STEP 2</span>
                <div className="leading-normal">
                  <p className="font-bold text-text-normal mb-0.5">
                    {language === 'JP' ? 'ブラウザのブックマークバーに追加' : 'Add to your Bookmark Bar'}
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-text-dim">
                    <li>{language === 'JP' ? 'ブラウザのブックマークバーを右クリック ➔「ページを追加（またはブックマークを追加）」を選択' : 'Right-click your browser bookmark bar ➔ Click "Add page..."'}</li>
                    <li>{language === 'JP' ? '名前に「＋Solidに保存」と入力' : 'Set Name to "＋Solidに保存"'}</li>
                    <li>{language === 'JP' ? 'URL（またはアドレス）の欄にコピーしたコードを貼り付けて「保存」！' : 'Paste the copied code into the URL field and click Save!'}</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* 保存先カテゴリ選択 ＆ 保存先アプリURLの設定エリア */}
          <div className="bg-base-bg border border-border-main p-3 rounded-xs flex flex-col gap-2.5 text-[11px]">
            {/* 保存先カテゴリーの選択 */}
            {categories.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="font-bold text-text-bright flex items-center gap-1">
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>{language === 'JP' ? '📁 1クリック保存時の追加先フォルダ:' : '📁 Default Target Folder:'}</span>
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full h-7 px-2 bg-input-bg border border-border-main text-text-bright text-[11px] font-sans focus:border-border-light outline-none rounded-xs cursor-pointer"
                >
                  <option value="">{language === 'JP' ? '未割り当て (Unassigned)' : 'Unassigned'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.path || cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 保存先URL設定 */}
            <div className="flex flex-col gap-1 pt-1 border-t border-border-main/50">
              <div className="flex items-center justify-between font-bold text-text-bright">
                <span>{language === 'JP' ? '📌 保存先アプリのURL (PWA / 本番URL):' : '📌 Target App URL (PWA / Live URL):'}</span>
                <button
                  type="button"
                  onClick={() => handleTargetUrlChange('https://soroeru-afk.github.io/SOLID-BOOKMARK-LINK-MANAGER/')}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer font-normal"
                >
                  {language === 'JP' ? '本番PWAのURLを自動入力' : 'Auto-fill Live PWA URL'}
                </button>
              </div>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => handleTargetUrlChange(e.target.value)}
                placeholder="https://soroeru-afk.github.io/SOLID-BOOKMARK-LINK-MANAGER/"
                className="w-full h-7 px-2 bg-input-bg border border-border-main text-text-bright text-[11px] font-mono focus:border-border-light outline-none rounded-xs"
              />
            </div>
          </div>

          {/* インストール済みPWAアプリへの共有（Web Share Target）ワンポイントアドバイス */}
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200/90 p-2.5 rounded-xs flex items-start gap-2 text-[10.5px]">
            <Share2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-blue-300 block mb-0.5">
                {language === 'JP' ? '💡 インストールしたPWAアプリ画面で直接保存するには？' : '💡 Want to save directly inside your installed PWA window?'}
              </span>
              {language === 'JP' 
                ? 'PWAアプリをインストール済みの場合、スマホやPCの「共有（Share）」メニューに本アプリが表示されます。Web閲覧中に「共有 ➔ SOLID BOOKMARK」を選ぶことで、ブラウザタブを開かずに直接PWA画面で受け取れます！' 
                : 'After installing the PWA, select "Share ➔ SOLID BOOKMARK" in your OS share menu to send links directly to the app window!'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
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

