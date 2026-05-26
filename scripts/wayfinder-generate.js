import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2).join(' ');

rmSync('resources/js/routes', { recursive: true, force: true });
rmSync('resources/js/actions', { recursive: true, force: true });
rmSync('resources/js/wayfinder', { recursive: true, force: true });

execSync(`php artisan wayfinder:generate ${args}`, { stdio: 'inherit' });

const routesIndexPath = 'resources/js/routes/index.ts';
const duplicateImport =
    "import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from '../wayfinder';";

if (existsSync(routesIndexPath)) {
    const contents = readFileSync(routesIndexPath, 'utf8');
    const lines = contents.split('\n');
    let seenDuplicate = false;
    const cleaned = lines.filter((line) => {
        if (line !== duplicateImport) {
            return true;
        }
        if (seenDuplicate) {
            return false;
        }
        seenDuplicate = true;
        return true;
    });

    if (cleaned.join('\n') !== contents) {
        writeFileSync(routesIndexPath, cleaned.join('\n'));
    }
}
