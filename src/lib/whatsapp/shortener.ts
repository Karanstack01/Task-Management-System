// Dynamic URL Shortener Service (CBXIT with TinyURL & Local Fallback)

export async function generateShortUrl(originalUrl: string): Promise<string> {
  if (!originalUrl) return "";

  // 1. Try Primary: CBXIT URL Shortener
  try {
    const cbxitRes = await fetch("https://cbxit.in/api/generateShortUrl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: originalUrl }),
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (cbxitRes.ok) {
      const data = await cbxitRes.json();
      if (data && (data.shortUrl || data.short_url || data.url)) {
        return data.shortUrl || data.short_url || data.url;
      }
    }
  } catch {
    // CBXIT unavailable or offline, continue to fallback
  }

  // 2. Secondary Fallback: TinyURL API
  try {
    const tinyRes = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(originalUrl)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (tinyRes.ok) {
      const tinyText = await tinyRes.text();
      if (tinyText.startsWith("http")) {
        return tinyText.trim();
      }
    }
  } catch {
    // TinyURL offline
  }

  // 3. Deterministic Local Test Hash Fallback
  const hash = Math.abs(
    originalUrl.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  ).toString(36).substring(0, 6);

  return `https://cbxit.in/t/${hash}`;
}

