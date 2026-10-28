export interface ColorPreset {
  id: string;
  name: string;
  color: string; // Hex color
  bgStyle: string;
  borderStyle: string;
}

export const DEFAULT_COLOR_PRESETS: ColorPreset[] = [
  { id: 'none', name: 'なし (標準)', color: '#64748b', bgStyle: 'transparent', borderStyle: 'var(--theme-border-main)' },
  { id: 'red', name: 'レッド (重要)', color: '#ef4444', bgStyle: 'rgba(239, 68, 68, 0.12)', borderStyle: 'rgba(239, 68, 68, 0.6)' },
  { id: 'orange', name: 'オレンジ (進行中)', color: '#f97316', bgStyle: 'rgba(249, 115, 22, 0.12)', borderStyle: 'rgba(249, 115, 22, 0.6)' },
  { id: 'amber', name: 'アンバー (要確認)', color: '#f59e0b', bgStyle: 'rgba(245, 158, 11, 0.12)', borderStyle: 'rgba(245, 158, 11, 0.6)' },
  { id: 'green', name: 'グリーン (完了)', color: '#10b981', bgStyle: 'rgba(16, 185, 129, 0.12)', borderStyle: 'rgba(16, 185, 129, 0.6)' },
  { id: 'teal', name: 'ティール (参考)', color: '#14b8a6', bgStyle: 'rgba(20, 184, 166, 0.12)', borderStyle: 'rgba(20, 184, 166, 0.6)' },
  { id: 'blue', name: 'ブルー (メモ)', color: '#3b82f6', bgStyle: 'rgba(59, 130, 246, 0.12)', borderStyle: 'rgba(59, 130, 246, 0.6)' },
  { id: 'purple', name: 'パープル (特記)', color: '#8b5cf6', bgStyle: 'rgba(139, 92, 246, 0.12)', borderStyle: 'rgba(139, 92, 246, 0.6)' },
  { id: 'pink', name: 'ピンク (注目)', color: '#ec4899', bgStyle: 'rgba(236, 72, 153, 0.12)', borderStyle: 'rgba(236, 72, 153, 0.6)' },
  { id: 'gray', name: 'グレー (保管)', color: '#94a3b8', bgStyle: 'rgba(148, 163, 184, 0.12)', borderStyle: 'rgba(148, 163, 184, 0.5)' },
];

export function getColorPresets(): ColorPreset[] {
  const saved = localStorage.getItem('custom_color_presets');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse custom_color_presets", e);
    }
  }
  return DEFAULT_COLOR_PRESETS;
}

export function saveColorPresets(presets: ColorPreset[]) {
  localStorage.setItem('custom_color_presets', JSON.stringify(presets));
}

export function getColorPresetById(id?: string, customPresets?: ColorPreset[]): ColorPreset | undefined {
  if (!id || id === 'none') return undefined;
  const list = customPresets || getColorPresets();
  return list.find(p => p.id === id);
}
