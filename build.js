import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const watch = process.argv.includes('--watch');
const banner = readFileSync('src/hw-daily/banner.txt', 'utf8').trimEnd();

const ctx = await esbuild.context({
    entryPoints: ['src/hw-daily/index.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/hw-daily.user.js',
    banner: { js: banner },
    minify: false,
    target: ['chrome120', 'firefox120'],
});

if (watch) {
    await ctx.watch();
    console.log('[build] Watching src/hw-daily/ ...');
} else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[build] dist/hw-daily.user.js written.');
}
