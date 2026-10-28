import { useState, useEffect, useRef } from 'react';
import { Theme, FontFamily } from '../App';
import { Language, i18n } from '../i18n';
import { Type, ChevronDown, Sliders, Bookmark, Maximize2, Minimize2, PanelLeft, PanelRight, Check, Image } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  font: FontFamily;
  onFontChange: (font: FontFamily) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  listFontSize: number;
  onListFontSizeChange: (size: number) => void;
  linkFontSize: number;
  onLinkFontSizeChange: (size: number) => void;
  onOpenBookmarklet?: () => void;
  onOpenIconModal?: () => void;
  sidebarPosition?: 'left' | 'right';
  onToggleSidebarPosition?: () => void;
}

const THEMES: Theme[] = ['dark', 'black', 'paper', 'pink', 'light', 'red'];

export default function Header({ 
  theme, 
  onThemeChange, 
  font,
  onFontChange,
  language, 
  onLanguageChange,
  listFontSize,
  onListFontSizeChange,
  linkFontSize,
  onLinkFontSizeChange,
  onOpenBookmarklet,
  onOpenIconModal,
  sidebarPosition = 'left',
  onToggleSidebarPosition
}: Props) {
  const t = i18n[language];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error("Error attempting to exit fullscreen:", err);
        });
      }
    }
  };

  const getThemeLabel = (th: Theme): string => {
    switch (th) {
      case 'dark': return 'NAVY';
      case 'black': return 'BLACK';
      case 'paper': return 'PAPER';
      case 'pink': return 'PINK';
      case 'light': return 'LIGHT';
      case 'red': return 'RED';
      default: return String(th).toUpperCase();
    }
  };

  const getThemeDotBg = (th: Theme): string => {
    switch (th) {
      case 'dark': return '#2563eb';
      case 'black': return '#334155';
      case 'paper': return '#d9532f';
      case 'pink': return '#d0587e';
      case 'light': return '#0284c7';
      case 'red': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <header className="flex flex-wrap justify-between items-center w-full shrink-0 border border-border-main bg-panel-bg p-3.5 relative gap-3">
        <div className="absolute top-0 left-0 bg-base-bg px-2 -mt-[0.6rem] ml-4 text-[10px] text-text-dim font-bold tracking-widest">
            {t.systemControl}
        </div>
        <div className="flex items-center gap-4">
            <span className="text-[10px] text-text-dim font-mono">{t.canvasEnv}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px]">
            {/* テキストサイズスライダー群 */}
            <div className="flex flex-wrap items-center gap-2">
              {/* リスト名サイズ */}
              <div 
                className="flex items-center gap-2.5 bg-base-bg border border-border-main hover:border-border-light px-2.5 py-1 transition-colors select-none"
                title={language === 'JP' ? 'サイドバーのリスト（フォルダ名）の文字サイズを変更' : 'Adjust folder/list font size'}
              >
                <span className="text-text-dim font-mono flex items-center gap-1.5 shrink-0 font-medium tracking-wider text-[10px]">
                  <Sliders size={11} className="text-text-dim" />
                  <span>{t.listSize}</span>
                </span>
                <input 
                  type="range"
                  min={9}
                  max={18}
                  step={1}
                  value={listFontSize}
                  onChange={(e) => onListFontSizeChange(Number(e.target.value))}
                  className="solid-slider w-16 sm:w-20"
                />
                <span className="font-mono font-bold text-text-bright text-[10px] min-w-[28px] text-right">
                  {listFontSize}PX
                </span>
              </div>

              {/* リンク名サイズ */}
              <div 
                className="flex items-center gap-2.5 bg-base-bg border border-border-main hover:border-border-light px-2.5 py-1 transition-colors select-none"
                title={language === 'JP' ? 'ブックマークのリンク名の文字サイズを変更' : 'Adjust bookmark link font size'}
              >
                <span className="text-text-dim font-mono flex items-center gap-1.5 shrink-0 font-medium tracking-wider text-[10px]">
                  <Sliders size={11} className="text-text-dim" />
                  <span>{t.linkSize}</span>
                </span>
                <input 
                  type="range"
                  min={10}
                  max={22}
                  step={1}
                  value={linkFontSize}
                  onChange={(e) => onLinkFontSizeChange(Number(e.target.value))}
                  className="solid-slider w-16 sm:w-20"
                />
                <span className="font-mono font-bold text-text-bright text-[10px] min-w-[28px] text-right">
                  {linkFontSize}PX
                </span>
              </div>
            </div>

            {/* フォント切り替え */}
            <div className="flex items-center gap-1.5">
                <span className="text-text-dim font-mono flex items-center gap-1">
                  <Type size={12} className="text-text-dim" />
                  {t.font}:
                </span>
                <div className="relative">
                  <select
                    value={font}
                    onChange={(e) => onFontChange(e.target.value as FontFamily)}
                    className="appearance-none bg-base-bg border border-border-main text-text-bright hover:border-border-light pl-2.5 pr-6 py-1 text-[10px] font-bold transition-colors cursor-pointer focus:outline-none"
                  >
                    <option value="meiryo">{t.fontMeiryo}</option>
                    <option value="noto">{t.fontNoto}</option>
                    <option value="yugothic">{t.fontYuGothic}</option>
                    <option value="biz">{t.fontBiz}</option>
                    <option value="mono">{t.fontMono}</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-text-dim">
                    <ChevronDown size={12} />
                  </div>
                </div>
            </div>

            {/* テーマ切り替え（ドロップダウンメニュー） */}
            <div className="relative shrink-0" ref={themeDropdownRef}>
              <button 
                type="button"
                onClick={() => setIsThemeDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-2.5 py-1 border border-border-main hover:border-border-light bg-base-bg text-text-bright transition-all cursor-pointer select-none shrink-0 font-mono font-bold text-[10px]"
                title={language === 'JP' ? 'テーマ切り替えメニューを開く' : 'Open theme menu'}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30 shadow-xs" 
                  style={{ backgroundColor: getThemeDotBg(theme) }}
                />
                <span className="inline-block min-w-[38px] text-left">{getThemeLabel(theme)}</span>
                <ChevronDown size={11} className={`text-text-dim transition-transform ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* ドロップダウン ポップアップ */}
              {isThemeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-panel-bg border border-border-main shadow-2xl z-50 overflow-hidden font-mono text-[11px]">
                  <div className="px-3 py-2 border-b border-border-main text-[10px] text-text-dim font-bold flex items-center gap-1.5 bg-base-bg">
                    <span>🎨</span>
                    <span>{language === 'JP' ? 'テーマ切り替え' : 'SELECT THEME'}</span>
                  </div>
                  <div className="py-1">
                    {THEMES.map((th) => {
                      const isSelected = th === theme;
                      return (
                        <button
                          key={th}
                          type="button"
                          onClick={() => {
                            onThemeChange(th);
                            setIsThemeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors cursor-pointer text-left font-bold ${
                            isSelected 
                              ? 'bg-accent-bg text-accent-text' 
                              : 'text-text-normal hover:bg-base-bg hover:text-text-bright'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30" 
                              style={{ backgroundColor: getThemeDotBg(th) }} 
                            />
                            <span>{getThemeLabel(th)}</span>
                          </div>
                          {isSelected && <Check size={13} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* 言語切り替え */}
            <div className="flex border border-border-main rounded-xs text-[10px] overflow-hidden leading-none shrink-0 bg-base-bg font-mono">
              <button
                onClick={() => onLanguageChange('EN')}
                className={`px-2.5 py-1 transition-colors font-bold cursor-pointer ${language === 'EN' ? 'bg-border-light text-white' : 'text-text-dim hover:text-text-bright'}`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('JP')}
                className={`px-2.5 py-1 transition-colors font-bold cursor-pointer ${language === 'JP' ? 'bg-border-light text-white' : 'text-text-dim hover:text-text-bright'}`}
              >
                JP
              </button>
            </div>

            {/* 新規追加コントロール群（Side Change / 1クリック保存 / 全画面切り替え） */}
            <div className="flex items-center gap-1 shrink-0">
              {/* サイドバー左右移動（Side Change）ボタン */}
              {onToggleSidebarPosition && (
                <button
                  type="button"
                  onClick={onToggleSidebarPosition}
                  className="w-7 h-7 flex items-center justify-center bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright transition-colors cursor-pointer select-none rounded-xs shrink-0"
                  title={sidebarPosition === 'left' 
                    ? (language === 'JP' ? 'サイドバーを右側へ移動 (Side Change)' : 'Move Sidebar to Right') 
                    : (language === 'JP' ? 'サイドバーを左側へ移動 (Side Change)' : 'Move Sidebar to Left')}
                >
                  {sidebarPosition === 'left' ? <PanelRight size={13} /> : <PanelLeft size={13} />}
                </button>
              )}

              {/* PC用 1クリック保存ボタン設定 */}
              {onOpenBookmarklet && (
                <button
                  type="button"
                  onClick={onOpenBookmarklet}
                  className="w-7 h-7 flex items-center justify-center bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright transition-colors cursor-pointer select-none rounded-xs shrink-0"
                  title={language === 'JP' ? '1クリックWeb保存機能（ブックマークレット）の設定' : '1-Click Web Saver Setup'}
                >
                  <Bookmark size={13} />
                </button>
              )}

              {/* アイコン変更ボタン */}
              {onOpenIconModal && (
                <button
                  type="button"
                  onClick={onOpenIconModal}
                  className="w-7 h-7 flex items-center justify-center bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright transition-colors cursor-pointer select-none rounded-xs shrink-0"
                  title={language === 'JP' ? 'アイコン変更 / 専用アイコン保管庫を表示' : 'Change Icon / Open Icon Vault'}
                >
                  <Image size={13} />
                </button>
              )}

              {/* フルスクリーン切り替えボタン */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-7 h-7 flex items-center justify-center bg-base-bg border border-border-main hover:border-border-light text-text-dim hover:text-text-bright transition-colors cursor-pointer select-none rounded-xs shrink-0"
                title={isFullscreen ? (language === 'JP' ? '全画面表示を解除' : 'Exit Fullscreen') : (language === 'JP' ? '全画面表示（フルスクリーン）' : 'Toggle Fullscreen')}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>

            {/* PWA インストールボタン */}
            <PWAInstallButton language={language} />
        </div>
    </header>
  );
}
