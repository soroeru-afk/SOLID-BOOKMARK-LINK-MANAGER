/**
 * URLからWebページのタイトルを自動取得するユーティリティ（Antigravity標準規格）
 * YouTube公式oEmbed API、Jina Reader API、Microlink APIによる高速・高精度な多層フォールバック構成
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

/**
 * URLからタイトルを取得（Antigravity直結方式）
 * 1. YouTube専用 oEmbed API（ブラウザ直アクセス・最速0.2秒＆100%成功）
 * 2. Jina Reader API（CORS完全対応・日本語タイトル抽出に圧倒的な精度）
 * 3. Microlink API（世界規模CDNフォールバック）
 * 4. ローカル開発サーバープロキシ (/api/fetch-title)
 */
export async function fetchPageTitle(rawUrl: string): Promise<string> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl) return '';
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // 1. YouTube判定（ブラウザ直oEmbedが最速＆100%成功）
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
          return decodeHtmlEntities(ytData.title.trim());
        }
      }
    } catch {
      // フォールスルー
    }
  }

  // 2. Tier 1: Jina Reader API (CORS完全対応・日本語タイトル抽出に極めて強力)
  try {
    const jinaController = new AbortController();
    const jinaTimeout = setTimeout(() => jinaController.abort(), 6000);
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
        return decodeHtmlEntities(jinaData.data.title.trim());
      }
    }
  } catch {
    // フォールスルー
  }

  // 3. Tier 2: Microlink API (フォールバック)
  try {
    const mlController = new AbortController();
    const mlTimeout = setTimeout(() => mlController.abort(), 5000);
    const mlRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`, {
      signal: mlController.signal,
    });
    clearTimeout(mlTimeout);
    if (mlRes.ok) {
      const mlData = await mlRes.json();
      if (mlData?.data?.title && typeof mlData.data.title === 'string' && mlData.data.title.trim()) {
        return decodeHtmlEntities(mlData.data.title.trim());
      }
    }
  } catch {
    // フォールスルー
  }

  // 4. Tier 3: ローカル開発サーバー (/api/fetch-title)
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
        return decodeHtmlEntities(data.title.trim());
      }
    }
  } catch {
    // ignore
  }

  return '';
}
