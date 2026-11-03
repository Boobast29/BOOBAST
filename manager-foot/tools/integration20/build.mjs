import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../vendor/integration20');
const result=await build({entryPoints:[path.join(dir,'entry.mjs')],bundle:true,minify:true,platform:'browser',target:'es2020',outfile:path.join(out,'bundle.js'),legalComments:'linked',metafile:true,charset:'utf8'});
fs.writeFileSync(path.join(out,'metafile.json'),JSON.stringify(result.metafile,null,2));
console.log('Bundle local créé');

await import('./prepare.cjs');
