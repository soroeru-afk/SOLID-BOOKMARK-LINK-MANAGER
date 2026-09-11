import { Theme, FontFamily } from '../App';
import { Language, i18n } from '../i18n';
import { Type, ChevronDown, Palette, Sliders } from 'lucide-react';
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
}

const THEMES: Theme[] = ['black', 'red', 'dark', 'light'];

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
  onLinkFontSizeChange
}: Props) {
  const t = i18n[language];

  const handleToggleTheme = () => {
    const idx = THEMES.indexOf(theme);
    const nextTheme = THEMES[(idx + 1) % THEMES.length];
    onThemeChange(nextTheme);
  };

  const getThemeLabel = (th: Theme): string => {
    switch (th) {
      case 'black': return 'BLACK';
      case 'red': return 'CRIMSON RED';
      case 'dark': return 'NAVY';
      case 'light': return 'LIGHT';
      default: return th;
    }
  };

  const getThemeDotColor = (th: Theme): string => {
    switch (th) {
      case 'black': return 'bg-zinc-400 border border-zinc-200';
      case 'red': return 'bg-red-500 border border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
      case 'dark': return 'bg-sky-400 border border-sky-200';
      case 'light': return 'bg-amber-300 border border-amber-600';
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

            {/* テーマ切り替え（1つのトグルボタン） */}
            <button 
              type="button"
              onClick={handleToggleTheme}
              className="flex items-center gap-2 px-2.5 py-1 border border-border-main hover:border-border-light bg-base-bg text-text-normal hover:text-text-bright transition-all cursor-pointer select-none shrink-0"
              title={language === 'JP' ? 'クリックしてテーマ切り替え (BLACK → RED → NAVY → LIGHT)' : 'Click to cycle theme (BLACK → RED → NAVY → LIGHT)'}
            >
              <Palette size={12} className="text-text-dim shrink-0" />
              <span className="text-text-dim shrink-0 font-mono">{t.theme}:</span>
              <span className="flex items-center gap-1.5 font-bold font-mono">
                <span className={`w-2 h-2 rounded-full shrink-0 ${getThemeDotColor(theme)}`} />
                <span className="inline-block min-w-[50px] text-left text-text-bright font-bold">{getThemeLabel(theme)}</span>
              </span>
            </button>
            
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

            {/* PWA インストールボタン */}
            <PWAInstallButton language={language} />
        </div>
    </header>
  );
}
