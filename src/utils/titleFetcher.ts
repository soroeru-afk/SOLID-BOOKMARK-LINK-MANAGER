/**
 * URLからWebページのタイトルを自動取得するユーティリティ
 * PWAスタンドアロン環境、AI Studio環境、静的ホスティング環境のいずれでも確実に動作する多層フォールバック構成
 */

// HTMLエンティティデコーダー
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
}

// HTML文字列からタイトル（またはog:title / twitter:title）を抽出
function extractTitleFromHtml(html: string): string {
  if (!html) return '';

  // 1. <title>タグ（複数行・属性付き対応）
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const raw = titleMatch[1].trim();
    if (raw) return cleanExtractedTitle(decodeHtmlEntities(raw));
  }

  // 2. OpenGraph og:title
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) 
               || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogMatch && ogMatch[1]) {
    const raw = ogMatch[1].trim();
    if (raw) return cleanExtractedTitle(decodeHtmlEntities(raw));
  }

  // 3. Twitter Card twitter:title
  const twMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)
               || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
  if (twMatch && twMatch[1]) {
    const raw = twMatch[1].trim();
    if (raw) return cleanExtractedTitle(decodeHtmlEntities(raw));
  }

  return '';
}

// タイトル文字列の整形（余分な空白や改行の除去）
function cleanExtractedTitle(title: string): string {
  return title
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// URLのホスト名やパスからフォールバック用の見出しを生成
export function fallbackTitleFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.replace(/^www\./i, '');
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const last = decodeURIComponent(pathSegments[pathSegments.length - 1])
        .replace(/[-_]+/g, ' ')
        .replace(/\.[a-zA-Z0-9]+$/, '');
      if (last.length > 1 && !/^\d+$/.test(last)) {
        return `${last} (${host})`;
      }
    }
    return host;
  } catch {
    return 'Web Link';
  }
}

/**
 * URLからタイトルを取得（多重フォールバック）
 * 1. YouTube専用 oEmbed API（CORS制限なし・高速）
 * 2. Jina Reader API（日本語対応・高速・CORS完全フリー）
 * 3. サーバーAPI (/api/fetch-title)（ローカル開発環境用）
 * 4. 公開CORSプロキシ (allorigins.win / corsproxy.io)
 * 5. Microlink API
 * 6. URLパースフォールバック
 */
export async function fetchPageTitle(rawUrl: string): Promise<string> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl) return '';
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // Tier 1: YouTubeの場合は公式oEmbedがブラウザ直で最速＆CORS完全フリー
  const isYouTube = /(?:youtube\.com\/(?:watch\?|shorts\/|live\/)|youtu\.be\/)/i.test(targetUrl);
  if (isYouTube) {
    try {
      const ytController = new AbortController();
      const ytTimeout = setTimeout(() => ytController.abort(), 3500);
      const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`, {
        signal: ytController.signal,
      });
      clearTimeout(ytTimeout);
      if (ytRes.ok) {
        const ytData = await ytRes.json();
        if (ytData.title && ytData.title.trim()) {
          return ytData.title.trim();
        }
      }
    } catch {
      // 次の手段へフォールスルー
    }
  }

  // Tier 2: Jina Reader API（CORS完全対応・日本語タイトル抽出に圧倒的な精度）
  try {
    const jinaController = new AbortController();
    const jinaTimeout = setTimeout(() => jinaController.abort(), 4500);
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
        return cleanExtractedTitle(decodeHtmlEntities(jinaData.data.title.trim()));
      }
    }
  } catch {
    // 次の手段へフォールスルー
  }

  // Tier 3: ローカルサーバープロキシ (/api/fetch-title)
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
      if (data.title && typeof data.title === 'string' && data.title.trim()) {
        return data.title.trim();
      }
    }
  } catch {
    // サーバーが利用できない場合（静的PWAやネットワーク問題）はTier 4へ
  }

  // Tier 4: ブラウザ側 CORSプロキシ (AllOrigins)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(allOriginsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data.contents) {
        const parsedTitle = extractTitleFromHtml(data.contents);
        if (parsedTitle) {
          return parsedTitle;
        }
      }
    }
  } catch {
    // 次のプロキシへ
  }

  // Tier 5: 予備CORSプロキシ (corsproxy.io)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const parsedTitle = extractTitleFromHtml(html);
      if (parsedTitle) {
        return parsedTitle;
      }
    }
  } catch {
    // 最終手段へ
  }

  // Tier 6: Microlink API
  try {
    const mlController = new AbortController();
    const mlTimeout = setTimeout(() => mlController.abort(), 4000);
    const mlRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`, {
      signal: mlController.signal,
    });
    clearTimeout(mlTimeout);
    if (mlRes.ok) {
      const mlData = await mlRes.json();
      if (mlData?.data?.title && typeof mlData.data.title === 'string' && mlData.data.title.trim()) {
        return cleanExtractedTitle(decodeHtmlEntities(mlData.data.title.trim()));
      }
    }
  } catch {
    // 最終手段へ
  }

  // Tier 7: URLからホスト名・パスを抽出したフォールバック
  return fallbackTitleFromUrl(targetUrl);
}
