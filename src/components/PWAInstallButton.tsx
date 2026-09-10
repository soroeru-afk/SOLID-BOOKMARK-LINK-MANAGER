import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';
import { Language } from '../i18n';

interface Props {
  language: Language;
}

export function PWAInstallButton({ language }: Props) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // すでにインストール済みの場合は非表示
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop インストール可能状態
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1 border border-border-main hover:border-border-light bg-base-bg text-text-normal hover:text-text-bright transition-colors cursor-pointer select-none text-[10px] font-bold font-mono tracking-wider shrink-0"
        title={language === 'JP' ? 'PWAアプリとしてPC/スマホにインストール' : 'Install PWA App'}
      >
        <Download size={11} className="text-text-dim" />
        <span>{language === 'JP' ? 'PWAインストール' : 'INSTALL PWA'}</span>
      </button>
    );
  }

  // iOS Safari ガイド
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-border-main hover:border-border-light bg-base-bg text-text-normal hover:text-text-bright transition-colors cursor-pointer select-none text-[10px] font-bold font-mono tracking-wider shrink-0"
          title={language === 'JP' ? 'iOSホーム画面に追加' : 'Add to iOS Home Screen'}
        >
          <Download size={11} className="text-text-dim" />
          <span>{language === 'JP' ? 'iOS追加' : 'INSTALL PWA'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm border border-border-light bg-base-bg p-5 shadow-2xl text-text-bright font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-border-main pb-2 mb-3">
                <span className="font-bold tracking-wider">[ PWA INSTALL GUIDE: iOS ]</span>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="text-text-dim hover:text-text-bright cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-text-normal leading-relaxed mb-4">
                {language === 'JP' ? (
                  <>
                    1. Safari下の<strong>「共有」アイコン</strong>をタップします。<br />
                    2. メニューから<strong>「ホーム画面に追加」</strong>を選択してください。<br />
                    3. スタンドアロンアプリとして高速起動します。
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                    3. Launch as a standalone cyber-solid app.
                  </>
                )}
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-1.5 bg-border-main hover:bg-border-light text-text-bright border border-border-light font-bold text-center cursor-pointer transition-colors"
              >
                [ CLOSE ]
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
