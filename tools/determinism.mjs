import {mkdtempSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const scratch=mkdtempSync(join(tmpdir(),'solmara-repro-'));
const a=join(scratch,'a'),b=join(scratch,'b');
function files(directory,prefix=directory){
  return readdirSync(directory).sort().flatMap(name=>{
    const path=join(directory,name);
    return statSync(path).isDirectory()?files(path,prefix):[relative(prefix,path)];
  });
}
for(const destination of [a,b]){
  execFileSync(process.execPath,['main.ts'],{env:{...process.env,MAKEFUN_OUTPUT_DIR:destination}});
}
const first=files(a),second=files(b);
assert.deepEqual(first,second);
assert(first.includes('dossier.json')&&first.includes('game/index.html'));
let total=0;
for(const path of first){
  const bytes=readFileSync(join(a,path));
  assert(bytes.equals(readFileSync(join(b,path))),'Non-deterministic artifact: '+path);
  total+=bytes.length;
}
const dossierHash=createHash('sha256').update(readFileSync(join(a,'dossier.json'))).digest('hex');
console.log(JSON.stringify({identical:true,files:first.length,bytes:total,dossier_sha256:dossierHash,outputs:[a,b]},null,2));
