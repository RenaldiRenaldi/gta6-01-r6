import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {buildDossier,readGameTree,sourceImports,htmlFacts,resolveGamePath} from '../vendor/makefun-game.ts';

const output=resolve(process.argv[2]||'out');
const caps={text_max_bytes:163840,screenshots:{max:4,max_bytes:262144},game_max_files:993,game_max_bytes:50331648,game_path_max_bytes:1000};
const tree=readGameTree(join(output,'game'),caps);
const files=new Set(tree.files.map(f=>f.path));
assert(files.has('index.html'));
assert(tree.count<=993 && tree.totalBytes<=50331648);
console.log('PASS game_files · '+tree.count+' entries · '+tree.totalBytes+' bytes');
const seen=new Set();
function reference(value,source){
  if(value.startsWith('data:'))return null;
  const path=resolveGamePath(value,source);
  assert(path&&files.has(path),source+' references absent '+value);
  return path;
}
function visit(path){
  if(!path||seen.has(path)||!path.endsWith('.js'))return;
  seen.add(path);
  for(const specifier of sourceImports(readFileSync(join(output,'game',path),'utf8')))visit(reference(specifier,path));
}
const facts=htmlFacts(readFileSync(join(output,'game/index.html'),'utf8'));
for(const script of facts.scripts)if(script.src)visit(reference(script.src,'index.html'));
for(const link of facts.links)reference(link.href,'index.html');
for(const resource of facts.resources)reference(resource.src,'index.html');
console.log('PASS references · '+seen.size+' self-contained modules');
function jpegSize(bytes){
  let position=2;
  while(position<bytes.length){
    const marker=bytes[position+1], length=bytes.readUInt16BE(position+2);
    if([192,193,194].includes(marker))return [bytes.readUInt16BE(position+7),bytes.readUInt16BE(position+5)];
    position+=2+length;
  }
  throw Error('JPEG lacks dimensions');
}
const manifest=JSON.parse(readFileSync('shots.json','utf8'));
const names=readdirSync(join(output,'screenshots')).sort();
assert.deepEqual(names,manifest.shots.map(s=>s.file));assert.equal(names.length,4);
for(const name of names){
  const path=join(output,'screenshots',name),bytes=readFileSync(path);
  assert(statSync(path).isFile());assert(bytes.length<80000);
  assert.deepEqual(jpegSize(bytes),[960,600]);
  console.log('  '+name+' · '+bytes.length+' bytes · 960×600');
}
console.log('PASS screenshots · 4/4 browser renders');
const expected=Buffer.from(buildDossier(output,caps)),actual=readFileSync(join(output,'dossier.json'));
assert(actual.equals(expected));assert(actual.length<1572864);
console.log('PASS dossier_matches · '+actual.length+' canonical bytes');
for(const file of tree.files.filter(f=>f.cls==='source'&&f.path.endsWith('.js')))
  execFileSync(process.execPath,['--check',join(output,'game',file.path)]);
assert.equal(JSON.parse(readFileSync('.makefun/owner.json')).wallet,'9XAmKVSK2jKwExuis5E2WyrgsKx5F99gfuUrvbqXv52p');
console.log('4/4 artifact checks · JS parses · ownership verified');
