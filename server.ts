import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS対応（PWAや他オリジンからのAPI呼び出し対応）
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // HTMLエンティティデコーダー
  function decodeEntities(str: string): string {
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

  app.get("/api/fetch-title", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        }
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch URL" });
      }

      // 日本語文字コード（Shift_JIS / EUC-JP / UTF-8）の検出とデコード
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || '';
      let encoding = 'utf-8';
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch && charsetMatch[1]) {
        encoding = charsetMatch[1].trim().toLowerCase();
      }

      let html = '';
      try {
        const decoder = new TextDecoder(encoding);
        html = decoder.decode(buffer);
      } catch {
        html = new TextDecoder('utf-8').decode(buffer);
      }

      // HTMLの meta charset フォールバック確認
      if (encoding === 'utf-8') {
        const metaCharsetMatch = html.match(/<meta[^>]+charset=["']?([^"'>\s/]+)/i);
        if (metaCharsetMatch && metaCharsetMatch[1] && !metaCharsetMatch[1].toLowerCase().includes('utf')) {
          try {
            const secondaryDecoder = new TextDecoder(metaCharsetMatch[1].trim());
            html = secondaryDecoder.decode(buffer);
          } catch {
            // そのまま継続
          }
        }
      }

      // 1. <title>タグ（改行・空白に対応）
      let title = '';
      const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (match && match[1]) {
        title = decodeEntities(match[1].replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim());
      }

      // 2. og:title / twitter:title フォールバック
      if (!title) {
        const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                     || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
                     || html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
        if (ogMatch && ogMatch[1]) {
          title = decodeEntities(ogMatch[1].replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim());
        }
      }

      res.json({ title });
    } catch (error) {
      console.error("Error fetching title:", error);
      res.status(500).json({ error: "Failed to fetch title" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
