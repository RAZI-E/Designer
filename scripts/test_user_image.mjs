import fs from 'fs';

async function runTest() {
  const filePath = 'C:/Users/razim/.gemini/antigravity-ide/brain/5cf6236f-5251-4ed1-9b97-f6b786165ac4/website_design.png';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('image', blob, 'website design.png');

  console.log('Sending website design.png to http://localhost:3000/api/analyze-vision...');
  const t0 = Date.now();
  const res = await fetch('http://localhost:3000/api/analyze-vision', {
    method: 'POST',
    body: formData,
  });

  console.log(`Status: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`);
  if (!res.ok) {
    const err = await res.text();
    console.error('Error response:', err);
    return;
  }

  const data = await res.json();
  console.log('Vision Analysis Success!');
  console.log('AST extracted keys:', Object.keys(data.ast || {}));
  
  // Save the raw AST to file
  fs.writeFileSync(
    'C:/Users/razim/.gemini/antigravity-ide/brain/5cf6236f-5251-4ed1-9b97-f6b786165ac4/scratch/website_design_ast.json',
    JSON.stringify(data.ast, null, 2)
  );

  console.log('\nGenerating Blueprint via http://localhost:3000/api/generate-prompt...');
  const promptRes = await fetch('http://localhost:3000/api/generate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ast: data.ast }),
  });

  console.log(`Prompt status: ${promptRes.status} ${promptRes.statusText}`);
  const promptData = await promptRes.json();

  fs.writeFileSync(
    'C:/Users/razim/.gemini/antigravity-ide/brain/5cf6236f-5251-4ed1-9b97-f6b786165ac4/scratch/website_design_prompt.md',
    promptData.fullBlueprint || ''
  );

  console.log('\n--- FULL GENERATED BLUEPRINT ---\n');
  console.log(promptData.fullBlueprint);
}

runTest().catch(console.error);
