import fs from 'fs';

async function captureUrlToImage(inputUrl) {
  let cleanUrl = inputUrl.trim();

  // 1. Check data URL
  if (cleanUrl.startsWith('data:image/')) {
    const matches = cleanUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return { mimeType: matches[1], base64Data: matches[2] };
    }
  }

  // 2. Check local file path
  let filePath = cleanUrl;
  if (filePath.startsWith('file:///')) {
    filePath = decodeURIComponent(filePath.replace(/^file:\/\/\//, ''));
  }
  if (/^[a-zA-Z]:[\\\/]/.test(filePath) || filePath.startsWith('/') || filePath.startsWith('\\')) {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const ext = filePath.split('.').pop()?.toLowerCase();
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'svg') mimeType = 'image/svg+xml';
      return { mimeType, base64Data: buffer.toString('base64') };
    }
  }

  // 3. Remote URL
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  console.log('Fetching URL:', cleanUrl);
  let res = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  console.log('Content-Type:', contentType);

  // If directly an image
  if (contentType.startsWith('image/')) {
    const arrayBuf = await res.arrayBuffer();
    return { mimeType: contentType.split(';')[0], base64Data: Buffer.from(arrayBuf).toString('base64') };
  }

  // If HTML or website, capture screenshot of the website!
  console.log('Target is a webpage, capturing live screenshot via mShots...');
  const mShotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=1920&h=1080`;
  let shotRes = await fetch(mShotsUrl);
  if (shotRes.ok && (shotRes.headers.get('content-type') || '').startsWith('image/')) {
    const buf = await shotRes.arrayBuffer();
    console.log('Successfully captured screenshot via mShots! Size:', buf.byteLength);
    return { mimeType: 'image/jpeg', base64Data: Buffer.from(buf).toString('base64') };
  }

  // Fallback screenshot service
  console.log('Trying fallback screenshot service...');
  const thumUrl = `https://image.thum.io/get/width/1920/crop/1080/noanimate/${encodeURIComponent(cleanUrl)}`;
  let thumRes = await fetch(thumUrl);
  if (thumRes.ok) {
    const buf = await thumRes.arrayBuffer();
    console.log('Successfully captured screenshot via Thum.io! Size:', buf.byteLength);
    return { mimeType: 'image/png', base64Data: Buffer.from(buf).toString('base64') };
  }

  throw new Error('Could not capture screenshot of URL: ' + cleanUrl);
}

async function test() {
  // Test local path
  const local = await captureUrlToImage('C:\\Users\\razim\\.gemini\\antigravity-ide\\brain\\5cf6236f-5251-4ed1-9b97-f6b786165ac4\\website_design.png');
  console.log('Local image loaded successfully, base64 length:', local.base64Data.length);

  // Test website URL
  const web = await captureUrlToImage('https://news.ycombinator.com');
  console.log('Web screenshot captured successfully, mime:', web.mimeType, 'base64 length:', web.base64Data.length);
}

test().catch(console.error);
