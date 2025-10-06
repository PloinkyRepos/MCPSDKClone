import path from 'node:path';
import { readdirSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const srcRoot = path.resolve(process.cwd(), 'src');

function collectEntryPoints(root) {
    const entries = [];
    const stack = [root];

    while (stack.length > 0) {
        const current = stack.pop();
        const children = readdirSync(current, { withFileTypes: true });

        for (const child of children) {
            if (child.name.startsWith('.')) {
                continue;
            }

            const fullPath = path.join(current, child.name);

            if (child.isDirectory()) {
                if (child.name === '__mocks__' || child.name === '__tests__') {
                    continue;
                }
                stack.push(fullPath);
                continue;
            }

            if (!child.isFile()) {
                continue;
            }

            const isTypeScript = child.name.endsWith('.ts') || child.name.endsWith('.tsx');
            if (!isTypeScript) {
                continue;
            }

            if (
                child.name.endsWith('.d.ts') ||
                child.name.endsWith('.test.ts') ||
                child.name.endsWith('.spec.ts') ||
                child.name.endsWith('.stories.ts')
            ) {
                continue;
            }

            entries.push(fullPath);
        }
    }

    return entries;
}

const entryPoints = collectEntryPoints(srcRoot);

const external = new Set([
    ...builtinModules,
    ...builtinModules.map(mod => `node:${mod}`),
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {})
]);

/** @type {import('vite').UserConfig} */
const config = {
    resolve: {
        alias: {
            src: srcRoot
        }
    },
    build: {
        target: 'node18',
        sourcemap: true,
        minify: false,
        emptyOutDir: true,
        rollupOptions: {
            input: entryPoints,
            external: Array.from(external),
            treeshake: false,
            preserveEntrySignatures: 'strict',
            output: [
                {
                    dir: 'dist/esm',
                    format: 'es',
                    preserveModules: true,
                    preserveModulesRoot: 'src',
                    entryFileNames: '[name].js',
                    chunkFileNames: '[name].js',
                    assetFileNames: '[name][extname]'
                },
                {
                    dir: 'dist/cjs',
                    format: 'cjs',
                    preserveModules: true,
                    preserveModulesRoot: 'src',
                    entryFileNames: '[name].js',
                    chunkFileNames: '[name].js',
                    assetFileNames: '[name][extname]'
                }
            ]
        }
    },
    plugins: [
        {
            name: 'dist-package-jsons',
            apply: 'build',
            generateBundle(options) {
                const dir = options.dir ?? '';
                const outDir = typeof dir === 'string' ? path.basename(dir) : '';

                if (outDir === 'esm') {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'package.json',
                        source: JSON.stringify({ type: 'module' })
                    });
                } else if (outDir === 'cjs') {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'package.json',
                        source: JSON.stringify({ type: 'commonjs' })
                    });
                }
            }
        }
    ]
};

export default config;
