import {T,clamp,distance} from './geometry.js';
import {createDistrict,floorAt,slide,services} from './district.js';
import {coupe,helicopter,human,pose,ride,syncVehicle,repaint,createStreetLife,tickStreetLife} from './actors.js';
import {createView,createLight,updateLight} from './lighting.js';
import {dispatch,raise,updatePursuit,resetPursuit} from './pursuit.js';
import {fireWeapon,tickAction} from './action.js';
import {newJob,startDebt,jobTarget,tickDebt,objectiveMarker} from './debts.js';
import {newProfile,loadProfile,saveProfile,buy,createActivities,startTrial,updateActivities} from './progress.js';
import {createSound} from './audio.js';
import {el,drawHud,showBrief,showStock} from './hud.js';
import {stageScene,shotCamera,shotNames} from './scenes.js';

const requested=new URLSearchParams(location.search).get('shot');
const shot=shotNames.includes(requested)?requested:null;
const view=createView(el('world')), city=createDistrict(view.scene), light=createLight(view.scene);
const player=human(view.scene,2,-25,{color:0x39a7a6,armed:true});
const homeCar=coupe(view.scene,4,-28,{name:'MARINER GT',color:0xec432c});
const kite=helicopter(view.scene,0,0,144);
const life=createStreetLife(view.scene), sound=createSound();
life.cars.push(homeCar);
const profile=shot?newProfile():loadProfile();
if(!shot)repaint(homeCar,profile.paint);
const game={
  ...view,city,light,player,life,profile,kite,homeCar,shot,shotLive:false,season:profile.season,
  keys:new Set(),job:newJob(profile.done),police:dispatch(),activities:createActivities(view.scene),
  vehicle:null,paused:false,started:false,cover:false,health:100,slot:0,radioOn:true,station:0,
  target:null,time:0,noticeUntil:0,noticeText:'',cooldown:0,fx:[],rivals:[],incident:null,mapZoom:false,
  marker:objectiveMarker(view.scene),screen:'menu',aimDelta:0,
  notice(text){this.noticeText=text;this.noticeUntil=this.time+2.8;},
  persist(){return !this.shot&&saveProfile(this.profile);},
  raise(stars){raise(this,stars);}
};
function screen(name){
  game.screen=name;game.paused=name!=='game';
  for(const id of ['menu','brief','shop'])el(id).classList.toggle('hidden',name!==id);
}
function play(){
  game.started=true;screen('game');sound.enable();
}
function resume(){
  screen('game');if(!game.started)play();
}
function briefing(){
  if(game.screen==='brief'){resume();return;}
  showBrief(game);screen('brief');
}
function accept(){
  if(game.job.status==='active'){resume();return;}
  if(game.health<=0)respawn();
  startDebt(game);resume();
}
function shop(){
  showStock(game.profile,index=>{
    if(buy(game.profile,index)){game.persist();shop();}
  },()=>{
    if(game.profile.cash<650)return;
    game.profile.cash-=650;game.profile.boost=true;
    game.homeCar.health=100;
    if(game.vehicle)game.vehicle.health=100;
    game.persist();shop();
  },type=>{
    const price={engine:2400,armor:1800,paint:350}[type];
    if(!price||game.profile.cash<price||type!=='paint'&&game.profile[type])return;
    game.profile.cash-=price;
    if(type==='paint'){
      game.profile.paint=0x259ca1;
      repaint(game.vehicle?.kind==='car'?game.vehicle:homeCar,game.profile.paint);
    }else{
      game.profile[type]=true;
      homeCar[type]=true;if(game.vehicle?.kind==='car')game.vehicle[type]=true;
    }
    game.persist();shop();
  });
  screen('shop');
}
function respawn(){
  if(game.vehicle){game.vehicle.speed=0;game.vehicle=null;}
  resetPursuit(game);
  Object.assign(player,{x:2,y:0,z:-25,heading:0});game.health=100;game.cover=false;
  player.mesh.visible=true;
  if(game.homeCar.health<=0){Object.assign(game.homeCar,{x:4,z:-28,health:100,heading:0});syncVehicle(game.homeCar);}
}
function interact(){
  const v=game.vehicle;
  if(v){
    if(Math.abs(v.speed)>5||v.kind==='air'&&v.y>floorAt(city,v.x,v.z)+2.4){game.notice('Slow down and land before exiting');return false;}
    const offset=v.kind==='air'?1.5:1.85;
    slide(city,player,Math.cos(v.heading)*offset,-Math.sin(v.heading)*offset,.4);
    game.vehicle=null;player.mesh.visible=true;v.speed=0;game.cover=false;return true;
  }
  const nearest=[...life.cars,kite].filter(c=>c.health>0&&Math.abs(c.y-player.y)<2.4)
    .sort((a,b)=>distance(player,a)-distance(player,b))[0];
  if(nearest&&distance(player,nearest)<4.25){
    nearest.engine=game.profile.engine;nearest.armor=game.profile.armor;
    game.vehicle=nearest;player.mesh.visible=false;game.cover=false;
    if(nearest.traffic){nearest.traffic=false;game.raise(1);game.notice('Vehicle taken · Patrol alerted');}
    return true;
  }
  if(distance(player,services[0])<5){game.persist();game.notice('Pearl House · Progress saved');return true;}
  if(distance(player,services[2])<5){shop();return true;}
  game.notice('E · Approach a vehicle or Pearl House');return false;
}
function choose(slot){
  slot=(slot+5)%5;
  if(game.profile.owned.includes(slot)){game.slot=slot;return true;}
  game.notice('Buy this weapon at Estrella Supply · B');return false;
}
function fire(){
  if(game.screen!=='game')return;
  if(game.shot)game.shotLive=true;
  if(fireWeapon(game))sound.shot();
}
function input(event){
  const key=event.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();
  game.keys.add(key);
  if(event.repeat)return;
  if(key==='enter'){
    if(game.screen==='brief')accept();else play();
    return;
  }
  if(key==='escape'){
    if(game.screen==='game'){el('play').textContent='Resume Solmara';screen('menu');}else resume();
    return;
  }
  if(!game.started)return;
  if(game.screen==='brief'&&key==='j'){resume();return;}
  if(game.screen!=='game')return;
  if(game.shot&&/^(w|a|s|d|e|t|arrowup|arrowdown|arrowleft|arrowright)$/.test(key))game.shotLive=true;
  if(key==='e')interact();
  if(key==='j')briefing();
  if(key==='b')shop();
  if(key==='c'&&!startTrial(game))game.notice('Try a street trial near a crew intersection');
  if(key==='t'){game.season=(game.season+1)%4;game.profile.season=game.season;game.persist();}
  if(key==='r'){game.station=(game.station+1)%3;game.radioOn=game.station!==0||!game.radioOn;}
  if(key==='m')game.mapZoom=!game.mapZoom;
  if(key==='k')fire();
  if(key==='q')game.cover=!game.vehicle&&!game.cover;
  if(/^[1-5]$/.test(key))choose(Number(key)-1);
  if(key==='v')for(let offset=1;offset<5;offset++)if(game.profile.owned.includes((game.slot+offset)%5)){choose(game.slot+offset);break;}
  if(key==='x'&&game.police.heat>0&&!game.police.seen&&game.profile.cash>=350){
    game.profile.cash-=350;game.police.heat=Math.max(0,game.police.heat-1);game.notice('Dispatch bribe · $350');game.persist();
  }
}
addEventListener('keydown',input);
addEventListener('keyup',e=>game.keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>game.keys.clear());
el('world').addEventListener('pointerdown',()=>{
  if(game.screen==='game'&&!game.vehicle){
    el('world').requestPointerLock?.()?.catch(()=>{});
    fire();
  }
});
addEventListener('mousemove',e=>{
  if(document.pointerLockElement===el('world')&&!game.vehicle&&game.screen==='game')game.aimDelta-=e.movementX*.003;
});
el('play').onclick=play;el('accept').onclick=accept;el('close').onclick=resume;el('shopClose').onclick=resume;

function axis(...names){return Number(names.some(key=>game.keys.has(key)));}
export function advance(dt){
  dt=clamp(dt,0,.1);
  game.time+=dt;
  const forward=axis('w','arrowup'),back=axis('s','arrowdown'), steer=axis('d','arrowright')-axis('a','arrowleft');
  const boost=axis('shift'),brake=axis(' '),lift=axis(' ','h'),drop=axis('control');
  if(game.vehicle){
    const v=game.vehicle;
    ride(city,v,{forward,back,steer,boost,brake,lift,drop},dt);
    Object.assign(player,{x:v.x,y:v.y,z:v.z,heading:v.heading});syncVehicle(v,game.time);
  }else{
    player.heading+=game.aimDelta-steer*dt*2.1;game.aimDelta=0;
    const pace=(forward-back)*(game.cover?1.75:boost?7.6:4.3)*dt;
    const strafe=document.pointerLockElement?steer*dt*3.5:0;
    if(strafe)player.heading+=steer*dt*2.1;
    if(game.health>0)slide(city,player,Math.sin(player.heading)*pace-Math.cos(player.heading)*strafe,Math.cos(player.heading)*pace+Math.sin(player.heading)*strafe,.36);
    player.y=floorAt(city,player.x,player.z);
    player.armed=game.slot<3;
    player.mode=game.cooldown>0||game.cover?'aim':Math.abs(pace)+Math.abs(strafe)>.001?boost?'run':'walk':'idle';
    pose(player,game.time);
  }
  syncVehicle(kite,game.time);tickStreetLife(game,dt);
  updatePursuit(game,dt);tickAction(game,dt);tickDebt(game,dt);
  if(game.health<=0||game.vehicle?.health<=0){respawn();game.notice('Back at Pearl House · J to retry');}
  game.target=updateActivities(game,dt)||jobTarget(game);
  if(game.target){
    game.marker.position.set(game.target.x,floorAt(city,game.target.x,game.target.z)+.21,game.target.z);
    game.marker.visible=game.job.status==='active'||Boolean(game.activities.timeTrial);
  }else game.marker.visible=false;
}
const wantedPosition=new T.Vector3(),looking=new T.Vector3();
function updateCamera(dt){
  const p=player,c=game.camera,v=game.vehicle;
  if(game.shot&&!game.shotLive){shotCamera(game);return;}
  const isAir=v?.kind==='air';
  const range=isAir?12:v?7.4:3.8, height=isAir?5.18:v?3.61:2.52;
  const hx=Math.sin(p.heading),hz=Math.cos(p.heading);
  wantedPosition.set(p.x-hx*range,p.y+height,p.z-hz*range);
  if(!v){wantedPosition.x-=hz*.57;wantedPosition.z+=hx*.57;}
  if(floorAt(city,wantedPosition.x,wantedPosition.z)>wantedPosition.y-.2){
    for(let shrink=.9;shrink>=.1;shrink-=.1){
      const x=p.x+(wantedPosition.x-p.x)*shrink,z=p.z+(wantedPosition.z-p.z)*shrink;
      if(floorAt(city,x,z)<wantedPosition.y-.2){wantedPosition.x=x;wantedPosition.z=z;break;}
    }
  }
  c.position.lerp(wantedPosition,1-Math.exp(-dt*9));
  if(floorAt(city,c.position.x,c.position.z)>c.position.y-.1)c.position.copy(wantedPosition);
  looking.set(p.x+hx*7,p.y+(isAir?-1:1.6),p.z+hz*7);
  c.lookAt(looking);c.fov=57;c.updateProjectionMatrix();
}
if(shot){
  stageScene(game,shot);screen('game');game.target=jobTarget(game);
}else{
  game.camera.position.set(4,3.5,-33);screen('menu');
}
let last=performance.now(), nextHud=0, ready=false;
function renderFrame(now){
  const dt=clamp((now-last)/1000,0,.048);last=now;
  const frozen=game.shot&&!game.shotLive;
  if(game.started&&!game.paused&&!frozen)advance(dt);
  updateCamera(Math.max(.01,dt));
  updateLight(light,game.season,player,game.camera,game.time);
  if(now>=nextHud){drawHud(game);nextHud=now+70;}
  if(!frozen||!ready)game.draw();
  sound.update(game);
  if(!ready){ready=true;window.__shotReady=true;}
  requestAnimationFrame(renderFrame);
}
window.solmara={game,advance,play,interact,choose,fire,accept};
requestAnimationFrame(renderFrame);
