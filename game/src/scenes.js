import {coupe,helicopter,human,pose,syncVehicle} from './actors.js';
import {addPatrol,addAirSupport,raise} from './pursuit.js';
import {confrontation,spawnRivals,flash,tickAction} from './action.js';
import {newJob} from './debts.js';

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
export function stageScene(game,name){
  const {scene,player}=game;
  if(name==='summer'){
    prepare(game,11,2,96,98640,487);game.season=1;
    lead(game,put(game,1.4,9,0xf13428,.13),163,82);
    raise(game,5);
    addPatrol(game,5.3,16,'RAMMING',.25);
    addPatrol(game,-6.2,12.2,'RAMMING',-.10);
    addAirSupport(game,-2.0,8.5,24).heading=-1.02;
    addPatrol(game,-6.3,39,'FIRING',.21);
    addPatrol(game,6.8,70,'ROADBLOCK',1.2);
    addPatrol(game,0,71,'ROADBLOCK',-1);
    addPatrol(game,-12,46,'SEARCHING',.25);
    addPatrol(game,8.3,58,'PURSUIT',-.25);
    addPatrol(game,3,88,'PURSUIT',.07);
    confrontation(game,21);
    put(game,7.4,33,0xe8c975,-.35);
    put(game,-6.3,51,0xf5c070,.05);
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
    c.fov=54;c.position.set(p.x+.45,2.8,p.z-8);c.lookAt(p.x+.45,1.6,p.z+16);
  }else if(shot==='spring'){
    c.fov=53;c.position.set(p.x-1.45,2.30,p.z-2.65);c.lookAt(p.x+4,1.55,p.z+7.2);
  }else if(shot==='autumn'){
    c.fov=57;c.position.set(p.x-20,p.y+15,p.z-25);c.lookAt(p.x+10,p.y-24,p.z+20);
  }else {
    c.fov=59;c.position.set(p.x-12,6.6,p.z+4);c.lookAt(p.x+18,1.3,p.z);
  }
  c.updateProjectionMatrix();
}
