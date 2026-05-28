const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../src/app/api');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const catchRegex = /catch\s*\(\s*(error|error:\s*unknown)\s*\)\s*\{\s*if\s*\(\s*error\s*instanceof\s*Error\s*&&\s*error\.message\s*===\s*'Unauthorized'\s*\)\s*\{\s*return\s*NextResponse\.json\(\s*\{\s*error:\s*'Unauthorized'\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\);\s*\}\s*(console\.error\([^)]*\);\s*)?(const\s*message\s*=\s*error\s*instanceof\s*Error\s*\?\s*error\.message\s*:\s*['"][^'"]*['"];\s*)?return\s*NextResponse\.json\(\s*\{\s*error:\s*(message|error\.message)\s*\}\s*,\s*\{\s*status:\s*500\s*\}\s*\);\s*\}/g;

walkDir(apiDir, filePath => {
  if (path.basename(filePath) !== 'route.ts') return;
  // Skip auth route
  if (filePath.includes('api/auth/')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let replaced = false;

  if (catchRegex.test(content)) {
    content = content.replace(catchRegex, 'catch (error) {\n    return handleRouteError(error);\n  }');
    replaced = true;
  }

  if (replaced) {
    // Add import statement if not present
    if (!content.includes('@/lib/db/error-sanitizer')) {
      // Add it after the first import line
      const lines = content.split('\n');
      lines.splice(1, 0, "import { handleRouteError } from '@/lib/db/error-sanitizer';");
      content = lines.join('\n');
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated route file: ${filePath}`);
  } else {
    // Check if it already has handleRouteError
    if (content.includes('handleRouteError')) {
      console.log(`Route file already updated: ${filePath}`);
    } else {
      console.warn(`WARNING: catch block did not match regex in: ${filePath}`);
    }
  }
});
