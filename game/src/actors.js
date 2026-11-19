import {T,model,boxAt,orb,shape,slab,material,clamp,bearing,distance,random} from './geometry.js';
import {slide,floorAt,streets,cross,nearRoad} from './district.js';

const rubber=material(0x131720), chrome=material(0xc2b1a5,.23,0,.66);
const red=material(0xff3051,.39,4), ice=material(0x53aeff,.34,4);
const white=material(0xffe1ad,.34,3);
const window=material(0x25374d,.22,.04,.55);
const dark=material(0x222733,.45);
const wheel=new T.CylinderGeometry(1,1,1,20);
const skin=[0xd78e61,0x8f5035,0xe4ae82,0xbb744e].map(c=>material(c));
const hair=material(0x211820), jeans=material(0x223145);
const beamMaterial = new T.ShaderMaterial({
  transparent:true, depthWrite:false, side:T.DoubleSide, blending:T.AdditiveBlending,
  uniforms:{tint:{value:new T.Color(0xa7dbff)}},
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 v; uniform vec3 tint; void main(){float edge=pow(abs(cos((v.x-.04)*6.283)),2.);gl_FragColor=vec4(tint,(.07+edge*.13)*pow(v.y,.60));}'
});
const cone = new T.ConeGeometry(1,1,48,1,true);
const lightPlane = new T.PlaneGeometry(1,1);
function compactParts(root,retained=[]) {
  const keep=new Set(retained), groups=new Map();
  for(const node of [...root.children]){
    if(!node.isMesh||keep.has(node))continue;
    node.updateMatrix();
    const key=[node.geometry.id,node.material.id,node.castShadow,node.receiveShadow].join();
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(node);
  }
  for(const list of groups.values()){
    if(list.length<2)continue;
    const source=list[0],pack=new T.InstancedMesh(source.geometry,source.material,list.length);
    list.forEach((part,index)=>{pack.setMatrixAt(index,part.matrix);root.remove(part);});
    pack.castShadow=source.castShadow;pack.receiveShadow=source.receiveShadow;
    pack.computeBoundingSphere();root.add(pack);
  }
}
function gradientMaterial(color,opacity=.8) {
  const cn=document.createElement('canvas');
  cn.width=cn.height=128;
  const c=cn.getContext('2d'), g=c.createRadialGradient(64,64,2,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,.94)');
  g.addColorStop(.24,'rgba(255,255,255,.52)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,128,128);
  return new T.MeshBasicMaterial({color,map:new T.CanvasTexture(cn),transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending});
}
const pools=[0xff2037,0x269bff,0xffab52,0x8dd6ff,0xffe4b2].map(c=>gradientMaterial(c));
export function glowPool(parent,x,z,w,d,index=0,y=.18) {
  const mesh=shape(parent,lightPlane,pools[index],x,y,z,w,d);
  mesh.rotation.x=-Math.PI/2; mesh.castShadow=false;mesh.receiveShadow=false;
  return mesh;
}
function panel(parent,paint,points) {
  const vertices=[];
  for(let i=1;i<points.length-1;i++) vertices.push(...points[0],...points[i],...points[i+1]);
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  return shape(parent,geo,paint,0,0,0);
}
export function coupe(scene,x,z,options={}) {
  const {color=0xee392b,name='MARINER GT',heading=0,police=false}=options;
  const mesh=model(scene,x,.15,z), coat=material(color,.26,.04,.31), trim=material(0x410d25,.31);
  const tail=-2.37,nose=2.48;
  boxAt(mesh,dark,0,.44,0,2.18,.46,4.2);
  boxAt(mesh,coat,0,.83,.04,2.36,.57,4.76);
  boxAt(mesh,coat,0,1.13,1.39,2.23,.16,1.92);
  boxAt(mesh,coat,0,1.15,-1.72,2.28,.21,1.17);
  for(const s of [-1,1]) {
    boxAt(mesh,coat,s*1.11,.98,.05,.23,.46,4.43);
    boxAt(mesh,dark,s*1.18,.59,.04,.16,.17,2.14);
    boxAt(mesh,coat,s*1.25,1.31,.66,.24,.14,.31);
    const side = s>0
      ? [[.99,1.13,-1.2],[.99,1.13,1.23],[.88,1.61,.55],[.88,1.61,-.81]]
      : [[-.99,1.13,1.23],[-.99,1.13,-1.2],[-.88,1.61,-.81],[-.88,1.61,.55]];
    panel(mesh,window,side);
    for(const zed of [-1.55,1.56]) {
      const tire=shape(mesh,wheel,rubber,s*1.09,.51,zed,.49,.32,.49);
      tire.rotation.z=Math.PI/2;
      const rim=shape(mesh,wheel,chrome,s*1.264,.51,zed,.29,.035,.29);
      rim.rotation.z=Math.PI/2;
      const hub=shape(mesh,wheel,dark,s*1.29,.51,zed,.13,.045,.13);
      hub.rotation.z=Math.PI/2;
      boxAt(mesh,coat,s*1.033,1.05,zed,.37,.23,1.05);
    }
    boxAt(mesh,trim,s*.76,1.007,tail-.05,.78,.27,.075);
    boxAt(mesh,red,s*.78,1.07,tail-.1,.64,.073,.055);
    boxAt(mesh,red,s*.78,.96,tail-.1,.64,.055,.055);
    boxAt(mesh,white,s*.77,1.04,nose-.047,.69,.13,.09);
    boxAt(mesh,chrome,s*.79,.49,tail-.02,.21,.11,.15);
  }
  panel(mesh,window,[[.99,1.12,-1.3],[-.99,1.12,-1.3],[-.88,1.61,-.81],[.88,1.61,-.81]]);
  panel(mesh,window,[[-.99,1.13,1.26],[.99,1.13,1.26],[.88,1.61,.55],[-.88,1.61,.55]]);
  boxAt(mesh,coat,0,1.622,-.127,1.8,.11,1.39);
  boxAt(mesh,dark,0,.62,tail-.05,2.1,.21,.16);
  boxAt(mesh,chrome,0,.81,tail-.09,.49,.19,.046);
  boxAt(mesh,coat,0,1.27,tail+.12,2.26,.075,.4);
  boxAt(mesh,dark,0,.83,nose-.026,1.47,.21,.074);
  if (police) {
    boxAt(mesh,material(0xf0ede0),0,1.735,-.13,1.75,.15,.67);
    boxAt(mesh,material(0xe4e3d3),0,.82,-2.45,2.02,.29,.05);
  }
  const lights=[];
  if(police) {
    lights.push(boxAt(mesh,red,-.48,1.87,-.12,.77,.15,.32),boxAt(mesh,ice,.48,1.87,-.12,.77,.15,.32));
    lights.push(glowPool(mesh,-1.25,-3.15,3.5,9,0,.04),glowPool(mesh,1.25,-3.15,3.5,9,1,.04));
  } else {
    glowPool(mesh,-.58,-2.72,1.7,3,0,.045);
    glowPool(mesh,.58,-2.72,1.7,3,0,.045);
    glowPool(mesh,-.75,3.1,2,4.3,4,.043);
    glowPool(mesh,.75,3.1,2,4.3,4,.043);
  }
  const vehicle={mesh,coat,x,y:0,z,heading,name,health:100,speed:0,police,lights,kind:'car',traffic:false,vy:0,engine:false,armor:false};
  compactParts(mesh,lights);
  syncVehicle(vehicle);
  return vehicle;
}
export function helicopter(scene,x,y,z,police=false) {
  const mesh=model(scene,x,y,z), rotor=model(mesh,0,1.76,-.18), tailRotor=model(mesh,.2,.79,-5.1);
  const shell=material(police?0x22445a:0xeca04a,.28,0,.46);
  const belly=material(police?0xeee0c6:0x31404d);
  orb(mesh,shell,0,.6,0,1.27,1,2.24);
  orb(mesh,window,0,.85,1.3,1.09,.75,1.18);
  orb(mesh,belly,0,.07,.25,1.17,.52,1.92);
  for (const s of [-1,1]) {
    boxAt(mesh,belly,s*1.12,.57,-.21,.18,.19,2.42);
    slab(mesh,chrome,s*.72,.05,.83,s*1.16,-.64,.85,.095);
    slab(mesh,chrome,s*.72,.05,-.91,s*1.16,-.64,-.9,.095);
    boxAt(mesh,dark,s*1.16,-.64,.14,.15,.16,3.92);
    boxAt(mesh,s<0?red:ice,s*1.25,.62,-.62,.145,.12,.22);
    orb(mesh,window,s*1.02,.86,-.09,.28,.44,.88);
  }
  slab(mesh,shell,0,.52,-1.46,0,.81,-5,.45,.54);
  boxAt(mesh,belly,0,1,-4.88,.21,1.38,.65).rotation.x=-.27;
  boxAt(mesh,shell,0,.75,-3.91,2.48,.13,.55);
  boxAt(mesh,chrome,0,1.64,-.18,.19,.55,.19);
  const blade=material(0x26333a,.29);
  for(let i=0;i<4;i++) {
    const arm=model(rotor);
    arm.rotation.y=i*Math.PI/2;
    boxAt(arm,blade,2.16,0,0,4.5,.05,.24);
    boxAt(arm,belly,4.19,0,0,.42,.065,.25);
  }
  boxAt(tailRotor,dark,0,0,0,.04,.12,1.19);
  boxAt(tailRotor,dark,0,0,0,.04,1.19,.12);
  const beacon=orb(mesh,white,-.45,-.32,1.39,.22,.18,.22);
  const beam=shape(scene,cone,beamMaterial,x,y/2,z,y*.23,y,y*.23);
  beam.castShadow=false;beam.renderOrder=4;
  const pool=glowPool(scene,x,z,8,9,3,.32);
  compactParts(mesh,[beacon]);
  return {x,y,z,mesh,rotor,tailRotor,beacon,beam,pool,heading:.3,speed:0,health:100,kind:'air',
    name:police?'FALCON-01':'MARA’S KITE',police,state:'SPOTLIGHT'};
}
export function syncVehicle(v,t=0) {
  // Search beams follow the live aircraft and the surface directly below it.
  v.mesh.position.set(v.x,v.y+.16,v.z);
  v.mesh.rotation.y=v.heading;
  if(v.kind==='air'){
    v.rotor.rotation.y=t*17+.45;
    v.tailRotor.rotation.x=t*28;
    v.mesh.rotation.x=clamp(v.speed*.004,-.16,.2);
    const start=new T.Vector3(v.x-.45,v.y-.26,v.z+1.39);
    const end=new T.Vector3(v.x+2.7,v.surface||.23,v.z+4.5);
    const axis=start.clone().sub(end);
    v.beam.visible=v.pool.visible=axis.y>3;
    v.beam.position.copy(start).lerp(end,.5);
    v.beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize());
    v.beam.scale.set(Math.min(8,1.9+axis.y*.22),axis.length(),Math.min(8,1.9+axis.y*.22));
    v.pool.position.copy(end);
    v.pool.scale.set(Math.min(14,axis.y*.5),Math.min(14,axis.y*.5),1);
  } else if(v.police) {
    const flip=Math.floor(t*9+v.x*.08)%2===0;
    v.lights[0].visible=v.lights[2].visible=flip;
    v.lights[1].visible=v.lights[3].visible=!flip;
  }
}
export function ride(city,v,input,dt) {
  const {forward,steer,back,boost,brake,lift,drop}=input;
  if(v.kind==='air'){
    v.heading-=steer*dt*1.48;
    v.speed=clamp((v.speed+(forward*21-back*22)*dt)*Math.exp(-dt*.34),-14,39);
    const nx=clamp(v.x+Math.sin(v.heading)*v.speed*dt,-313,384);
    const nz=clamp(v.z+Math.cos(v.heading)*v.speed*dt,-313,385);
    const floor=floorAt(city,nx,nz);
    if(v.y+.35>=floor){v.x=nx;v.z=nz;}
    v.y=clamp(v.y+(lift*16-drop*14)*dt,floorAt(city,v.x,v.z),112);
    v.surface=floorAt(city,v.x+2,v.z+4)+.25;
  } else {
    if(v.y>0||v.vy>0){
      v.vy-=dt*16;
      v.y=Math.max(0,v.y+v.vy*dt);
      if(v.y===0)v.vy=0;
    }
    v.speed=clamp((v.speed+(forward*(boost?53:29)*(v.engine?1.22:1)-back*34)*dt)*Math.exp(-dt*(brake?2.15:.38)),-12,45.3);
    v.heading-=steer*dt*(brake?2.75:1.9)*clamp(Math.abs(v.speed)/8,.12,1)*Math.sign(v.speed||1);
    const ox=v.x,oz=v.z;
    slide(city,v,Math.sin(v.heading)*v.speed*dt,Math.cos(v.heading)*v.speed*dt,1.2);
    if(Math.hypot(v.x-ox,v.z-oz)<Math.abs(v.speed*dt)*.39 && Math.abs(v.speed)>2) {
      v.health=clamp(v.health-Math.abs(v.speed)*(v.armor?.23:.39),0,100);v.speed*=-.24;
    }
  }
}
export function repaint(vehicle,color){
  const previous=vehicle.coat,next=previous.clone();
  next.color.setHex(color);next.emissive.setHex(color);
  vehicle.mesh.traverse(node=>{if(node.isMesh&&node.material===previous)node.material=next;});
  vehicle.coat=next;
}
function joint(parent,x,y,z,color,length,width) {
  const pivot=model(parent,x,y,z);
  boxAt(pivot,color,0,-length*.49,0,width,length,width);
  return pivot;
}
export function human(scene,x,z,options={}) {
  const {color=0x4baaa7,shade=0,heading=0,uniform=false,armed=false}=options;
  const mesh=model(scene,x,.13,z), shirt=material(color), tone=skin[shade%4];
  const upper=model(mesh,0,1.05,0);
  boxAt(upper,shirt,0,.302,0,.57,.65,.365);
  boxAt(upper,material(uniform?0x242e38:0xd7b272),0,.025,0,.57,.083,.372);
  boxAt(upper,tone,0,.67,0,.19,.18,.2);
  orb(upper,tone,0,.86,0,.232,.257,.214);
  orb(upper,hair,0,.98,-.035,.237,.16,.218);
  if(uniform){
    boxAt(upper,material(0x0f2234),0,.993,.14,.48,.09,.24);
    boxAt(upper,material(0xf2cd79),-.16,.44,.193,.095,.096,.026);
  } else {
    boxAt(upper,material(0x264651),0,.3,-.187,.29,.37,.035);
    boxAt(upper,material(0xeac47e),0,.32,-.21,.19,.065,.018);
  }
  const arms=[], legs=[];
  for(const s of [-1,1]){
    const arm=joint(upper,s*.36,.51,0,shirt,.3,.216);
    const hand=joint(arm,0,-.27,0,tone,.29,.155);
    orb(hand,tone,0,-.29,0,.09,.099,.075);
    arms.push({arm,hand});
    const leg=joint(mesh,s*.15,1.06,0,jeans,.46,.229);
    const knee=joint(leg,0,-.43,0,jeans,.43,.185);
    boxAt(knee,dark,0,-.45,.08,.23,.143,.35);
    legs.push({leg,knee});
  }
  const gun=model(upper,-.45,.48,.51);
  gun.scale.set(1.12,1.12,1.28);
  boxAt(gun,material(0x553323),0,-.02,-.37,.105,.145,.41);
  boxAt(gun,chrome,0,.023,-.045,.104,.105,.27);
  boxAt(gun,dark,0,.062,.34,.075,.063,.63);
  boxAt(gun,material(0x191a1d,.35),0,-.014,.29,.092,.077,.57);
  boxAt(gun,material(0x804a26),0,-.017,.28,.139,.127,.243);
  boxAt(gun,material(0x16161c),0,-.071,-.072,.06,.06,.12);
  gun.visible=armed;
  return {mesh,upper,arms,legs,gun,x,y:0,z,heading,health:100,armed,mode:armed?'aim':'idle',phase:x*.71+z*.43};
}
export function pose(p,time=0) {
  // The two-handed pose keeps the gun level; grapples have independent arms.
  p.mesh.position.set(p.x,p.y+.13,p.z);p.mesh.rotation.y=p.heading;
  const run=p.mode==='run', aim=p.mode==='aim', grab=p.mode==='grapple', stagger=p.mode==='stagger';
  const step=Math.sin(time*(run?12:7)+p.phase);
  const gait=run?.78:p.mode==='walk'?.42:.065;
  p.upper.position.y=1.05+(run?Math.abs(step)*.06:0);
  p.upper.rotation.x=run?.19:grab?.26:stagger?-.4:0;
  p.upper.rotation.z=grab?.13*Math.cos(time*10+p.phase):stagger?.34:0;
  p.mesh.rotation.z=stagger?.25:0;
  p.gun.visible=aim && p.armed;
  p.arms.forEach(({arm,hand},i)=>{
    arm.rotation.x=aim?(i===0?-1.57:-1.78):grab?-1.28+step*.22:stagger?-1.32:step*gait*(i===0?-1:1);
    arm.rotation.z=aim?(i===0?.05:-.57):stagger?(i===0?-.85:.85):(i===0?-.12:.12);
    hand.rotation.x=aim?(i===0?-.22:-.05):grab?-.53:-.13;
  });
  p.legs.forEach(({leg,knee},i)=>{
    leg.rotation.x=step*gait*(i===0?1:-1)+(aim||grab?i*.32-.16:0);
    knee.rotation.x=Math.max(0,-leg.rotation.x)*.63+.06;
  });
}
export function createStreetLife(scene) {
  const rng=random(51973), cars=[], people=[];
  const colors=[0xb84938,0xf0b22e,0x2c9396,0xe3dbbb,0x775ba6,0x4a729e,0xe48f91];
  for(let i=0;i<44;i++){
    const north=i%2===0, sign=i%4<2?1:-1;
    const street=streets[(i*7+Math.floor(i/8))%streets.length];
    const long=-287+rng()*655, lane=street+sign*4.8;
    const v=coupe(scene,north?lane:long,north?long:lane,{color:colors[i%colors.length],heading:north?(sign>0?0:Math.PI):sign*Math.PI/2,name:i%7===1?'SUN CAB':'COASTLINE'});
    v.traffic=true;v.axis=north?'z':'x';v.sign=sign;v.rate=6+rng()*6;
    cars.push(v);
  }
  for(let i=0;i<95;i++){
    const x=i<44?(i%2?11:-11)*(1+rng()*.2):streets[i%streets.length]+(i%2?-12:12);
    const z=i<44?-20+rng()*128:-250+rng()*570;
    const p=human(scene,x,z,{color:colors[i%colors.length],shade:i});
    p.origin={x,z};p.sign=i%2?1:-1;
    people.push(p);
  }
  return {cars,people};
}
export function tickStreetLife(game,dt) {
  const {city,life,player,time}=game;
  for(const v of life.cars){
    if(!v.traffic || v===game.vehicle || v.health<=0) continue;
    const closest=nearRoad(v[v.axis],cross), light=Math.floor(time/7+closest/72)%2;
    const lead=(closest-v[v.axis])*v.sign;
    const stopping=lead>9 && lead<15 && light===(v.axis==='z'?1:0);
    const old=v[v.axis];
    v[v.axis]+=v.sign*v.rate*dt*(stopping?0:1);
    if(v[v.axis]>386)v[v.axis]=-308;
    if(v[v.axis]<-310)v[v.axis]=385;
    if(distance(v,player)<2.55 && game.vehicle!==v){
      v[v.axis]=old;
      if(game.vehicle?.kind==='car' && Math.abs(game.vehicle.speed)>8) {
        game.vehicle.health=clamp(game.vehicle.health-18*dt,0,100);
        game.vehicle.speed*=.87;
      }
    }
    syncVehicle(v,time);
  }
  for(const p of life.people) {
    p.mesh.visible=distance(p,player)<125;
    if(!p.mesh.visible)continue;
    const fleeing=game.police.heat>0 && distance(p,player)<24;
    p.heading=fleeing?bearing(player,p):(p.sign>0?0:Math.PI);
    const pace=fleeing?4.6:1.22;
    if(!fleeing && Math.abs(p.z-p.origin.z)>8)p.sign=p.z>p.origin.z?-1:1;
    if(!slide(city,p,Math.sin(p.heading)*pace*dt,Math.cos(p.heading)*pace*dt,.32))p.sign*=-1;
    p.mode=fleeing?'run':'walk';
    pose(p,time);
  }
}
