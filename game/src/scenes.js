import {coupe,helicopter,human,pose,syncVehicle} from './actors.js';
import {addPatrol,addAirSupport,raise} from './pursuit.js';
import {confrontation,spawnRivals,flash,tickAction} from './action.js';
import {newJob} from './debts.js';
import {T,bearing,boxAt,material,model} from './geometry.js';

export const shotNames=['summer','spring','autumn','winter'];
function prepare(game,index,phase,timer,money,respect){
  game.started=true;game.profile.cash=money;game.profile.respect=respect;
  game.profile.owned=[0,1,2,3,4];game.profile.ammo=[28,48,72];
  game.job={...newJob(index),phase,timer,status:'active',spawned:true};
  game.noticeUntil=0;game.time=2.12;
}
function put(game,x,z,color,heading=0,police=false){
  const v=police?addPatrol(game,x,z,'PURSUIT',heading):coupe(game.scene,x,z,{color,heading});
  game.life.cars.push(v);return v;
}
function lead(game,v,kmh,hp){
  game.vehicle=v;v.speed=kmh/3.6;v.health=hp;
  Object.assign(game.player,{x:v.x,y:v.y,z:v.z,heading:v.heading});
  game.player.mesh.visible=false;syncVehicle(v,game.time);
}
function lockSign(scene,x,y,z){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#14283b';ctx.fillRect(0,0,768,128);
  ctx.fillStyle='#69e6d6';ctx.fillRect(0,0,768,9);ctx.fillRect(0,118,768,10);
  ctx.font='bold 76px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff0c5';
  ctx.fillText('RASUNA LOCK',384,65);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const face=new T.MeshBasicMaterial({map:texture});
  const sign=boxAt(scene,face,x,y,z,16,2.7,.18);sign.castShadow=false;
}
function rasunaLock(scene){
  const x=-36,z=116,stone=material(0xd8c8a3,.62),trim=material(0x4c8f91,.4,.12),lamp=material(0xf8d378,.3,1.4);
  for(const side of [-1,1]){
    boxAt(scene,stone,x+side*8.1,13,z,3.1,26,3.8);
    boxAt(scene,trim,x+side*8.1,25.6,z,4.3,.82,4.7);
    boxAt(scene,lamp,x+side*8.1,27,z+2.05,.46,.46,.25);
    boxAt(scene,stone,x+side*8.1,2.2,z,4.3,.72,5.1);
  }
  boxAt(scene,stone,x,26.8,z,17.4,2.2,3.9);
  boxAt(scene,trim,x,28.3,z,18.4,.42,4.6);
  lockSign(scene,x,28.35,z+2.05);
}
function stageSummerExit(game,car,target){
  // The frozen hero frame retains the chase telemetry and radar anchor.
  const door=model(car.mesh,1.22,.68,.95);
  door.rotation.y=-1.05;
  door.name='Summer driver door';
  const trim=material(0x25232b,.46);
  const opening=boxAt(car.mesh,trim,1.238,.945,.03,.035,.52,1.68);
  boxAt(door,car.coat,0,.24,-.85,.13,.52,1.75);
  boxAt(door,trim,-.075,.29,-.85,.045,.37,1.58);
  boxAt(door,trim,0,.52,-.85,.14,.06,1.75);
  boxAt(door,material(0xc2b1a5,.24),.075,.42,-1.48,.035,.048,.23);

  const dani=human(game.scene,car.x+2.65,car.z-.45,{color:0x39a7a6,armed:true});
  dani.mesh.name='Summer Dani on foot';
  dani.heading=bearing(dani,target);
  pose(dani,game.time);
  game.shotAnchor={x:game.player.x,z:game.player.z};
  game.shotVehicle=car;
  Object.assign(game.player,dani);
  game.vehicle=null;
  const muzzle=dani.gun.localToWorld(new T.Vector3(0,.062,.655));
  flash(game,muzzle.x,muzzle.y,muzzle.z,dani.heading);
  const shells=game.fx.filter(effect=>effect.kind==='shell').slice(-3);
  for(const [i,shell] of shells.entries()){
    shell.object.position.copy(dani.gun.localToWorld(new T.Vector3(-.14-i*.16,.11+i*.12,.02-i*.12)));
    shell.object.scale.multiplyScalar(1.35);
  }
  game.scene.onBeforeRender=()=>{
    const frozen=!game.shotLive;
    door.visible=opening.visible=frozen;
  };
}
export function stageScene(game,name){
  const {scene,player}=game;
  if(name==='summer'){
    prepare(game,11,2,96,98640,487);game.season=1;
    const car=put(game,-18.6,9,0xf13428,.13);
    lead(game,car,163,82);
    raise(game,6);
    const nearestPatrol=addPatrol(game,-14.7,16,'RAMMING',.25);
    addPatrol(game,-26.2,12.2,'RAMMING',-.10);
    addAirSupport(game,-20.0,8.5,24).heading=-1.02;
    addPatrol(game,-26.3,39,'FIRING',.21);
    addPatrol(game,-11.2,70,'ROADBLOCK',1.2);
    addPatrol(game,-18.6,71,'ROADBLOCK',-1);
    addPatrol(game,-30,46,'SEARCHING',.25);
    addPatrol(game,-9.7,58,'PURSUIT',-.25);
    addPatrol(game,3,88,'PURSUIT',.07);
    const incident=confrontation(game,21);
    incident.fighters.forEach(person=>person.mesh.visible=false);
    game.life.people.forEach(person=>person.mesh.visible=false);
    const lookout=human(scene,-12.2,24.5,{color:0xe8a74f,shade:2,heading:-1.35});
    lookout.mesh.name='Lio Santos · lookout';pose(lookout,game.time);
    put(game,-11.2,33,0xe8c975,-.35);
    put(game,-24.9,51,0xf5c070,.05);
    rasunaLock(scene);
    stageSummerExit(game,car,nearestPatrol);
  }else if(name==='spring'){
    prepare(game,2,1,134,12450,180);game.season=0;
    Object.assign(player,{x:-1.2,z:2.3,heading:0,mode:'aim',armed:true});game.cover=true;
    put(game,2.8,9.2,0xeaa62d,.19);put(game,-7.6,14.9,0x9c4d61,-.22);
    raise(game,3);addPatrol(game,4,24,'PURSUIT',.11);addPatrol(game,-4,32,'PURSUIT',.2);addPatrol(game,1,46,'SEARCHING',-.15);
    spawnRivals(game,[[4.2,19.8],[-4.1,23.3],[4.7,31],[-5.6,36.4]]);
    flash(game,player.x-.45,1.69,player.z+1.36,0);
    for(let i=0;i<12;i++){
      const p=human(scene,(i%2?-1:1)*(9.8+i%3*.56),7+i*2.1,{color:[0x9d6280,0x719f83,0xcc9d48][i%3],heading:i%2?-1.13:1.08,shade:i});
      p.mode='run';pose(p,game.time+i*.1);
    }
  }else if(name==='autumn'){
    prepare(game,6,1,142,32750,310);game.season=2;game.job.checkpoint=1;
    const h=helicopter(scene,0,73,144);h.heading=.79;h.surface=.22;
    lead(game,h,108,100);raise(game,2);
    game.police.seen=false;
    addPatrol(game,72,143,'SEARCHING',1.57);addPatrol(game,70,181,'SEARCHING',0);
    const escort=addAirSupport(game,24,77,166);escort.heading=.86;escort.surface=29;
    put(game,4,146,0x42a5a2,1.56);
  }else{
    prepare(game,5,1,108,90750,462);game.season=3;
    lead(game,put(game,-147,-72,0x259ca1,1.55),136,76);
    raise(game,4);game.police.seen=false;
    addPatrol(game,-156,-80,'RAMMING',1.55);
    addPatrol(game,-164,-74,'PURSUIT',1.69);
    addPatrol(game,-109,-72,'ROADBLOCK',.14);
    addAirSupport(game,-122,13,-78).heading=.8;
    put(game,-131,-65,0xe67c5d,1.5);
    for(let i=0;i<5;i++){
      const p=human(scene,-132+i*2.8,-60,{color:[0xdd714f,0x829fa5][i%2],shade:i,heading:2.72});
      p.mode='run';pose(p,game.time+i*.23);
    }
  }
  pose(player,game.time);
  for(const unit of game.police.units)syncVehicle(unit,game.time);
  tickAction(game,0,true);
}
export function shotCamera(game){
  const {player:p,camera:c,shot}=game;
  if(shot==='summer'){
    // Keep R6's reference framing while staging the six-star on-foot firing beat.
    const focus=game.shotAnchor||p;
    c.fov=54;c.position.set(focus.x+.32,2.6,focus.z-7.6);c.lookAt(focus.x+1.75,1.63,focus.z+16);
  }else if(shot==='spring'){
    c.fov=53;c.position.set(p.x-1.45,2.30,p.z-2.65);c.lookAt(p.x+4,1.55,p.z+7.2);
  }else if(shot==='autumn'){
    c.fov=57;c.position.set(p.x-20,p.y+15,p.z-25);c.lookAt(p.x+10,p.y-24,p.z+20);
  }else {
    c.fov=59;c.position.set(p.x-12,6.6,p.z+4);c.lookAt(p.x+18,1.3,p.z);
  }
  c.updateProjectionMatrix();
}
