const fs = require('fs');
const path = 'C:/Users/Note/.gemini/antigravity/scratch/crm-saas/locucao_original.mp4';
const b64 = fs.readFileSync(path).toString('base64');
const out = 'window.USER_AUDIO_BASE64 = "data:audio/mp4;base64,' + b64 + '";\n';
fs.writeFileSync('C:/Users/Note/.gemini/antigravity/scratch/crm-saas/locucao_base64.js', out);
fs.writeFileSync('C:/Users/Note/OneDrive/Área de Trabalho/locucao_base64.js', out);
console.log('Successfully generated locucao_base64.js, size:', out.length);
