import {distance,bearing,wrap,clamp} from './geometry.js';
import {coupe,helicopter,syncVehicle} from './actors.js';
import {nearRoad,slide,visible,floorAt} from './district.js';

const callSigns=['IBIS-43','KESTREL-31','OSPREY-09','SWIFT-24','TERN-16','KITE-52','HERON-28','RAIL-08'];
export const dispatch=()=>({heat:0,seen:false,units:[],last:{x:0,z:0},lost:0,delay:0,serial:0});
export function raise(game,amount) {
  const police=game.police;
  police.heat=clamp(police.heat+amount,0,6);police.lost=0;police.seen=true;
  police.escapeRecorded=false;
  game.profile.maxHeat=Math.max(game.profile.maxHeat||0,Math.ceil(police.heat));
  police.last={x:game.player.x,z:game.player.z};
}
export function addPatrol(game,x,z,state='PURSUIT',heading=0) {
  const unit=coupe(game.scene,x,z,{color:0x243e5b,name:callSigns[game.police.serial++%callSigns.length],police:true,heading});
  unit.state=state;game.police.units.push(unit);return unit;
}
export function addAirSupport(game,x,y,z){
  const unit=helicopter(game.scene,x,y,z,true);
  game.police.units.push(unit);syncVehicle(unit,game.time);return unit;
}
export function resetPursuit(game){
  for(const u of game.police.units){
    game.scene.remove(u.mesh);
    if(u.beam)game.scene.remove(u.beam,u.pool);
  }
  Object.assign(game.police,dispatch());
}
export function nextJunction(from,to) {
  // Off-street pursuit returns to the road graph before advancing a block.
  const a={x:nearRoad(from.x),z:nearRoad(from.z)};
  const b={x:nearRoad(to.x),z:nearRoad(to.z)};
  if(distance(from,a)>8)return a;
  return {x:a.x+Math.sign(b.x-a.x)*72,z:a.z+(a.x===b.x?Math.sign(b.z-a.z)*72:0)};
}
export function updatePursuit(game,dt){
  const {city,police,player}=game;
  if(police.heat<=0){
    if(police.units.length){if(!police.escapeRecorded){game.profile.career??={carsStolen:0,copsEscaped:0,distanceKm:0};game.profile.career.copsEscaped++;police.escapeRecorded=true;}resetPursuit(game);}
    return;
  }
  const stars=Math.ceil(police.heat);
  police.delay-=dt;
  police.seen=game.time<(game.eyesOutUntil||0)?false:police.units.some(u=>u.health>0&&distance(u,player)<(u.kind==='air'?58:42)&&visible(city,{...u,y:u.y+1.5},{...player,y:player.y+1.3}));
  if(police.seen){police.last={x:player.x,z:player.z};police.lost=0;}
  else{
    police.lost+=dt;
    if(police.lost>17)police.heat=Math.max(0,police.heat-dt*.25);
  }
  if(police.delay<=0 && police.units.filter(u=>u.health>0).length<[0,1,2,4,6,9,11][stars]){
    police.delay=2.45;
    if(stars>=4&&!police.units.some(u=>u.kind==='air')) addAirSupport(game,player.x+5,19,player.z+30);
    else {
      const side=police.serial%2?1:-1;
      const x=nearRoad(player.x),z=nearRoad(player.z+side*70);
      addPatrol(game,x+(police.serial%3-1)*4.1,z,stars>=4&&police.serial%3===0?'ROADBLOCK':'PURSUIT',side>0?Math.PI:0);
    }
  }
  for(const u of police.units){
    if(u.health<=0){u.mesh.visible=false;continue;}
    const gap=distance(u,player);
    if(u.kind==='air'){
      const goal={x:police.last.x+1,z:police.last.z+13};
      u.heading+=wrap(bearing(u,goal)-u.heading)*dt*1.26;
      const speed=clamp(distance(u,goal)*.6,0,35);
      u.x+=Math.sin(u.heading)*speed*dt;u.z+=Math.cos(u.heading)*speed*dt;
      const ground=floorAt(city,u.x,u.z);
      u.y+=(Math.max(12,ground+9,player.y+12)-u.y)*dt*.72;
      u.surface=floorAt(city,u.x+2,u.z+4)+.25;
    } else if(u.state!=='ROADBLOCK'){
      const direct=gap<65 && police.seen && visible(city,u,player);
      const target=direct?player:nextJunction(u,police.last);
      u.heading+=clamp(wrap(bearing(u,target)-u.heading),-2,2)*dt*2.7;
      const speed=clamp((direct?gap*.9:17)+3.7*stars,5,38);
      slide(city,u,Math.sin(u.heading)*speed*dt,Math.cos(u.heading)*speed*dt,1);
      u.state=direct&&gap<10&&game.vehicle?'RAMMING':direct&&gap<21&&stars>=3?'FIRING':police.seen?'PURSUIT':'SEARCHING';
      if(u.state==='RAMMING'&&gap<3.1)game.vehicle.health=Math.max(0,game.vehicle.health-dt*9);
      if(u.state==='FIRING'&&!game.vehicle)game.health=Math.max(0,game.health-dt*(game.cover?1:5));
    } else if(gap<2.8&&game.vehicle){
      game.vehicle.speed*=.92;game.vehicle.health=Math.max(0,game.vehicle.health-dt*12);
    }
    syncVehicle(u,game.time);
  }
}
