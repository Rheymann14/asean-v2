import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2).join(' ');

rmSync('resources/js/routes', { recursive: true, force: true });
rmSync('resources/js/actions', { recursive: true, force: true });
rmSync('resources/js/wayfinder', { recursive: true, force: true });

execSync(`php artisan wayfinder:generate ${args}`, { stdio: 'inherit' });

const routesIndexPath = 'resources/js/routes/index.ts';

// Wayfinder can emit the `queryParams` import from the wayfinder helper twice
// (once for routes, once for form variants), which breaks the build with
// "Identifier 'queryParams' has already been declared". Match it robustly —
// regardless of import path form ('../wayfinder' vs './../wayfinder') or a
// trailing semicolon — and keep only the first occurrence.
const isQueryParamsWayfinderImport = (line) =>
    /^\s*import\s*\{[^}]*\bqueryParams\b[^}]*\}\s*from\s*['"][^'"]*wayfinder['"];?\s*$/.test(
        line,
    );

if (existsSync(routesIndexPath)) {
    const contents = readFileSync(routesIndexPath, 'utf8');
    const lines = contents.split('\n');
    let seenImport = false;
    const cleaned = lines.filter((line) => {
        if (!isQueryParamsWayfinderImport(line)) {
            return true;
        }
        if (seenImport) {
            return false;
        }
        seenImport = true;
        return true;
    });

    if (cleaned.join('\n') !== contents) {
        writeFileSync(routesIndexPath, cleaned.join('\n'));
    }
}
