async function testDirectImageUrl() {
  const form = new FormData();
  form.append('imageUrl', 'https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png');

  console.log('Sending real image URL to http://localhost:3000/api/analyze-vision...');
  const res = await fetch('http://localhost:3000/api/analyze-vision', {
    method: 'POST',
    body: form,
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response success:', data.success);
  if (data.ast) {
    console.log('Theme:', data.ast.theme);
    console.log('Components:', data.ast.components?.length);
  } else {
    console.log('Error payload:', data);
  }
}

testDirectImageUrl().catch(console.error);
