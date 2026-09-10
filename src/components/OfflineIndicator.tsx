import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Language } from '../i18n';

export function OfflineIndicator({ language }: { language: Language }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-amber-950/90 text-amber-200 border border-amber-500 font-mono text-[10px] shadow-lg">
      <WifiOff size={13} className="text-amber-400 animate-pulse" />
      <span>{language === 'JP' ? 'オフライン稼働中（キャッシュ利用）' : 'OFFLINE MODE (CACHED)'}</span>
    </div>
  );
}
