/**
 * URLからWebページのタイトルを自動取得するユーティリティ（Antigravity高精度仕様）
 * - YouTube公式oEmbed / Jina Reader / Microlink 多重フォールバック
 * - Botガード（Human Verification / Robot Check / 英語キャッチコピー等）の自動検知＆破棄
 * - 大手サイト（株探、Amazon、Yahoo!ファイナンス、メルカリ等）のスマート日本語補完
 */

// HTMLエンティティデコーダー
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  try {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  } catch {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => {
        try { return String.fromCharCode(parseInt(dec, 10)); } catch { return ''; }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try { return String.fromCharCode(parseInt(hex, 16)); } catch { return ''; }
      });
  }
}

// Botガード判定・エラー画面・無効タイトルの検知
export function isGarbageTitle(title: string): boolean {
  if (!title) return true;
  const clean = title.trim().toLowerCase();
  const garbagePatterns = [
    /^human verification/i,
    /^robot check/i,
    /^just a moment\.\.\./i,
    /^attention required/i,
    /^access denied/i,
    /^security check/i,
    /^cloudflare/i,
    /^40[34] forbidden/i,
    /^50[023] service/i,
    /^books, apparel, electronics, groceries & more/i,
    /^amazon captcha/i,
    /^one moment, please\.\.\./i,
    /^enable javascript/i,
    /^blocked/i,
    /^verify you are human/i,
    /^shieldsquare captcha/i,
    /^ddos-guard/i,
  ];

  return garbagePatterns.some((pattern) => pattern.test(clean));
}

// ドメイン知識に基づくスマートな日本語タイトルフォールバック
export function getSmartFallbackTitle(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/^\/|\/$/g, '');
    const searchParams = parsed.searchParams;

    // 1. 株探 (kabutan.jp)
    if (host.includes('kabutan.jp')) {
      const code = searchParams.get('code');
      if (code) {
        return `株探 (かぶたん) [銘柄: ${code}]`;
      }
      if (path.includes('news')) return '株探 (かぶたん) - 株式ニュース';
      if (path.includes('themes')) return '株探 (かぶたん) - テーマ情報';
      return '株探 (かぶたん) - 株式情報';
    }

    // 2. Amazon (amazon.co.jp / amazon.com)
    if (host.includes('amazon.co.jp') || host.includes('amazon.com')) {
      const isJp = host.includes('amazon.co.jp');
      const brand = isJp ? 'Amazon.co.jp' : 'Amazon.com';
      const dpMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (dpMatch && dpMatch[1]) {
        const asin = dpMatch[1];
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 1 && !['dp', 'gp'].includes(segments[0])) {
          try {
            const prodName = decodeURIComponent(segments[0]).replace(/[-_]+/g, ' ');
            return `${prodName} | ${brand}`;
          } catch {
            // fallback
          }
        }
        return `${brand} [商品コード: ${asin}]`;
      }
      return isJp ? 'Amazon.co.jp (アマゾン)' : 'Amazon.com';
    }

    // 3. Yahoo!ファイナンス
    if (host.includes('finance.yahoo.co.jp')) {
      const code = searchParams.get('code') || path.split('/').pop();
      if (code && /^[0-9A-Za-z.]+$/.test(code)) {
        return `Yahoo!ファイナンス [${code}]`;
      }
      return 'Yahoo!ファイナンス';
    }

    // 4. 楽天市場
    if (host.includes('rakuten.co.jp')) {
      return '楽天市場 (Rakuten)';
    }

    // 5. メルカリ
    if (host.includes('mercari.com')) {
      return 'メルカリ (Mercari)';
    }

    // 6. みんかぶ (MINKABU)
    if (host.includes('minkabu.jp')) {
      return 'みんかぶ (MINKABU)';
    }

    // 7. 会社四季報オンライン
    if (host.includes('shikiho.toyokeizai.net')) {
      return '会社四季報オンライン';
    }

    // 8. 日本経済新聞
    if (host.includes('nikkei.com')) {
      return '日本経済新聞 (日経電子版)';
    }

    // 9. X / Twitter
    if (host === 'x.com' || host === 'twitter.com') {
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 1 && !segments[0].startsWith('i/')) {
        return `X (@${segments[0]})`;
      }
      return 'X (Twitter)';
    }

    // 10. YouTube (フォールバック)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return 'YouTube';
    }

    // 一般的なWebサイトのドメイン名フォールバック
    const parts = host.split('.');
    const main = parts.length >= 2 ? parts[0] : host;
    return main.charAt(0).toUpperCase() + main.slice(1);
  } catch {
    return 'Web Link';
  }
}

/**
 * URLからタイトルを取得（多重フォールバック＋Bot判定サニタイズ）
 */
export async function fetchPageTitle(rawUrl: string): Promise<string> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl) return '';
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  let resolvedTitle = '';

  // 1. YouTube判定（ブラウザ直oEmbedが世界最速＆100%成功）
  if (/(?:youtube\.com\/(?:watch\?|shorts\/|live\/)|youtu\.be\/)/i.test(targetUrl)) {
    try {
      const ytController = new AbortController();
      const ytTimeout = setTimeout(() => ytController.abort(), 4000);
      const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`, {
        signal: ytController.signal,
      });
      clearTimeout(ytTimeout);
      if (ytRes.ok) {
        const ytData = await ytRes.json();
        if (ytData?.title && typeof ytData.title === 'string' && ytData.title.trim()) {
          resolvedTitle = decodeHtmlEntities(ytData.title.trim());
        }
      }
    } catch {
      // フォールスルー
    }
  }

  // 2. Tier 1: Jina Reader API (CORS完全対応・日本語タイトル抽出に極めて強力)
  if (!resolvedTitle || isGarbageTitle(resolvedTitle)) {
    try {
      const jinaController = new AbortController();
      const jinaTimeout = setTimeout(() => jinaController.abort(), 5500);
      const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
        headers: {
          'Accept': 'application/json',
          'X-No-Cache': 'true',
        },
        signal: jinaController.signal,
      });
      clearTimeout(jinaTimeout);
      if (jinaRes.ok) {
        const jinaData = await jinaRes.json();
        if (jinaData?.data?.title && typeof jinaData.data.title === 'string' && jinaData.data.title.trim()) {
          const candidate = decodeHtmlEntities(jinaData.data.title.trim());
          if (!isGarbageTitle(candidate)) {
            resolvedTitle = candidate;
          }
        }
      }
    } catch {
      // フォールスルー
    }
  }

  // 3. Tier 2: Microlink API (フォールバック)
  if (!resolvedTitle || isGarbageTitle(resolvedTitle)) {
    try {
      const mlController = new AbortController();
      const mlTimeout = setTimeout(() => mlController.abort(), 4500);
      const mlRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`, {
        signal: mlController.signal,
      });
      clearTimeout(mlTimeout);
      if (mlRes.ok) {
        const mlData = await mlRes.json();
        if (mlData?.data?.title && typeof mlData.data.title === 'string' && mlData.data.title.trim()) {
          const candidate = decodeHtmlEntities(mlData.data.title.trim());
          if (!isGarbageTitle(candidate)) {
            resolvedTitle = candidate;
          }
        }
      }
    } catch {
      // フォールスルー
    }
  }

  // 4. Tier 3: ローカル開発サーバー (/api/fetch-title)
  if (!resolvedTitle || isGarbageTitle(resolvedTitle)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`/api/fetch-title?url=${encodeURIComponent(targetUrl)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data?.title && typeof data.title === 'string' && data.title.trim()) {
          const candidate = decodeHtmlEntities(data.title.trim());
          if (!isGarbageTitle(candidate)) {
            resolvedTitle = candidate;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 5. 取得できたタイトルが空、または「Human Verification」「Robot Check」等のBot判定だった場合
  if (!resolvedTitle || isGarbageTitle(resolvedTitle)) {
    resolvedTitle = getSmartFallbackTitle(targetUrl);
  }

  return resolvedTitle;
}
