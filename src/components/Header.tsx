import { Theme, FontFamily } from '../App';
import { Language, i18n } from '../i18n';
import { Type, ChevronDown, Palette } from 'lucide-react';

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  font: FontFamily;
  onFontChange: (font: FontFamily) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const THEMES: Theme[] = ['black', 'red', 'dark', 'light'];

export default function Header({ 
  theme, 
  onThemeChange, 
  font,
  onFontChange,
  language, 
  onLanguageChange 
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
      case 'red': return 'RED';
      case 'dark': return 'NAVY';
      case 'light': return 'LIGHT';
      default: return th;
    }
  };

  const getThemeDotColor = (th: Theme): string => {
    switch (th) {
      case 'black': return 'bg-zinc-400 border border-zinc-200';
      case 'red': return 'bg-red-500 border border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.6)]';
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
            <span className="text-[10px] text-text-dim">{t.canvasEnv}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[10px]">
            {/* フォント切り替え */}
            <div className="flex items-center gap-1.5">
                <span className="text-text-dim flex items-center gap-1">
                  <Type size={12} className="text-text-dim" />
                  {t.font}:
                </span>
                <div className="relative">
                  <select
                    value={font}
                    onChange={(e) => onFontChange(e.target.value as FontFamily)}
                    className="appearance-none bg-base-bg border border-border-main text-text-normal hover:text-text-bright hover:border-border-light pl-2.5 pr-6 py-1 text-[10px] font-medium transition-colors cursor-pointer focus:outline-none"
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
              className="flex items-center gap-2 px-2.5 py-1 border border-border-main hover:border-border-light bg-base-bg text-text-normal hover:text-text-bright transition-all cursor-pointer select-none"
              title={language === 'JP' ? 'クリックしてテーマ切り替え (BLACK → RED → NAVY → LIGHT)' : 'Click to cycle theme (BLACK → RED → NAVY → LIGHT)'}
            >
              <Palette size={12} className="text-text-dim" />
              <span className="text-text-dim">{t.theme}</span>
              <span className="flex items-center gap-1.5 font-bold font-mono">
                <span className={`w-2 h-2 rounded-full shrink-0 ${getThemeDotColor(theme)}`} />
                <span>{getThemeLabel(theme)}</span>
              </span>
            </button>
            
            {/* 言語切り替え */}
            <div className="flex border border-border-main rounded text-[10px] overflow-hidden leading-none shrink-0 bg-base-bg">
              <button
                onClick={() => onLanguageChange('EN')}
                className={`px-2.5 py-1 transition-colors font-bold cursor-pointer ${language === 'EN' ? 'bg-border-light text-text-bright' : 'text-text-dim hover:text-text-normal'}`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('JP')}
                className={`px-2.5 py-1 transition-colors font-bold cursor-pointer ${language === 'JP' ? 'bg-border-light text-text-bright' : 'text-text-dim hover:text-text-normal'}`}
              >
                JP
              </button>
            </div>
        </div>
    </header>
  );
}
