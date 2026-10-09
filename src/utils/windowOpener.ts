export type WindowSizePreset = 'compact' | 'standard' | 'wide' | 'ultra' | 'fhd' | 'max' | 'custom';
export type LinkOpenMode = 'window' | 'tab';

export interface CustomWindowDimensions {
  width: number;
  height: number;
}

interface WindowOpenOptions {
  mode?: LinkOpenMode;
  preset?: WindowSizePreset;
  customDimensions?: CustomWindowDimensions;
}

/**
 * リンクを開く処理
 * カオルさまご指定仕様:
 * - オープン方式: 独立ウィンドウ固定
 * - サイズ: 1920 × 1100 固定
 */
export function openLink(url: string, _options?: WindowOpenOptions): void {
  // カオルさまご指定: 固定サイズ 1920 × 1100
  const targetW = 1920;
  const targetH = 1100;

  const screenW = typeof window !== 'undefined' ? (window.screen.availWidth || window.innerWidth || 1920) : 1920;
  const screenH = typeof window !== 'undefined' ? (window.screen.availHeight || window.innerHeight || 1080) : 1080;

  // 画面の有効領域に収まるように調整
  const width = Math.min(targetW, screenW);
  const height = Math.min(targetH, screenH);

  // 画面中央に配置
  const left = Math.max(0, Math.round((screenW - width) / 2));
  const top = Math.max(0, Math.round((screenH - height) / 2));

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
    'status=yes',
    'toolbar=yes',
    'menubar=no',
    'location=yes'
  ].join(',');

  const newWindow = window.open(url, '_blank', features);

  // ポップアップブロッカー等のフォールバック
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    newWindow.focus();
  }
}

