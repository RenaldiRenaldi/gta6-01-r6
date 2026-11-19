import {random,distance,clamp,T,shape,material} from './geometry.js';
import {weapons} from './action.js';

const key='solmara-r6-profile';
export const newProfile=()=>({version:6,cash:4800,respect:45,done:0,ammo:[28,0,0],owned:[0,4],races:[],ledgers:[],jumps:[],season:1,boost:false,engine:false,armor:false,paint:0xec432c});
export function loadProfile() {
  // Invalid or older saves fall back to a complete current-version profile.
  try{
    const value=JSON.parse(localStorage.getItem(key));
    if(value?.version===6&&Number.isFinite(value.cash)&&Array.isArray(value.owned)&&Array.isArray(value.ammo))
      return {...newProfile(),...value,done:clamp(value.done,0,12),season:clamp(value.season,0,3)};
  }catch{}
  return newProfile();
}
export function saveProfile(profile){
  try{localStorage.setItem(key,JSON.stringify(profile));return true;}catch{return false;}
}
export function buy(profile,index) {
  const w=weapons[index];
  if(!w)return false;
  const owned=profile.owned.includes(index);
  if(owned&&index>=3)return false;
  const price=owned?Math.round(w.price*.25):w.price;
  if(profile.cash<price)return false;
  profile.cash-=price;
  if(!owned)profile.owned.push(index);
  if(index<3)profile.ammo[index]+=w.ammo;
  return true;
}
const routes=[
  [[0,-72],[0,0],[72,0],[72,72],[0,72],[0,-72]],
  [[-144,-72],[-144,0],[-216,0],[-216,-72],[-144,-72]],
  [[144,144],[216,144],[216,72],[144,72],[144,144]]
];
export function createActivities(scene){
  const rng=random(6735), tokens=[];
  for(let i=0;i<15;i++){
    const x=(i%5-2)*72+(i%2?-8:8),z=(Math.floor(i/5)+1)*72+(rng()-.5)*72;
    const mesh=shape(scene,new T.BoxGeometry(.55,.46,.55),material(0xecca62,.44,.9),x,.8,z);
    tokens.push({x,z,mesh,i});
  }
  const ramps=[[0,91],[144,-43],[-144,86]].map(([x,z],id)=>{
    const mesh=shape(scene,new T.BoxGeometry(3.6,.22,5),material(0xb69555,.68),x,.46,z);
    mesh.rotation.x=-.16;
    for(const side of [-1,1])shape(mesh,new T.BoxGeometry(.18,.15,1),material(0xffd66f,.5,.2),side*1.6,.15,0);
    return {x,z,id,mesh};
  });
  return {tokens,ramps,timeTrial:null,jumping:null};
}
export function startTrial(game){
  if(!game.vehicle||game.vehicle.kind!=='car')return false;
  const index=routes.findIndex(path=>distance(game.player,{x:path[0][0],z:path[0][1]})<24);
  if(index<0)return false;
  game.activities.timeTrial={index,node:1,seconds:80};
  game.notice('Street trial · 80 seconds');
  return true;
}
export function updateActivities(game,dt){
  const a=game.activities;
  if(a.jumping && game.time-a.jumping.time>.3 && a.jumping.vehicle.y===0){
    const id=a.jumping.id;
    if(!game.profile.jumps.includes(id)){
      game.profile.jumps.push(id);game.profile.cash+=800;game.profile.respect=Math.min(550,game.profile.respect+12);
      game.notice('Canal jump landed · $800');game.persist();
    }
    a.jumping=null;
  }
  if(!a.jumping&&game.vehicle?.kind==='car'&&game.vehicle.speed>18&&Math.cos(game.vehicle.heading)>.78){
    for(const ramp of a.ramps)if(distance(ramp,game.player)<2.7&&game.vehicle.y===0){
      game.vehicle.vy=9+game.vehicle.speed*.065;game.vehicle.y=.28;
      a.jumping={id:ramp.id,vehicle:game.vehicle,time:game.time};break;
    }
  }
  for(const token of a.tokens){
    token.mesh.visible=!game.profile.ledgers.includes(token.i);
    token.mesh.rotation.y=game.time*1.6;
    if(token.mesh.visible&&!game.vehicle&&distance(game.player,token)<1.2){
      game.profile.ledgers.push(token.i);game.profile.cash+=250;game.profile.respect=Math.min(550,game.profile.respect+5);
      game.notice('Ledger recovered · $250');game.persist();
    }
  }
  const r=a.timeTrial;
  if(!r)return null;
  if((r.seconds-=dt)<=0||!game.vehicle){a.timeTrial=null;game.notice('Street trial expired');return null;}
  const route=routes[r.index], target={x:route[r.node][0],z:route[r.node][1]};
  if(distance(game.player,target)<9){
    if(++r.node===route.length){
      const elapsed=Math.round((80-r.seconds)*10)/10;
      const best=game.profile.races[r.index]||Infinity;
      game.profile.races[r.index]=Math.min(elapsed,best);
      game.profile.cash+=1200;game.profile.respect=Math.min(550,game.profile.respect+15);
      a.timeTrial=null;game.notice('Street trial cleared · $1,200');game.persist();return null;
    }
    game.notice('Street trial · '+(r.node-1)+'/'+(route.length-1));
  }
  return target;
}
