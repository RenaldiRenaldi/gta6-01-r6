import {T,boxAt,orb,slab,model,material,random,distance,bearing,wrap,clamp} from './geometry.js';
import {human,pose,coupe,glowPool} from './actors.js';
import {visible,slide} from './district.js';

export const weapons=[
  {name:'BREAKER 12',type:'SHOTGUN',range:32,damage:64,delay:.62,price:900,ammo:28},
  {name:'LONGLINE .30',type:'RIFLE',range:100,damage:53,delay:.39,price:1850,ammo:48},
  {name:'KESTREL 72',type:'SMG',range:58,damage:29,delay:.16,price:1200,ammo:72},
  {name:'TIDECUTTER',type:'BLADE',range:2.9,damage:60,delay:.46,price:420,ammo:0},
  {name:'FISTS',type:'UNARMED',range:2.3,damage:35,delay:.33,price:0,ammo:0}
];
const fire=[0xfff5ba,0xffc34d,0xff6b1d,0xe74514].map(c=>material(c,.57,3.2));
const brass=material(0xd69d3a,.24,.19,.48);
const smokeMap=(()=>{
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,3,32,32,31);
  g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.45,'rgba(255,255,255,.50)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(c);
})();
function smoke(scene,color) {
  const p=new T.Sprite(new T.SpriteMaterial({map:smokeMap,color,depthWrite:false,transparent:true,opacity:.65}));
  scene.add(p);return p;
}
export function spawnRivals(game,points) {
  for(const p of game.rivals)game.scene.remove(p.mesh);
  game.rivals=points.map(([x,z],i)=>human(game.scene,x,z,{color:[0xad4d55,0xd7794e,0x754b76][i%3],armed:true,shade:i,heading:Math.PI}));
  for(const p of game.rivals)pose(p,game.time);
}
export function flash(game,x,y,z,heading,includeShell=true){
  const group=model(game.scene,x,y,z);
  group.rotation.y=heading;
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    slab(group,fire[i%2],0,0,0,Math.sin(a)*.29,Math.cos(a)*.27,.2,.048);
  }
  orb(group,fire[0],0,0,.045,.13,.11,.25);
  const vapor=smoke(game.scene,0xccc5bc);
  vapor.position.set(x+.16,y+.08,z-.11);vapor.scale.set(.58,.52,1);
  game.fx.push({object:group,ttl:.075,kind:'flash'});
  game.fx.push({object:vapor,ttl:.52,kind:'smoke'});
  if(includeShell)for(let i=0;i<3;i++){
    const shell=boxAt(game.scene,brass,x-(i+1)*.18,y+.13+i*.10,z-.1-i*.19,.044,.045,.157);
    shell.rotation.set(i*.7,.5+i,0);
    game.fx.push({object:shell,ttl:.5,kind:'shell',x:-.95-i*.5,y:1.9+i*.4,z:-.7});
  }
}
export function fireWeapon(game) {
  // Hit selection respects both aim direction and the collision city's occlusion.
  if(game.vehicle||game.cooldown>0)return false;
  const slot=game.slot, w=weapons[slot];
  if(slot<3&&game.profile.ammo[slot]<=0){game.notice('Out of ammunition · B supplies');return false;}
  const p=game.player, angle=p.heading;
  game.cooldown=w.delay;
  p.mode='aim';p.armed=slot<3;
  if(slot<3){
    game.profile.ammo[slot]--;
    flash(game,p.x+Math.sin(angle)*1.36-Math.cos(angle)*.45,p.y+1.69,p.z+Math.cos(angle)*1.36+Math.sin(angle)*.45,angle);
    game.raise(1);
  }
  const targets=[...game.rivals,...game.police.units.filter(u=>u.kind==='car')];
  if(game.job.courier)targets.push(game.job.courier);
  const hit=targets.filter(e=>e.health>0 && distance(e,p)<w.range &&
    Math.abs(wrap(bearing(p,e)-angle))<(slot===0?.29:slot<3?.13:.85) && visible(game.city,p,e))
    .sort((a,b)=>distance(a,p)-distance(b,p))[0];
  if(hit)hit.health=Math.max(0,hit.health-w.damage);
  return true;
}
export function confrontation(game,z=23) {
  if(game.incident)return game.incident;
  const {scene}=game, rng=random(441), fighters=[], debris=[];
  const wreck=coupe(scene,-7.3,z+6.9,{color:0x61342f,heading:.92,name:'BURNING WRECK'});
  wreck.mesh.rotation.z=.22;wreck.health=0;
  glowPool(scene,wreck.x,wreck.z,14,18,2,.29);
  const flameRoot=model(scene,wreck.x,.9,wreck.z);
  for(let i=0;i<24;i++) {
    const a=(rng()-.5)*3.5,b=(rng()-.5)*4.2, y=rng()*2;
    const flame=orb(flameRoot,fire[i%4],a,y,b,.18+rng()*.36,.26+rng()*.64,.22+rng()*.35);
    flame.castShadow=false;debris.push({flame,a,b,y,phase:rng()*7});
  }
  const smokes=Array.from({length:19},(_,i)=>({mesh:smoke(scene,i%3?0x514047:0x816674),phase:rng()}));
  for(let i=0;i<10;i++) {
    const x=i<5?-5+i*1.2:3+(i-5)*.92;
    const at=z+(i%3)*2.7-(i===6?4:0), heading=i%2?2.25:.76;
    const a=human(scene,x,at,{color:i%3===0?0xe85442:0xebb75e,shade:i,heading});
    const b=human(scene,x+Math.sin(heading)*.8,at+Math.cos(heading)*.8,{color:0x233d58,uniform:true,shade:i+1,heading:heading+Math.PI});
    a.mode='grapple';b.mode=i%3===0?'stagger':'grapple';
    fighters.push(a,b);
  }
  for(let i=0;i<7;i++){
    const x=i%2?9.5:-10.3, at=z+(rng()-.35)*17;
    const p=human(scene,x,at,{shade:i,color:[0x4ea49c,0xee8d71,0xd6b467][i%3],heading:i%2?1.2:-1.8});
    p.mode='run';fighters.push(p);
  }
  for(let i=0;i<25;i++){
    const x=wreck.x+(rng()-.5)*16, at=wreck.z+(rng()-.5)*16;
    if(Math.abs(x-game.player.x)<1)continue;
    boxAt(scene,material(i%2?0x382b35:0x9a5940),x,.22,at,.12+rng()*.32,.10+rng()*.18,.29+rng()*.43).rotation.y=rng()*6;
  }
  const light=new T.PointLight(0xff8031,108,20,2);
  light.position.set(wreck.x,2,wreck.z);scene.add(light);
  return game.incident={wreck,flameRoot,debris,smokes,fighters,light};
}
export function tickAction(game,dt,freeze=false) {
  game.cooldown=Math.max(0,game.cooldown-dt);
  for(const p of game.rivals){
    p.mesh.visible=p.health>0;
    if(p.health<=0)continue;
    p.heading=bearing(p,game.player);p.mode='aim';
    if(!freeze && distance(p,game.player)<35 && visible(game.city,p,game.player)){
      if(distance(p,game.player)>17)slide(game.city,p,Math.sin(p.heading)*dt*2,Math.cos(p.heading)*dt*2,.3);
      game.health=clamp(game.health-dt*(game.cover?.95:2.7),0,100);
    }
    pose(p,game.time);
  }
  for(let i=game.fx.length-1;i>=0;i--){
    const f=game.fx[i];f.ttl-=dt;
    if(f.ttl<=0){game.scene.remove(f.object);game.fx.splice(i,1);continue;}
    if(f.kind==='smoke'){f.object.position.y+=dt*.4;f.object.scale.multiplyScalar(1+dt*2);f.object.material.opacity=f.ttl;}
    if(f.kind==='shell'){f.x*=.995;f.y-=dt*8;f.object.rotation.x+=dt*10;f.object.position.addScaledVector(new T.Vector3(f.x,f.y,f.z),dt);}
  }
  const clash=game.incident;
  if(!clash)return;
  const t=game.time;
  for(const f of clash.debris){
    f.flame.position.set(f.a+Math.sin(t*5+f.phase)*.19,f.y+Math.sin(t*6+f.phase)*.32,f.b);
    f.flame.rotation.z=Math.sin(t*6+f.phase)*.45;
  }
  for(const s of clash.smokes){
    const phase=(s.phase+t*.32)%1;
    s.mesh.position.set(clash.wreck.x+phase*5.3+Math.sin(s.phase*9)*phase,2.1+phase*12,clash.wreck.z+phase*4);
    s.mesh.scale.setScalar(1.25+phase*6.9);
    s.mesh.material.opacity=.53*(1-phase);
  }
  clash.light.intensity=84+30*Math.sin(t*12);
  for(const p of clash.fighters){
    if(!freeze&&p.mode==='run'&&distance(p,game.player)<31)slide(game.city,p,Math.sin(p.heading)*dt*3.1,Math.cos(p.heading)*dt*3.1,.25);
    pose(p,t);
  }
}
