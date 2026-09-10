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

export function openLink(url: string, options: WindowOpenOptions = {}): void {
  const { mode = 'window', preset = 'standard', customDimensions } = options;

  // タブモードの場合は標準の新しいタブで開く
  if (mode === 'tab') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // 独立ウィンドウモード
  const screenW = typeof window !== 'undefined' ? (window.screen.availWidth || window.innerWidth) : 1920;
  const screenH = typeof window !== 'undefined' ? (window.screen.availHeight || window.innerHeight) : 1080;

  // プリセットごとの基準サイズ
  let targetW: number;
  let targetH: number;

  switch (preset) {
    case 'compact':
      targetW = 1040;
      targetH = 760;
      break;
    case 'wide':
      targetW = 1440;
      targetH = 960;
      break;
    case 'ultra':
      // 特大サイズ
      targetW = 1680;
      targetH = 1020;
      break;
    case 'fhd':
      // カオルさまご指定: 超特大 1920 × 1160
      targetW = 1920;
      targetH = 1160;
      break;
    case 'max':
      // 画面最大化
      targetW = Math.round(screenW * 0.98);
      targetH = Math.round(screenH * 0.96);
      break;
    case 'custom':
      targetW = customDimensions?.width || 1560;
      targetH = customDimensions?.height || 980;
      break;
    case 'standard':
    default:
      // デスクトップサイト（株探、各種ポータル等）が綺麗に収まる標準
      targetW = 1280;
      targetH = 880;
      break;
  }

  // 画面の98%まで許容し、大画面ストリートビューやFHDウィンドウにもフル対応
  const width = Math.min(targetW, Math.max(640, Math.round(screenW * 0.98)));
  const height = Math.min(targetH, Math.max(480, Math.round(screenH * 0.96)));

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
