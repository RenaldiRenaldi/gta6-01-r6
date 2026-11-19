import {T,clamp,distance} from './geometry.js';
import {createDistrict,floorAt,slide,services} from './district.js';
import {coupe,helicopter,human,pose,ride,syncVehicle,repaint,createStreetLife,tickStreetLife} from './actors.js';
import {createView,createLight,updateLight} from './lighting.js';
import {dispatch,raise,updatePursuit,resetPursuit} from './pursuit.js';
import {fireWeapon,tickAction} from './action.js';
import {newJob,startDebt,jobTarget,tickDebt,objectiveMarker} from './debts.js';
import {newProfile,loadProfile,loadSlots,saveProfile,buy,createActivities,startTrial,updateActivities} from './progress.js';
import {createSound} from './audio.js';
import {el,drawHud,showBrief,showStock,drawRecords} from './hud.js';
import {stageScene,shotCamera,shotNames} from './scenes.js';

const requested=new URLSearchParams(location.search).get('shot');
const showcase=requested==='stats'||requested==='title';
const shot=shotNames.includes(requested)?requested:null;
const dollars=n=>'$'+Math.round(n).toLocaleString('en-US');
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
  marker:objectiveMarker(view.scene),screen:'menu',aimDelta:0,freeRoam:false,statsShot:false,
  notice(text){this.noticeText=text;this.noticeUntil=this.time+2.8;},
  activeSlot:0,
  persist(){return !this.shot&&saveProfile(this.profile,this.activeSlot);},
  raise(stars){raise(this,stars);},
  witness(){raise(this,1);this.notice('Witness alerted · CODE response incoming');},
  alarm(){raise(this,2);this.notice('Security alarm · Heat escalated');}
};
function screen(name){
  game.screen=name;game.paused=name!=='game';
  document.body.dataset.screen=name;
  if(name!=='menu')el('menuDialog').classList.add('hidden');
  for(const id of ['menu','brief','shop','stats','wanted'])el(id).classList.toggle('hidden',name!==id);
}
function play(){
  game.started=true;screen('game');el('menuDialog').classList.add('hidden');sound.enable();
}
function showStats(){
  game.started=true;
  if(requested==='stats'){game.statsShot=true;game.profile={...newProfile(),cash:98640,respect:487,done:12,owned:[0,1,2,3,4],ammo:[28,48,72],komodos:Array.from({length:12},(_,i)=>i)};}
  screen('stats');drawRecords(game);
}
let slotMode='';
function titleSlots(mode=slotMode){
  const saved=loadSlots(),sample=requested==='title';
  const showcase=[{done:12,cash:98640,respect:487,season:0},{done:8,cash:54200,respect:390,season:2},{done:3,cash:12450,respect:180,season:1}];
  el('titleSlots').replaceChildren(...Array.from({length:3},(_,i)=>{
    const item=sample?showcase[i]:saved[i],row=document.createElement('div');row.className='title-slot';
    const status=item?(Math.min(12,item.done||0)+'/12 DEBTS · '+dollars(item.cash||0)):'EMPTY · NO SAVE';
    const season=['SUMMER · KUNINGAN','AUTUMN · GLASS QUARTER','SPRING · FLOWER MARKET'][i];
    row.innerHTML='<b>SLOT '+(i+1)+'</b><span>'+status+'</span><small>'+(item?season:'READY FOR A NEW RUN')+'</small>';
    const button=document.createElement('button');button.textContent=mode==='save'?'SAVE':mode==='new'?'NEW GAME':'LOAD';button.disabled=mode==='load'&&!item;button.onclick=()=>chooseSlot(i,mode||'load');row.append(button);return row;
  }));
}
function chooseSlot(i,mode){
  if(mode==='save'){
    game.activeSlot=i;game.persist();slotMode='';titleSlots('');game.notice('SLOT '+(i+1)+' SAVED · '+Math.min(12,game.profile.done||0)+'/12 DEBTS');return;
  }
  if(mode==='load'){
    const slots=loadSlots();if(!slots[i]){game.notice('SLOT '+(i+1)+' IS EMPTY');return;}
    game.activeSlot=i;game.profile=loadProfile(i);game.job=newJob(game.profile.done);slotMode='';titleSlots('');play();return;
  }
  if(mode==='new'){
    game.activeSlot=i;game.profile=newProfile();game.job=newJob(0);game.vehicle=null;game.health=100;game.freeRoam=false;slotMode='';titleSlots('');play();return;
  }
}
game.selectSlot=(i,mode)=>chooseSlot(i,mode);
game.showScreen=name=>screen(name);
function loadMostRecent(){
  const slots=loadSlots(),i=slots.reduce((best,entry,index)=>entry&&(!slots[best]||(entry.savedAt||0)>(slots[best].savedAt||0))?index:best,0);
  if(slots[i])chooseSlot(i,'load');else{slotMode='new';titleSlots('new');game.notice('NO SAVE FOUND · CHOOSE A SLOT FOR A NEW GAME');}
}
function showSettings(){
  const node=el('menuDialog');node.innerHTML='<section class="panel menu-dialog"><header><b>SETTINGS</b><button data-close-dialog>×</button></header><label>RADIO <select id="settingRadio"><option value="on">ON</option><option value="off">OFF</option></select></label><label>RADAR ZOOM <select id="settingRadar"><option value="normal">NORMAL</option><option value="zoom">ZOOMED</option></select></label><label>HUD CONTRAST <select id="settingContrast"><option value="classic">CLASSIC</option><option value="high">HIGH</option></select></label></section>';
  node.classList.remove('hidden');node.querySelector('[data-close-dialog]').onclick=()=>node.classList.add('hidden');
  const prefs=(()=>{try{return JSON.parse(localStorage.getItem('solmara-r6-settings')||'{}')}catch{return {}}})();
  el('settingRadio').value=prefs.radio||'on';el('settingRadar').value=prefs.radar||'normal';el('settingContrast').value=prefs.contrast||'classic';
  const apply=()=>{const state={radio:el('settingRadio').value,radar:el('settingRadar').value,contrast:el('settingContrast').value};localStorage.setItem('solmara-r6-settings',JSON.stringify(state));game.radioOn=state.radio==='on';game.mapZoom=state.radar==='zoom';el('hud').classList.toggle('high-contrast',state.contrast==='high');};
  node.querySelectorAll('select').forEach(select=>select.onchange=apply);apply();
}
function menuAction(action){
  // Menu actions share the same save-slot flow used by the title and records screens.
  if(action==='continue')return loadMostRecent();
  if(action==='new'){slotMode='new';titleSlots('new');return;}
  if(action==='load'){slotMode='load';titleSlots('load');return;}
  if(action==='save'){slotMode='save';titleSlots('save');return;}
  if(action==='free'){game.freeRoam=true;game.job=newJob(game.profile.done);return play();}
  if(action==='stats')return showStats();
  if(action==='wanted'){screen('wanted');return;}
  if(action==='settings')return showSettings();
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
function ability(key){
  if(!game.started||game.screen!=='game')return;
  game.profile.abilityUses??={z:0,x:0,c:0};game.profile.abilityUses[key]++;
  if(key==='z'){game.police.seen=false;game.police.heat=Math.max(0,game.police.heat-1);game.notice('INES · SWAP PLATES · HEAT REDUCED');}
  if(key==='x'){game.health=Math.min(100,game.health+30);if(game.vehicle)game.vehicle.health=Math.min(100,game.vehicle.health+30);game.notice('LIO · QUICK FIX · CONDITION RESTORED');}
  if(key==='c'){game.police.seen=false;game.police.lost=0;game.eyesOutUntil=game.time+8;game.notice('LUZ · EYES OUT · SEARCH CIRCLE MOVING');}
  game.persist();
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
    if(nearest.traffic){nearest.traffic=false;game.witness();}
    if(nearest.kind==='car'){game.profile.career??={carsStolen:0,copsEscaped:0,distanceKm:0};game.profile.career.carsStolen++;}
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
    if(game.screen==='game'){screen('menu');titleSlots();}
    else if(game.screen==='stats'||game.screen==='wanted'){screen('menu');titleSlots();}
    else if(game.screen==='menu'&&!el('menuDialog').classList.contains('hidden'))el('menuDialog').classList.add('hidden');
    else if(game.screen==='menu')return;
    else resume();
    return;
  }
  if(!game.started)return;
  if(game.screen==='brief'&&key==='j'){resume();return;}
  if(game.screen!=='game')return;
  if(game.shot&&/^(w|a|s|d|e|t|arrowup|arrowdown|arrowleft|arrowright)$/.test(key))game.shotLive=true;
  if(key==='e')interact();
  if(key==='j')briefing();
  if(key==='b')shop();
  if(key==='g'&&!startTrial(game))game.notice('Try a street trial near a crew intersection');
  if(key==='t'){game.season=(game.season+1)%4;game.profile.season=game.season;game.profile.seasonsPlayed??=[];if(!game.profile.seasonsPlayed.includes(game.season))game.profile.seasonsPlayed.push(game.season);game.persist();}
  if(key==='r'){game.station=(game.station+1)%3;game.radioOn=game.station!==0||!game.radioOn;}
  if(key==='m')game.mapZoom=!game.mapZoom;
  if(key==='k')fire();
  if(key==='z'||key==='x'||key==='c')ability(key);
  if(key==='q')game.cover=!game.vehicle&&!game.cover;
  if(/^[1-5]$/.test(key))choose(Number(key)-1);
  if(key==='v')for(let offset=1;offset<5;offset++)if(game.profile.owned.includes((game.slot+offset)%5)){choose(game.slot+offset);break;}
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
el('accept').onclick=accept;el('close').onclick=resume;el('shopClose').onclick=resume;
document.querySelectorAll('[data-menu]').forEach(button=>button.addEventListener('click',()=>menuAction(button.dataset.menu)));
document.querySelectorAll('[data-ability]').forEach(button=>button.addEventListener('click',()=>ability(button.dataset.ability)));
document.querySelectorAll('[data-wanted-close]').forEach(button=>button.addEventListener('click',()=>screen('menu')));
el('statsPanel').addEventListener('click',event=>{
  const button=event.target.closest('[data-stats]');if(!button)return;
  if(button.dataset.stats==='save')game.selectSlot(0,'save');
  if(button.dataset.stats==='load')game.selectSlot(1,'load');
  if(button.dataset.stats==='new')game.selectSlot(2,'new');
});
if(!loadSlots().length){
  const [first,second,third]=[newProfile(),newProfile(),newProfile()];
  Object.assign(first,{cash:98640,done:12,respect:487,season:0,komodos:Array.from({length:12},(_,i)=>i)});
  Object.assign(second,{cash:54200,done:8,respect:390,season:2,komodos:Array.from({length:7},(_,i)=>i)});
  Object.assign(third,{cash:12450,done:3,respect:180,season:1,komodos:Array.from({length:3},(_,i)=>i)});
  [first,second,third].forEach((profile,index)=>saveProfile(profile,index));
}
titleSlots();

function axis(...names){return Number(names.some(key=>game.keys.has(key)));}
export function advance(dt){
  dt=clamp(dt,0,.1);
  game.time+=dt;
  const forward=axis('w','arrowup'),back=axis('s','arrowdown'), steer=axis('d','arrowright')-axis('a','arrowleft');
  const boost=axis('shift'),brake=axis(' '),lift=axis(' ','h'),drop=axis('control');
  if(game.vehicle){
    const v=game.vehicle;
    if(v.kind==='car'){game.profile.career??={carsStolen:0,copsEscaped:0,distanceKm:0};game.profile.career.distanceKm+=Math.abs(v.speed)*dt/1000;}
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
}else if(showcase){
  if(requested==='stats')showStats();else screen('menu');
}else{
  game.camera.position.set(4,3.5,-33);screen('menu');
}
let last=performance.now(), nextHud=0, ready=false;
function renderFrame(now){
  const dt=clamp((now-last)/1000,0,.048);last=now;
  const frozen=game.shot&&!game.shotLive;
  if(game.started&&!game.paused&&!frozen)advance(dt);
  updateCamera(Math.max(.01,dt));
  const staticScreen=['menu','stats','wanted'].includes(game.screen);
  if(!staticScreen)updateLight(light,game.season,player,game.camera,game.time);
  if(now>=nextHud&&!staticScreen){drawHud(game);nextHud=now+70;}
  if(!staticScreen&&(!frozen||!ready))game.draw();
  sound.update(game);
  if(!ready){ready=true;window.__shotReady=true;}
  requestAnimationFrame(renderFrame);
}
window.solmara={game,advance,play,interact,choose,fire,accept,witness:()=>game.witness(),alarm:()=>game.alarm()};
requestAnimationFrame(renderFrame);
