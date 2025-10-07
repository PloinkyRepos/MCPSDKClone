import path from 'node:path';
import { builtinModules, createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const srcRoot = path.resolve(process.cwd(), 'src');
const entryPoint = path.resolve(srcRoot, 'index.ts');

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
        lib: {
            entry: entryPoint,
            formats: ['es'],
            fileName: () => 'index'
        },
        rollupOptions: {
            external: Array.from(external),
            treeshake: false,
            preserveEntrySignatures: 'strict',
            output: {
                format: 'es',
                entryFileNames: 'index.mjs',
                inlineDynamicImports: true,
                exports: 'named'
            }
        }
    },
    plugins: [
        {
            name: 'dist-package-json',
            apply: 'build',
            generateBundle() {
                const manifest = {
                    name: pkg.name,
                    version: pkg.version,
                    type: 'module',
                    main: './index.mjs',
                    module: './index.mjs',
                    exports: {
                        '.': './index.mjs'
                    }
                };

                this.emitFile({
                    type: 'asset',
                    fileName: 'package.json',
                    source: `${JSON.stringify(manifest, null, 4)}\n`
                });
            }
        }
    ]
};

export default config;
