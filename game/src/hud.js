import {distance,clamp} from './geometry.js';
import {drawRadar} from './radar.js';
import {districtName} from './district.js';
import {debts} from './debts.js';
import {weapons} from './action.js';
import {seasons} from './lighting.js';
import {radioTracks} from './audio.js';

export const el=id=>document.getElementById(id);
const set=(id,value)=>{const node=el(id);if(node.textContent!==String(value))node.textContent=value;};
const dollars=n=>'$'+Math.round(n).toLocaleString('en-US');
const digits=n=>String(n).padStart(2,'0');
function weaponPicture(index) {
  const canvas=document.createElement('canvas');canvas.width=164;canvas.height=84;
  const g=canvas.getContext('2d');
  const shadow='#172031', steel='#a5b7c0', grip='#ab754a', shine='#e4edf0';
  function path(color,points){
    g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    g.lineJoin='round';g.lineWidth=3.7;g.strokeStyle=shadow;g.fillStyle=color;g.fill();g.stroke();
  }
  g.save();g.translate(2,3);
  if(index<3){
    g.rotate(-.075);
    if(index===2)path(steel,[[10,42],[48,41],[51,36],[109,36],[116,42],[143,42],[143,47],[113,47],[105,54],[84,52],[82,68],[69,70],[66,51],[40,50],[25,63],[11,59]]);
    else {
      path(grip,[[10,55],[37,46],[52,44],[56,39],[78,38],[82,44],[58,51],[49,50],[30,62],[11,66]]);
      path(steel,[[55,36],[82,35],[84,32],[153,32],[153,37],[116,39],[113,44],[82,45],[75,50],[58,49]]);
      path(index===0?grip:steel,[[91,42],[119,40],[124,43],[118,49],[94,50]]);
      if(index===1){
        path(shine,[[73,26],[101,26],[108,30],[66,31]]);
        path(steel,[[82,54],[95,54],[98,66],[86,66]]);
      }
    }
    g.strokeStyle=shine;g.lineWidth=2;g.beginPath();g.moveTo(87,37);g.lineTo(index===2?116:148,34);g.stroke();
  }else if(index===3){
    path(steel,[[34,67],[83,27],[142,14],[128,32],[89,50],[78,46],[46,73]]);
    path(grip,[[25,65],[70,42],[79,54],[42,78],[28,77]]);
    path(shine,[[80,41],[132,20],[124,28],[88,47]]);
  }else{
    for(const x of [35,88]){
      g.save();g.translate(x,8);g.rotate(x<60?-.17:.17);
      path('#d49b68',[[8,50],[3,35],[5,21],[11,18],[16,22],[17,13],[26,10],[31,17],[36,13],[42,19],[44,29],[48,30],[48,43],[40,53],[39,66],[15,65],[14,56]]);
      g.strokeStyle='#72483b';g.lineWidth=2;g.beginPath();g.moveTo(12,24);g.lineTo(14,35);g.lineTo(39,36);g.moveTo(25,19);g.lineTo(27,33);g.moveTo(36,21);g.lineTo(37,32);g.stroke();
      g.restore();
    }
  }
  g.restore();
  return canvas;
}
function drawPortrait(contact){
  const canvas=el('portrait'),g=canvas.getContext('2d');
  const isMara=contact.includes('Mara'), isTomas=contact.includes('Tomás');
  const grad=g.createLinearGradient(0,0,100,112);
  grad.addColorStop(0,isMara?'#9e6782':'#397b8f');grad.addColorStop(1,'#252945');g.fillStyle=grad;g.fillRect(0,0,112,112);
  g.strokeStyle='#a3dbde';g.strokeRect(5,5,102,102);
  g.fillStyle='#283348';g.beginPath();g.ellipse(58,56,31,44,-.12,0,7);g.fill();
  g.fillStyle=isMara?'#795064':'#1c3247';g.beginPath();g.ellipse(55,117,39,29,0,0,7);g.fill();
  g.fillStyle='#ae7054';g.fillRect(46,78,20,24);
  g.fillStyle='#d5936d';g.beginPath();g.ellipse(56,57,23,30,-.08,0,7);g.fill();
  g.fillStyle='#211c2c';g.beginPath();g.moveTo(30,60);g.quadraticCurveTo(25,15,56,17);g.quadraticCurveTo(91,20,81,56);g.lineTo(70,34);g.lineTo(isTomas?30:46,45);g.closePath();g.fill();
  g.fillRect(41,54,9,3);g.fillRect(61,54,9,3);
  g.fillStyle='#934f4f';g.fillRect(51,72,12,2);
  g.strokeStyle='#f6cc77';g.lineWidth=2;g.beginPath();g.arc(79,67,4,0,7);g.stroke();
}
let lastSlot=-1,lastAmmo=-1,lastContact='';
function drawLoadout(game){
  // Only the active slot includes text; the four alternatives remain icon-only.
  const slot=game.slot,w=weapons[slot], ammo=game.profile.ammo[slot]??'∞';
  if(slot===lastSlot&&ammo===lastAmmo)return;
  lastSlot=slot;lastAmmo=ammo;
  const picture=weaponPicture(slot),label=document.createElement('div');
  for(const [tag,text] of [['strong',w.name],['small',w.type],['em',slot<3?ammo+' ROUNDS':'CLOSE RANGE']]){
    const line=document.createElement(tag);line.textContent=text;label.append(line);
  }
  el('selected').replaceChildren(picture,label);
  const options=weapons.map((option,i)=>{
    if(i===slot)return null;
    const span=document.createElement('span');
    span.title=option.name+' · '+option.type;span.setAttribute('aria-label',span.title);
    span.append(weaponPicture(i));return span;
  }).filter(Boolean);
  el('alternates').replaceChildren(...options);
}
function roster(game){
  const police=game.police,live=police.units.filter(u=>u.health>0);
  set('units',live.length+' UNITS · CODE '+Math.ceil(police.heat));
  const items=live.slice(0,5).map(u=>{
    const line=document.createElement('div');line.className='unit';
    const id=document.createElement('span'), range=document.createElement('span'), status=document.createElement('b');
    id.textContent=(u.kind==='air'?'✚ ':'▪ ')+u.name;
    range.textContent=Math.round(Math.hypot(u.y-game.player.y,distance(u,game.player)))+' m';
    status.textContent=u.state;status.className=u.kind==='air'?'air':u.state==='ROADBLOCK'?'block':['FIRING','RAMMING'].includes(u.state)?'danger':'';
    line.append(id,range,status);return line;
  });
  el('roster').replaceChildren(...items);
  set('extras',live.length>5?'+'+(live.length-5)+' more units · Canal crossings monitored':live.length?'Dispatch channel open':'No active units');
}
export function drawHud(game){
  const {job,profile,vehicle,player}=game, debt=debts[job.index], active=job.status==='active';
  const timer=Math.max(0,Math.ceil(job.timer));
  const steps=debt?.steps||['All accounts settled'];
  const phase=clamp(job.phase,0,steps.length-1);
  const contact=debt?.contact||'Ines Vega';
  const weather=seasons[game.season], heat=Math.ceil(game.police.heat);
  set('debt','DEBT '+digits(Math.min(12,job.index+1))+' / 12 · '+contact.split(' ')[0].toUpperCase());
  set('timer',active?digits(Math.floor(timer/60))+':'+digits(timer%60):job.status==='failed'?'RETRY':'J');
  set('title',debt?.title||'Twelve Debts Paid');
  set('objective',job.status==='failed'?job.message:active?steps[phase]:job.status==='settled'?'Debt settled · J for the next briefing':'J · Open the crew board');
  set('stage','STAGE '+(phase+1)+' / '+steps.length);
  if(el('steps').dataset.stage!==phase+'/'+steps.length){
    el('steps').dataset.stage=phase+'/'+steps.length;
    el('steps').replaceChildren(...steps.map((_,i)=>{
      const tick=document.createElement('i');if(i<=phase)tick.className='on';return tick;
    }));
  }
  set('next',steps[phase+1]?'NEXT / '+steps[phase+1]:'OBJECTIVE / '+steps[phase]);
  set('weather',weather.name+' · '+weather.weather+' · '+weather.time);
  set('money',dollars(profile.cash));
  set('stars','★'.repeat(heat)+'☆'.repeat(5-heat));
  set('sight',heat?(game.police.seen?'WANTED / IN SIGHT':'SEARCH / STAY HIDDEN'):'FREE ROAM');
  set('district',districtName(player));
  set('respect',profile.respect+' / 550');
  el('respectFill').style.width=profile.respect/5.5+'%';
  set('contact',contact.toUpperCase()+' / CREW COMMS');
  set('line',debt?.dialogue||'Solmara takes care of its own.');
  if(contact!==lastContact){lastContact=contact;drawPortrait(contact);}
  set('track',game.radioOn?radioTracks[game.station].join(' · '):'Radio muted · R to tune');
  set('vehicle',vehicle?(vehicle.name+(vehicle.kind==='air'?' / '+Math.round(player.y)+' M':'')):'DANI CRUZ / '+(game.cover?'IN COVER':'ON FOOT'));
  const hp=Math.round(vehicle?.health??game.health);
  set('health',hp+'%');el('condition').style.width=hp+'%';
  const speed=Math.min(163,Math.round(Math.abs(vehicle?.speed||0)*3.6));
  set('speed',vehicle?speed:'ON');set('speedUnit',vehicle?(vehicle.kind==='air'?'AIR KM/H':'KM/H'):'FOOT');
  set('gear',vehicle?(vehicle.kind==='air'?'AIR':speed<4?'N':'G'+clamp(Math.ceil(speed/34),1,5)):'Q');
  set('controls',vehicle?(vehicle.kind==='air'?'WASD THRUST & YAW · SPACE LIFT · CTRL DESCEND · E EXIT · T SEASON':'WASD DRIVE · SHIFT BOOST · SPACE DRIFT · E EXIT · J DEBT · M RADAR · R RADIO'):'WASD MOVE · E INTERACT · CLICK FIRE · Q COVER · J DEBT · F HACK · T SEASON');
  set('notice',game.noticeUntil>game.time?game.noticeText:'');
  roster(game);drawLoadout(game);drawRadar(el('map'),game);
}
export function showBrief(game){
  el('brief').classList.remove('hidden');
  const debt=debts[game.profile.done];
  set('briefTitle',debt?.title||'Twelve Debts Paid');
  set('briefText',debt?debt.dialogue+' Reward '+dollars(debt.reward)+'.':'The neighborhood reserve is home.');
  el('accept').hidden=!debt;
  el('board').replaceChildren(...debts.map((d,i)=>{
    const row=document.createElement('li');
    row.textContent=d.title+(i<game.profile.done?' ✓':'');return row;
  }));
}
export function showStock(profile,buy,repair,tune){
  el('shop').classList.remove('hidden');
  const stock=weapons.slice(0,4).map((w,i)=>{
    const button=document.createElement('button'), owned=profile.owned.includes(i);
    button.textContent=w.name+' · '+(owned?(i===3?'OWNED':dollars(w.price*.25)+' AMMO'):dollars(w.price));
    button.disabled=owned&&i===3;button.onclick=()=>buy(i);return button;
  });
  const button=document.createElement('button');button.textContent='REPAIR & BOOST · $650';button.onclick=repair;
  const upgrades=[['engine','ENGINE · $2,400'],['armor','ARMOR · $1,800'],['paint','CANAL TEAL PAINT · $350']].map(([id,label])=>{
    const item=document.createElement('button');
    item.textContent=profile[id]&&id!=='paint'?id.toUpperCase()+' INSTALLED':label;
    item.disabled=id!=='paint'&&Boolean(profile[id]);item.onclick=()=>tune(id);return item;
  });
  el('stock').replaceChildren(...stock,button,...upgrades);
}
