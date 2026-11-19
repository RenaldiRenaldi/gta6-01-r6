import {T, random, material, boxAt, orb, model, slab, batch, clamp} from './geometry.js';

export const streets = [-288,-216,-144,-72,0,72,144,216,288,360];
export const cross = [-288,-216,-144,-72,0,72,144,216,288,360];
// These same control points are used by the physical canal and the live radar.
export const canal = [
  [-36,-340],[-32,-144],[-39,-72],[-36,0],[-30,72],[-41,144],[-51,216],[-49,288],[-56,410]
];
export const park = {x:29,z:39,w:37,d:35};
export const services = [
  {label:'PEARL HOUSE',x:13,z:-28,icon:'H'},
  {label:'MARKET RESERVE',x:26,z:43,icon:'$'},
  {label:'PALMETTO CUSTOMS',x:-12,z:-66,icon:'+'}
];
export function canalX(z) {
  for (let i=1;i<canal.length;i++) {
    const [x,b] = canal[i], [p,a] = canal[i-1];
    if (z<=b) return p+(x-p)*clamp((z-a)/(b-a),0,1);
  }
  return canal.at(-1)[0];
}
export const districtName = p => p.x<-130 ? 'OLD CORAL' : p.z>115 ? 'GLASS QUARTER' : 'JAKARTA • KUNINGAN';
export const nearRoad = (v,axis=streets) => axis.reduce((a,b) => Math.abs(a-v)<Math.abs(b-v)?a:b);
export function onWater(x,z) {
  return Math.abs(x-canalX(z))<5.4 && Math.abs(z-nearRoad(z,cross))>10;
}

const paint = [0xc5ab87,0xc08079,0xb2c3c2,0x738a99,0xc4a996,0x96a095,0xcd916c,0x667389];
const roofs = ['#e0d6bd','#d5c5ba','#dddedd','#aebbc1','#d9cabc','#c7c9b5','#ded2b8','#b5c3cb'];
const glass = [0x243245,0x394551,0x536675,0x6f8790].map(c=>material(c,.26,.05,.47));
const windowLight = [0xffcc79,0xff9e55,0xfbd7a0].map(c=>material(c,.37,1.25));
const curb = material(0xd9b89b), asphalt = material(0x33303c,.29,0,.28);
const leaf = material(0x315f44), freshLeaf = material(0x578548), bark = material(0x67422e);
const awning = [0xeb6a4c,0xfad29a,0x60bac1,0xe588a4,0xf5bd54].map(c=>material(c));
const pole = material(0x26363a), lane = material(0xffc877,.7,.16), stripe = material(0xe6d7c8);
const signMaterial = new Map();

function sign(source,x,y,z,width,height,title,accent,angle=0) {
  const key = title+accent;
  if (!signMaterial.has(key)) {
    const panel = document.createElement('canvas');
    panel.width=384; panel.height=80;
    const ink=panel.getContext('2d');
    ink.fillStyle='#101c29'; ink.fillRect(0,0,384,80);
    ink.fillStyle=accent; ink.fillRect(0,0,384,5); ink.fillRect(0,72,384,8);
    ink.font='bold 45px sans-serif'; ink.textAlign='center'; ink.textBaseline='middle';
    ink.fillText(title,192,42,366);
    const tex=new T.CanvasTexture(panel);
    tex.colorSpace=T.SRGBColorSpace;
    signMaterial.set(key,new T.MeshBasicMaterial({map:tex}));
  }
  const mesh=boxAt(source,signMaterial.get(key),x,y,z,width,height,.15);
  mesh.rotation.y=angle; mesh.castShadow=false;
}

function tower(source,random,footprint) {
  const {x,z,w,d,h,index}=footprint;
  const body=material(paint[index]);
  const trim=material(index%2 ? 0xe2c3a8 : 0xbdd0cd);
  boxAt(source,body,x,h/2,z,w,h,d);
  boxAt(source,trim,x,h-.14,z,w+.8,.55,d+.8);
  boxAt(source,material(0x576373),x+w*.17,h+.8,z-d*.15,w*.27,1.6,d*.28);
  for (let y=3.8;y<h-1;y+=3.25) {
    for (const face of [-1,1]) {
      for (let u=-w/2+1.6;u<w/2-1;u+=2.6) {
        const mat=random()<.28?windowLight[Math.floor(random()*3)]:glass[Math.floor(random()*4)];
        boxAt(source,mat,x+u,y,z+face*(d/2+.07),1.63,1.76,.13).castShadow=false;
      }
      for (let v=-d/2+1.6;v<d/2-1;v+=2.75) {
        const mat=random()<.25?windowLight[Math.floor(random()*3)]:glass[Math.floor(random()*4)];
        boxAt(source,mat,x+face*(w/2+.07),y,z+v,.13,1.74,1.74).castShadow=false;
      }
      if (index%3!==1 && y%2<1.6) {
        boxAt(source,trim,x,y-1.16,z+face*d/2,w+.28,.25,1.03).castShadow=false;
        boxAt(source,trim,x+face*w/2,y-1.16,z,1.04,.25,d+.28).castShadow=false;
      }
    }
  }
  for (const side of [-1,1]) {
    boxAt(source,glass[0],x+side*(w/2+.08),1.16,z,.17,2.15,d*.8);
    boxAt(source,awning[index%5],x+side*(w/2+.9),2.8,z,1.85,.24,d*.81);
  }
}

function palm(source,x,z,scale,lean) {
  const y=7.1*scale;
  slab(source,bark,x,0,z,x+lean,y,z+.55,.27*scale);
  for (let i=0;i<8;i++) {
    const a=i*.785, dx=Math.sin(a)*scale, dz=Math.cos(a)*scale;
    slab(source,i%2?leaf:freshLeaf,x+lean,y,z+.55,x+lean+dx*1.7,y+.55,z+.55+dz*1.7,.52*scale,.13);
    slab(source,leaf,x+lean+dx*1.7,y+.55,z+.55+dz*1.7,x+lean+dx*3.2,y-.7,z+.55+dz*3.2,.28*scale,.09);
  }
}
function market(source,seed) {
  const boards=['PASAR BUNGA','MELATI','KOPI SENJA','RADIO SOL'];
  for (const side of [-1,1]) for (let i=0;i<11;i++) {
    const x=side*(13+seed()*1.1),z=-4+i*6.1;
    const top=awning[(i+(side===1?1:0))%5];
    for (const u of [-1,1]) for (const v of [-1,1]) boxAt(source,pole,x+u*1.5,1.23,z+v*2,.085,2.46,.085);
    boxAt(source,top,x,2.46,z,3.8,.17,4.65);
    boxAt(source,top,x-side*1.8,2.26,z,.15,.43,4.6);
    boxAt(source,material(0x6b3f34),x,.72,z,2.1,.98,3.8);
    for(let j=0;j<13;j++) {
      const u=x+(seed()-.5)*1.9, v=z+(seed()-.5)*3.35;
      orb(source,awning[j%5],u,1.37+seed()*.25,v,.22,.21,.25).castShadow=false;
    }
    if(i%3===0) sign(source,x,2.92,z-2.28,3.5,.65,boards[(i/3)%4],side<0?'#ffb378':'#85f2dc');
  }
}
function bridge(source,a) {
  const x=canalX(a);
  boxAt(source,asphalt,x,.02,a,19,.27,20);
  for (const s of [-1,1]) {
    boxAt(source,curb,x,.32,a+10.4*s,20,.47,.54);
    for (let u=-9;u<=9;u+=3) boxAt(source,pole,x+u,.72,a+10.4*s,.13,.74,.13);
    boxAt(source,pole,x,1.07,a+10.4*s,19,.09,.09);
  }
}
export function createDistrict(scene) {
  const source=new T.Group(), rng=random(882131), buildings=[], trees=[];
  boxAt(source,material(0xa69b84),26,-1.15,33,770,1.8,762);
  for (const x of streets) {
    boxAt(source,curb,x,-.03,35,26,.22,734).castShadow=false;
    boxAt(source,asphalt,x,.025,35,20,.18,734).castShadow=false;
    for(let z=-320;z<398;z+=8) if(Math.abs(z-nearRoad(z,cross))>13) {
      boxAt(source,lane,x-.23,.13,z,.10,.018,4.6).castShadow=false;
      boxAt(source,lane,x+.23,.13,z,.10,.018,4.6).castShadow=false;
      for(const s of [-1,1]) boxAt(source,stripe,x+s*5.8,.13,z,.11,.016,2.7).castShadow=false;
    }
  }
  for (const z of cross) {
    boxAt(source,curb,32,-.035,z,730,.2,25).castShadow=false;
    boxAt(source,asphalt,32,.014,z,730,.19,19.5).castShadow=false;
    for (const x of streets) for(const s of [-1,1]) for(let i=-4;i<=4;i++) {
      boxAt(source,stripe,x+i*1.83,.139,z+s*12,1.04,.02,2.05).castShadow=false;
      boxAt(source,stripe,x+s*12,.139,z+i*1.83,2.05,.02,1.04).castShadow=false;
    }
    bridge(source,z);
  }
  for (let i=1;i<canal.length;i++) {
    const [a,z]=canal[i-1], [b,end]=canal[i], len=Math.hypot(b-a,end-z);
    const group=model(source,(a+b)/2,0,(z+end)/2);
    group.rotation.y=Math.atan2(b-a,end-z);
    boxAt(group,material(0x347c70),0,.009,0,19,.32,len+1.8);
    boxAt(group,material(0x147fa5,.22,.12,.3),0,.184,0,11,.022,len+1.5);
    for (const s of [-1,1]) {
      boxAt(group,material(0xbcb194),s*6,.42,0,1,.58,len+1.25);
      for(let k=-len/2+4;k<len/2;k+=5) {
        boxAt(group,material(k%2?0x3c9cb8:0x79bac5,.65,.15),s*(.9+rng()*3),.203,k,1+rng()*3,.012,.14);
      }
    }
  }
  for(let i=0;i<streets.length-1;i++) for(let j=0;j<cross.length-1;j++) {
    const x=streets[i]+36,z=cross[j]+36;
    for(const side of [-1,1]) for(const row of [-1,1]) {
      const bx=x+side*13,bz=z+row*13;
      if (Math.abs(bx-canalX(bz))<18 || (Math.abs(bx-park.x)<park.w/2+7 && Math.abs(bz-park.z)<park.d/2+7)) continue;
      const index=Math.floor(rng()*paint.length);
      const w=18+rng()*6,d=19+rng()*6;
      const h=11+rng()*(bz>105?48:28);
      const footprint={x:bx,z:bz,w,d,h,index,roof:roofs[index]};
      buildings.push(footprint);
      tower(source,rng,footprint);
    }
  }
  boxAt(source,material(0x618354),park.x,.1,park.z,park.w,.35,park.d);
  boxAt(source,material(0xcbb995),park.x,.291,park.z,2.8,.018,park.d);
  boxAt(source,material(0xcbb995),park.x,.291,park.z,park.w,.018,2.8);
  for (let i=0;i<34;i++) {
    const x=park.x+(rng()-.5)*park.w, z=park.z+(rng()-.5)*park.d;
    if(Math.abs(x-park.x)<2 || Math.abs(z-park.z)<2) continue;
    trees.push({x,z});
    boxAt(source,bark,x,1.3,z,.22,2.6,.22);
    orb(source,i%2?leaf:freshLeaf,x,2.95,z,1.5+rng(),1.6,1.5+rng());
  }
  for (let i=0;i<100;i++) {
    const z=-250+i%24*27, x=streets[Math.floor(i/24)+2]+(i%2?11.1:-11.1);
    if(i%2===0) palm(source,x,z,.8+rng()*.65,(rng()-.5)*2);
    else {
      boxAt(source,pole,x,2.65,z,.13,5.3,.13);
      boxAt(source,pole,x+.95,5.19,z,2.03,.17,.13);
      boxAt(source,windowLight[0],x+1.72,5.06,z,.66,.14,.29);
    }
  }
  market(source,rng);
  sign(source,-13.5,4.2,-8,6.3,.97,'PASAR BUNGA','#ffd47d',Math.PI/2);
  sign(source,13.7,3.6,19,7.1,1.15,'SOL WAVE','#82f3e7',Math.PI/2);
  sign(source,-155,3.2,-60,8.2,1.12,'OLD CORAL','#ee91e6',Math.PI/2);
  sign(source,16,3.25,-73,8.5,1,'RASUNA SAID','#5ce3b7');
  batch(source,scene);
  return {buildings,trees};
}

export function floorAt(city,x,z) {
  return city.buildings.find(b=>Math.abs(x-b.x)<b.w/2 && Math.abs(z-b.z)<b.d/2)?.h || 0;
}
export function passable(city,x,y,z,r=.38) {
  if(x<-319||x>392||z<-319||z>394) return false;
  if(y<.6&&onWater(x,z)) return false;
  return !city.buildings.some(b=>y<b.h && Math.abs(x-b.x)<b.w/2+r && Math.abs(z-b.z)<b.d/2+r);
}
export function slide(city,p,dx,dz,r) {
  let moved=false;
  if(passable(city,p.x+dx,p.y,p.z,r)) {p.x+=dx; moved=true;}
  if(passable(city,p.x,p.y,p.z+dz,r)) {p.z+=dz; moved=true;}
  return moved;
}
export function visible(city,a,b) {
  const steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/2.7);
  for(let i=1;i<steps;i++){
    const t=i/steps;
    if(floorAt(city,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)>(a.y||1)+((b.y||1)-(a.y||1))*t) return false;
  }
  return true;
}
