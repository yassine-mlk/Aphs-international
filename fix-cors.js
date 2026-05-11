import fs from 'fs';
import path from 'path';

const functionsDir = path.join(process.cwd(), 'supabase/functions');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('_shared')) {
        results = results.concat(getFiles(file));
      }
    } else if (file.endsWith('index.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles(functionsDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Enlever ALLOWED_ORIGINS s'il existe
  content = content.replace(/const ALLOWED_ORIGINS = \[.*?\];\n?/gs, '');

  // Remplacer getCorsHeaders s'il existe
  content = content.replace(/const getCorsHeaders = \(req\?: Request\) => \{[\s\S]*?return \{[\s\S]*?\};\n\};\n?/gs, '');

  // Remplacer corsHeaders object s'il existe
  content = content.replace(/const corsHeaders = \{[\s\S]*?Access-Control-Allow-Origin[\s\S]*?\};\n?/gs, '');

  if (original !== content) {
    // Déterminer quoi importer en fonction de l'utilisation
    let imports = [];
    if (content.includes('getCorsHeaders')) imports.push('getCorsHeaders');
    if (content.includes('corsHeaders')) imports.push('corsHeaders');
    
    if (imports.length > 0 && !content.includes('_shared/cors.ts')) {
      const importStmt = `import { ${imports.join(', ')} } from '../_shared/cors.ts';\n`;
      
      // Trouver la première ligne qui n'est pas un import Deno pour insérer le nôtre
      const lines = content.split('\n');
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ') && lines[i].includes('https://')) {
          insertIndex = i + 1;
        }
      }
      
      lines.splice(insertIndex, 0, importStmt);
      content = lines.join('\n');
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Updated ${file}`);
  }
});
