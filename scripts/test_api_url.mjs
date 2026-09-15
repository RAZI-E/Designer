async function testApiUrl() {
  const form = new FormData();
  form.append('imageUrl', 'https://news.ycombinator.com');

  console.log('Sending https://news.ycombinator.com to http://localhost:3000/api/analyze-vision...');
  const res = await fetch('http://localhost:3000/api/analyze-vision', {
    method: 'POST',
    body: form,
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response success:', data.success);
  if (data.ast) {
    console.log('Theme:', data.ast.theme);
    console.log('Components detected:', data.ast.components?.length);
    console.log('Media assets detected:', data.ast.mediaAssets?.length);
  } else {
    console.log('Error payload:', data);
  }
}

testApiUrl().catch(console.error);
