// TEST-ONLY module resolution for `node --test`: the app uses the Next.js
// "@/src" alias and extensionless imports that Node cannot resolve on its own.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.jsx'];

function withExtension(base) {
    for (const ext of EXTENSIONS) {
        const file = base + ext;
        if (existsSync(file)) return file;
    }
    for (const ext of EXTENSIONS) {
        const file = join(base, `index${ext}`);
        if (existsSync(file)) return file;
    }
    return null;
}

export function resolve(specifier, context, next) {
    let target = null;
    if (specifier.startsWith('@/'))
        target = join(root, 'src', specifier.slice(2));
    else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:'))
        target = fileURLToPath(new URL(specifier, context.parentURL));
    if (target && !/\.(ts|tsx|js|mjs|jsx|json|css)$/.test(target)) {
        const file = withExtension(target);
        if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    return next(specifier, context);
}
