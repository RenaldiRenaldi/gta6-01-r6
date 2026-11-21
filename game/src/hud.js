import {distance,clamp} from './geometry.js';
import {drawRadar} from './radar.js';
import {districtName} from './district.js';
import {debts} from './debts.js';
import {weapons} from './action.js';
import {seasons} from './lighting.js';
import {radioTracks} from './audio.js';
import {loadSlots} from './progress.js';

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
  set('units',live.length+' UNITS · CODE '+Math.min(5,Math.ceil(police.heat))+' · '+Math.ceil(police.heat)+'★ MAX');
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
  const {job,profile,player}=game,vehicle=game.vehicle||(!game.shotLive?game.shotVehicle:null), debt=debts[job.index], active=job.status==='active';
  const timer=Math.max(0,Math.ceil(job.timer));
  const steps=debt?.steps||['All accounts settled'];
  const phase=clamp(job.phase,0,steps.length-1);
  const contact=debt?.contact||'Ines Vega';
  const weather=game.shot==='summer'&&!game.shotLive?{...seasons[1],weather:'MONSOON BREAK',time:'12:16'}:seasons[game.season], heat=Math.ceil(game.police.heat);
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
  set('stars','★'.repeat(heat)+'☆'.repeat(6-heat));
  set('sight',heat?(game.police.seen?'WANTED / IN SIGHT':'SEARCH / STAY HIDDEN'):'FREE ROAM');
  el('searchCircle').className=heat&&!game.police.seen?'active':'';
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
  const rp=profile.rp??3900,cap=5200,rank=rp>=5200?'SHOT CALLER':rp>=3000?'FIXER':rp>=1800?'OPERATOR':rp>=1000?'SCAVENGER':rp>=400?'WHEELMAN':'RUNNER';
  set('crewRank','RANK '+(rp>=5200?6:rp>=3000?5:rp>=1800?4:rp>=1000?3:rp>=400?2:1)+' · '+rank);set('rpValue',rp.toLocaleString('en-US')+' / '+cap.toLocaleString('en-US')+' RP');set('rpNext',rp>=cap?'TOP CREW RANK':(cap-rp).toLocaleString('en-US')+' TO SHOT CALLER');el('rpFill').style.width=Math.min(100,rp/cap*100)+'%';
  set('komodoCount',(game.shot?12:profile.komodos?.length||0)+'/20');
  set('controls',game.shot==='summer'&&!game.shotLive?'WASD MOVE · E INTERACT · CLICK FIRE · Q COVER · J DEBT · F HACK · T SEASON · R RADIO':vehicle?(vehicle.kind==='air'?'WASD THRUST & YAW · SPACE LIFT · CTRL DESCEND · E EXIT · T SEASON':'WASD DRIVE · SHIFT BOOST · SPACE DRIFT · E EXIT · J DEBT · M RADAR · R RADIO'):'WASD MOVE · E INTERACT · CLICK FIRE · Q COVER · J DEBT · F HACK · T SEASON');
  set('notice',game.noticeUntil>game.time?game.noticeText:'');
  roster(game);drawLoadout(game);drawRadar(el('map'),game);
}
function cityMap(){
  // The 900×560 viewBox keeps all eleven district labels in the island's original proportions.
  const districts=[['KUNINGAN',118,80],['MENTENG',265,48],['RASUNA SAID',410,82],['SETIABUDI',520,145],['GLASS QUARTER',675,100],['CASABLANCA',595,250],['PALM QUAY',740,360],['PELABUHAN TUA',570,438],['RAWA MUARA',410,420],['OLD CORAL',250,380],['KEPULAUAN SERIBU',760,72]];
  return '<svg class="jakarta-map" viewBox="0 0 900 560" role="img" aria-label="Jakarta island map with pink route"><path class="map-water" d="M0 0h900v560H0z"/><path class="map-land" d="M75 66C205 22 328 58 408 43c110-20 159 25 254 7 81-15 135 18 154 78 25 82-20 109 23 178 36 59-28 121-107 133-126 20-174 85-294 38-112-44-201-40-279-91-83-54-111-115-82-183 22-53 3-96-2-137z"/><path class="map-road" d="M100 145L295 108 460 130 650 95 789 176M130 285L289 252 443 273 599 238 770 292M148 414L302 374 430 402 604 370 768 417M227 70L210 477M393 46L401 498M553 63L539 475M680 83L692 481"/><path class="map-route" d="M104 431C175 377 189 300 278 265S388 153 469 189s74 109 146 129 84 34 141 66"/><circle class="map-pin" cx="104" cy="431" r="9"/><circle class="map-pin" cx="790" cy="384" r="9"/>'+districts.map(([n,x,y])=>'<g class="map-label" transform="translate('+x+' '+y+')"><circle r="4"/><text x="8" y="4">'+n+'</text></g>').join('')+'</svg>';
}
export function drawRecords(game){
  const p=game.profile,done=game.statsShot?12:Math.min(12,p.done||0),cash=game.statsShot?98640:p.cash||0;
  const career=game.statsShot?{carsStolen:26,copsEscaped:14,distanceKm:83.6}:p.career||{};
  const checklist=['Twelve Debts','Kuningan safehouse','Menteng market lead','Rasuna Said relay','Setiabudi archive','Glass Quarter rooftop','Casablanca night run','Palm Quay escape','Pelabuhan Tua freight','Rawa Muara canal','Old Coral snowfall','Kepulauan Seribu flight','Swap Plates crew skill','Quick Fix crew skill','Eyes Out crew skill','Golden Komodo cache','Six-star response','All seasons visited'];
  const rows=checklist.map((label,i)=>{const complete=i<done||i===12&&(p.abilityUses?.z||0)>0||i===13&&(p.abilityUses?.x||0)>0||i===14&&(p.abilityUses?.c||0)>0||i===15&&(p.komodos?.length||0)>=20||i===16&&(p.maxHeat||0)>=6||i===17&&(p.seasonsPlayed?.length||0)>=4;return '<li class="check-row '+(complete?'complete':'')+'"><i></i><span>'+label+'</span><b>'+(complete?'DONE':i===15?(p.komodos?.length||0)+'/20':'OPEN')+'</b></li>';}).join('');
  const grades=game.statsShot?Array.from({length:12},(_,i)=>i%3===0?'G':'S'):(p.ratings||[]);
  const ratings=Array.from({length:12},(_,i)=>'<span class="rating '+(grades[i]?'gold':'')+'">'+String(i+1).padStart(2,'0')+'<b>'+(grades[i]||'—')+'</b></span>').join('');
  const slots=game.statsShot?[{done:12,cash:98640,season:0},{done:8,cash:54200,season:2},{done:3,cash:12450,season:1}]:loadSlots();
  const saveItems=Array.from({length:3},(_,i)=>{const slot=slots[i],mode=slot?'load':'save';return '<div><b>SLOT '+(i+1)+'</b><small>'+(slot?Math.min(12,slot.done||0)+'/12 · '+dollars(slot.cash||0)+' · '+['SUMMER','SPRING','AUTUMN','WINTER'][slot.season||0]:'EMPTY · NO SAVE')+'</small><button data-stats-slot="'+i+'" data-mode="'+mode+'">'+(slot?'LOAD':'SAVE')+'</button></div>';}).join('');
  const rp=p.rp??3900,rankLevel=rp>=5200?6:rp>=3000?5:rp>=1800?4:rp>=1000?3:rp>=400?2:1,rank=rankLevel===6?'SHOT CALLER':'FIXER';
  el('statsPanel').innerHTML='<header class="stats-head"><div><small>SOLMARA CITY RECORDS</small><h1>PROGRESSION</h1></div><strong>'+dollars(cash)+'</strong><button data-stats="back">ESC · BACK</button></header><div class="stats-body"><section class="stats-map panel"><h2>JAKARTA ISLAND <small>11 DISTRICTS · PINK ROUTE</small></h2>'+cityMap()+'<footer>◆ ROUTE ACTIVE · KUNINGAN → PALM QUAY</footer></section><aside class="stats-column"><section class="panel completion"><h2>CITY COMPLETION</h2><div class="completion-ring" style="--pct:'+done/12*100+'%"><b>'+done+'/12</b><small>DEBTS</small></div><p>CRIMINAL PROFILE <strong>DANI CRUZ</strong></p><p>RANK '+rankLevel+' '+rank+' · '+rp.toLocaleString('en-US')+' / 5,200 RP</p></section><section class="panel totals"><h2>CAREER TOTALS</h2><div><span><b>'+(career.carsStolen||0)+'</b><small>CARS STOLEN</small></span><span><b>'+(career.copsEscaped||0)+'</b><small>COPS ESCAPED</small></span><span><b>'+Number(career.distanceKm||0).toFixed(1)+' km</b><small>DISTANCE DRIVEN</small></span></div></section><section class="panel ratings"><h2>MISSION RATINGS 01–12</h2><div>'+ratings+'</div></section><section class="panel checklist"><h2>CASE CHECKLIST <small>18 RECORDS</small></h2><ol>'+rows+'</ol></section><section class="panel save-records"><h2>SAVE SLOTS</h2><div class="save-grid">'+saveItems+'</div></section></aside></div>';
  el('statsPanel').querySelector('[data-stats="back"]').onclick=()=>game.showScreen('menu');
  el('statsPanel').querySelectorAll('[data-stats-slot]').forEach(button=>button.onclick=()=>game.selectSlot(Number(button.dataset.statsSlot),button.dataset.mode));
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
