import {canal,canalX,park,services,streets,cross} from './district.js';

const center=200, radius=190;
const colors={road:'#252832',edge:'#f2e3bc',water:'#23a6e5',bank:'#e7cea0',park:'#67994e'};
export function radarProject(player,x,z,scale=1.45){
  return [center+(x-player.x)*scale,center-(z-player.z)*scale];
}
function stroke(ctx,vertices,width,color){
  ctx.beginPath();
  vertices.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
function circle(ctx,x,y,r,fill,line,width=1){
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(line){ctx.strokeStyle=line;ctx.lineWidth=width;ctx.stroke();}
}
function caption(ctx,text,x,y,size=15,fill='#fffbed'){
  ctx.font='800 '+size+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=3;ctx.strokeStyle='#203846';ctx.strokeText(text,x,y);
  ctx.fillStyle=fill;ctx.fillText(text,x,y);
}
export function drawRadar(canvas,game) {
  // North is fixed; the world translates beneath the player's heading arrow.
  const ctx=canvas.getContext('2d'), p=game.player, scale=game.mapZoom?2.1:1.72;
  const project=(x,z)=>radarProject(p,x,z,scale);
  const rect=(x,z,w,d,fill)=>{
    const [a,b]=project(x-w/2,z+d/2);
    ctx.fillStyle=fill;ctx.fillRect(a,b,w*scale,d*scale);
  };
  const dot=(x,z,color,icon)=>{
    const [a,b]=project(x,z);
    if(Math.hypot(a-center,b-center)>radius-14 || (b>346&&a<146))return;
    circle(ctx,a,b,icon?10:5,color,'#fff8de',icon?2:1.5);
    if(icon)caption(ctx,icon,a,b+1,15);
  };
  ctx.clearRect(0,0,400,400);
  circle(ctx,center,center,197,'#164179','#86d5ff',3);
  ctx.save();
  circle(ctx,center,center,radius,'#dfd0af');
  ctx.clip();
  for(const x of streets)for(const z of cross){
    rect(x+36,z+36,48,48,(x+z)%144===0?'#d1c1a2':'#d9caaa');
    rect(x+36,z+36,44,44,'#e9dfc9');
  }
  rect(park.x,park.z,park.w,park.d,colors.park);
  rect(park.x,park.z,1.8,park.d,'#e5d8ad');rect(park.x,park.z,park.w,1.8,'#e5d8ad');
  for(const tree of game.city.trees){
    const [a,b]=project(tree.x,tree.z);
    circle(ctx,a+2,b+3,6.5,'#285c3e');
    if(Math.round(tree.x)%3===0){
      ctx.beginPath();ctx.moveTo(a,b-8);ctx.lineTo(a+6,b+5);ctx.lineTo(a-6,b+5);ctx.closePath();ctx.fillStyle='#2d7546';ctx.fill();
    }else{circle(ctx,a,b,5.7,'#39884b');circle(ctx,a-1.8,b-1.8,3,'#94bb6d');}
  }
  const path=canal.map(([x,z])=>project(x,z));
  stroke(ctx,path,22*scale,colors.bank);stroke(ctx,path,12*scale,colors.water);
  stroke(ctx,canal.map(([x,z])=>project(x+2.1,z)),2.5*scale,'#7bceed');
  for(const x of streets){
    const line=[project(x,-350),project(x,420)];
    stroke(ctx,line,22*scale,colors.edge);stroke(ctx,line,17*scale,colors.road);
    if(x===0)stroke(ctx,line,1.5,'#aa9976');
  }
  for(const z of cross){
    const line=[project(-350,z),project(420,z)];
    stroke(ctx,line,22*scale,colors.edge);stroke(ctx,line,17*scale,colors.road);
    const [bx,by]=project(canalX(z),z);
    stroke(ctx,[[bx-12*scale,by-10*scale],[bx+12*scale,by-10*scale]],2.6,'#fff0c9');
    stroke(ctx,[[bx-12*scale,by+10*scale],[bx+12*scale,by+10*scale]],2.6,'#fff0c9');
  }
  for(const b of game.city.buildings){
    if(Math.abs(b.x-p.x)>130||Math.abs(b.z-p.z)>135)continue;
    rect(b.x+1.3,b.z-1.6,b.w,b.d,'#97998c');
    rect(b.x,b.z,b.w,b.d,b.roof);
    rect(b.x+.7,b.z+.5,b.w*.82,b.d*.75,b.h>30?'#7a9da9':'#bdbaa3');
    rect(b.x+b.w*.14,b.z-b.d*.12,b.w*.26,b.d*.28,'#eae9dc');
    rect(b.x-b.w*.24,b.z+b.d*.2,b.w*.24,b.d*.22,'#eef0d6');
    rect(b.x,b.z-b.d*.47,b.w*.83,1.2,'#536d76');
    rect(b.x-4.4,b.z+b.d*.39,.6,1.25,'#ffcb5f');
    rect(b.x+3.6,b.z+b.d*.39,.6,1.25,'#ffcc69');
  }
  for(const r of [54,108,158])circle(ctx,center,center,r,null,'#46c8c066',2);
  if(game.police.heat>0) {
    const [x,y]=project(game.police.last.x,game.police.last.z);
    ctx.setLineDash([8,5]);circle(ctx,x,y,57+game.police.heat*10,'#d25a4f16','#df4049',2.8);ctx.setLineDash([]);
  }
  const target=game.target;
  if(target){
    const [a,b]=project(target.x,target.z);
    const d=Math.hypot(a-center,b-center)||1,r=Math.min(1,166/d);
    ctx.setLineDash([6,4]);stroke(ctx,[[center,center],[center+(a-center)*r,center+(b-center)*r]],2.5,'#1377bc');
    ctx.setLineDash([]);
    circle(ctx,center+(a-center)*r,center+(b-center)*r,6.5,'#199bff','#f7fbfb',2);
  }
  dot(19,23,'#1697e2');dot(-11,47,'#1697e2');
  for(const s of services)if(s.icon!=='+')dot(s.x,s.z,s.icon==='H'?'#187f9f':'#258f45',s.icon);
  for(const u of game.police.units)if(u.health>0)dot(u.x,u.z,u.kind==='air'?'#fa684e':'#e22c43');
  const [cx,cy]=project(canalX(p.z+51),p.z+51);
  if(Math.hypot(cx-center,cy-center)<147)caption(ctx,'KANAL RASUNA',cx-5,cy-4,14,'#c7f8ff');
  const [lx,ly]=project(2,p.z-69);
  if(lx>126&&lx<277)caption(ctx,'JL. RASUNA SAID',lx+34,ly,14);
  const [px,py]=project(park.x,park.z);
  if(Math.hypot(px-center,py-center)<142){
    caption(ctx,'HUTAN KOTA',px,py+17,16,'#e6ffbc');
    caption(ctx,'MENTENG',px,py+34,13,'#fff4b9');
  }
  ctx.save();ctx.translate(center,center);ctx.rotate(p.heading);
  ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(11,11);ctx.lineTo(0,7);ctx.lineTo(-11,11);ctx.closePath();
  ctx.fillStyle='#fff';ctx.strokeStyle='#155e72';ctx.lineWidth=4;ctx.stroke();ctx.fill();
  ctx.fillStyle='#32d4c5';ctx.fillRect(-2,0,4,8);ctx.restore();
  ctx.restore();
  circle(ctx,center,center,190,null,'#1582ed',7);circle(ctx,center,center,185,null,'#79f0fb',1.3);
  circle(ctx,200,20,15,'#123558','#79dafa',2);caption(ctx,'N',200,21,17);
  ctx.fillStyle='#17394eea';ctx.beginPath();ctx.roundRect(68,315,50*scale+12,35,7);ctx.fill();
  caption(ctx,'50 m',74+25*scale,324,14,'#d6ffff');
  stroke(ctx,[[74,339],[74+50*scale,339]],2.5,'#9df9ef');
  for(const x of [74,74+50*scale])stroke(ctx,[[x,335],[x,343]],2,'#9df9ef');
}
