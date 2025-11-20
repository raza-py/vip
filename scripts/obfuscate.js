const fs = require('fs');
const path = require('path');
const { obfuscate } = require('javascript-obfuscator');

function findWorkerJs(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      const found = findWorkerJs(full);
      if (found) return found;
    } else if (f.isFile() && f.name.endsWith('.js')) {
      return full;
    }
  }
  return null;
}

(async () => {
  try {
    const distDir = path.resolve(process.cwd(), 'dist');
    const workerFile = findWorkerJs(distDir);
    if (!workerFile) {
      console.error('[obfuscate] ❌ No .js worker file found in dist (searched', distDir, ').');
      process.exitCode = 2;
      return;
    }
    console.log(`[obfuscate] ✅ Found worker file: ${workerFile}`);

    const code = fs.readFileSync(workerFile, 'utf8');

    if (!code || code.trim().length === 0) {
      console.error(`[obfuscate] ❌ Worker file is empty: ${workerFile}`);
      process.exitCode = 3;
      return;
    }

    console.log('[obfuscate] 🚀 Obfuscating...');
    const obfuscated = obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false,
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      rotateStringArray: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: false
    });

    fs.writeFileSync(workerFile, obfuscated.getObfuscatedCode(), 'utf8');
    console.log(`[obfuscate] 🎉 Obfuscation complete. File overwritten at: ${workerFile}`);
  } catch (err) {
    console.error('[obfuscate] ❌ Obfuscation failed:', err);
    process.exitCode = 1;
  }
})();
