const https = require('https');

const scopes = [
  'file_content:read',
  'files:read',
  'file_metadata:read',
  'current_user:read',
  'file_comments:read',
  'file_variables:read',
  'projects:read',
  'webhooks:read',
  'file_content:read,current_user:read',
  'file_content:read,file_metadata:read',
];

async function checkScope(s) {
  return new Promise((resolve) => {
    const url = 'https://www.figma.com/oauth?client_id=fvcgGfROZ6WM4pqsT1xctp&redirect_uri=' + encodeURIComponent('https://designer.lavaithan.com/api/figma/callback') + '&scope=' + encodeURIComponent(s) + '&response_type=code&state=test';
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const location = res.headers['location'] || '';
        let isError = data.includes('Invalid scopes for app') || data.includes('"error":true') || location.includes('error');
        resolve({ scope: s, statusCode: res.statusCode, location, isError, sample: data.slice(0, 80).trim() });
      });
    });
    req.on('error', (e) => resolve({ scope: s, error: e.message }));
  });
}

(async () => {
  for (const s of scopes) {
    const res = await checkScope(s);
    console.log(`SCOPE: "${s}" => ${res.statusCode} | loc: ${res.location} | ${res.isError ? 'FAIL: ' + res.sample : 'OK'}`);
  }
})();
