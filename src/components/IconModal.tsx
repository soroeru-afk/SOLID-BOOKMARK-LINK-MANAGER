import { Image, Check } from 'lucide-react';
import { Language } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function IconModal({ isOpen, onClose, language }: Props) {
  if (!isOpen) return null;

  const isJP = language === 'JP';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-panel-bg border-2 border-border-light text-text-bright w-full max-w-md p-5 shadow-2xl relative font-sans">
        <div className="flex items-center justify-between border-b border-border-main pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-text-bright" />
            <h3 className="font-bold font-mono text-sm tracking-wide text-text-bright">
              {isJP ? 'アイコン変更 / アイコン保管庫' : 'CHANGE ICON / ICON VAULT'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-bright p-1 transition-colors cursor-pointer text-xs font-mono font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs text-text-normal">
          <div className="bg-base-bg border border-border-main p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/01_2026_LINK_MANAGER_icon.png"
                alt="2026 LINK MANAGER ICON"
                className="w-14 h-14 object-contain border border-border-light bg-black p-1 shadow-md shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-bright font-mono text-[11px]">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>2026 LINK MANAGER</span>
                </div>
                <p className="text-[10px] text-text-dim">
                  {isJP
                    ? '2026年最新デザイン（地球・ネットワーク連動型リンクマネージャーアイコン）'
                    : '2026 Design Network Link Manager Icon'}
                </p>
                <div className="inline-block bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 px-2 py-0.5 text-[9px] font-mono font-bold">
                  {isJP ? '🟢 アプリ標準適用中' : '🟢 APPLIED TO APP'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-base-bg/60 border border-border-main p-3 space-y-2">
            <h4 className="font-bold text-text-bright text-[11px] font-mono flex items-center gap-1.5">
              <span>📂</span>
              <span>{isJP ? 'Windows ショートカットのアイコン変更手順' : 'Windows Shortcut Icon Guide'}</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-text-dim leading-relaxed">
              <li>{isJP ? 'デスクトップのショートカットを右クリック →「プロパティ」を選択' : 'Right-click shortcut → Properties'}</li>
              <li>{isJP ? '「アイコンの変更(C)...」ボタンをクリック' : 'Click "Change Icon..." button'}</li>
              <li>{isJP ? '「参照(B)...」をクリックし、以下の専用保管庫フォルダ内の .ico ファイルを選択' : 'Click "Browse..." and select .ico from the vault folder'}</li>
            </ol>

            <div className="mt-2 bg-black/60 p-2 border border-border-main font-mono text-[10px] text-text-bright break-all select-all">
              C:\Users\soroe\A-App\SOLID-BOOKMARK-LINK-MANAGER\専用アイコン保管庫\01_2026_LINK_MANAGER_icon.ico
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border-main flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-border-light text-white font-mono font-bold text-xs hover:bg-white hover:text-black transition-colors cursor-pointer"
          >
            {isJP ? '閉じる' : 'CLOSE'}
          </button>
        </div>
      </div>
    </div>
  );
}
