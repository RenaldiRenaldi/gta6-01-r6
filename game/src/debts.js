import {distance,bearing,model,shape,T,material} from './geometry.js';
import {coupe,syncVehicle} from './actors.js';
import {spawnRivals,confrontation} from './action.js';
import {visible,floorAt} from './district.js';

const point = ([x,z])=>({x,z});
const missions=[
  ['A Picture Worth Trouble','Ines Vega',175,850,'tail',[[0,16]],['Find Salo’s sedan','Follow it from 15–65 m','P · Photograph the exchange'],'Get the evidence before Salo crosses the canal.'],
  ['Three Stops, No Questions','Tomás Ruiz',155,1200,'drive',[[0,-72],[72,-72],[72,0]],['Take a car to the first stop','Deliver the witness drives','Lose the response'],'The reserve audit is on those drives. Make all three drops.'],
  ['The Exchange Goes South','Luz Moreno',170,1450,'clear',[[0,20]],['Reach the flower market','Protect the market · Clear four gunmen','Secure the exchange'],'Behind the taxi, Dani. The flower market is full of people.'],
  ['Redline Witness','Tomás Ruiz',160,1500,'convoy',[[72,22]],['Catch the courier','Disable the courier','Recover the case'],'The courier’s headed for the bridge. Bring back his case.'],
  ['Hold Pearl Street','Luz Moreno',150,1650,'hold',[[0,-72]],['Reach the crew relay','Hold the relay for 25 seconds','Keep the signal alive'],'If the relay drops, the crew loses its route out.'],
  ['A City With Blind Spots','Ines Vega',150,1600,'hide',[[-144,-72]],['Reach Old Coral','Break line of sight','Stay hidden for 14 seconds'],'Take the alley past the neon. They’ll lose us in the snow.'],
  ['Borrowed Wings','Mara Sol',260,2200,'air',[[0,144],[85,157],[0,144]],['Board Mara’s Kite','Hold on the Glass Quarter roof','Return to the landing pad'],'Luz is on the Glass Quarter roof. Follow the radar and bring her home.'],
  ['The Auction Cipher','Luz Moreno',170,1900,'hack',[[72,-144]],['Reach the auction terminal','Hold F · Copy the cipher','Clear the drop'],'The bids are a front. The keys are still on their terminal.'],
  ['Night Freight','Tomás Ruiz',180,2100,'convoy',[[144,72]],['Find the reserve van','Disable the van','Collect both cash cases'],'They split the cash into two cases. Bring both.'],
  ['The Last Broadcast','Luz Moreno',180,2300,'hold',[[0,72]],['Find the transmitter','Defend the first wave','Defend the second wave'],'Keep the transmitter alive. Everybody gets to hear this.'],
  ['All Roads Lead Home','Mara Sol',126,2400,'drive',[[0,0],[72,0],[72,72],[0,72]],['Bring a working car','Run four crew checkpoints','Keep the engine alive'],'Four intersections. Make every light and don’t lose the car.'],
  ['Bring Every Dollar Home','Ines Vega',280,12500,'vault',[[0,72],[0,-72]],['Clear six reserve guards','Hold F · Crack the vault','Break the lockdown','Bring the reserve home unseen'],'The ledger closes tonight, Dani. Through the gap—we bring every dollar home.']
];
export const debts=missions.map(([title,contact,seconds,reward,mode,stops,steps,dialogue])=>({title,contact,seconds,reward,mode,stops:stops.map(point),steps,dialogue}));
export const newJob=(index=0)=>({index,status:index>=12?'complete':'available',phase:0,timer:debts[index]?.seconds||0,progress:0,spawned:false,checkpoint:0,courier:null,cases:[],message:''});
export function jobTarget(game){
  const j=game.job,d=debts[j.index];
  if(!d)return null;
  const target=j.cases.find(c=>!c.taken)||j.courier;
  if(target && j.phase<=1)return target;
  if(d.mode==='air'||d.mode==='drive')return d.stops[Math.min(j.checkpoint,d.stops.length-1)];
  return d.stops[d.mode==='vault' && j.phase>=2 ? 1 :0];
}
export function startDebt(game,index=game.profile.done) {
  if(!debts[index])return false;
  if(game.job.courier)game.scene.remove(game.job.courier.mesh);
  for(const c of game.job.cases)game.scene.remove(c.mesh);
  spawnRivals(game,[]);
  game.job=newJob(index);game.job.status='active';
  const debt=debts[index], goal=debt.stops[0];
  if(['tail','convoy'].includes(debt.mode)) {
    const van=coupe(game.scene,goal.x,goal.z,{color:debt.mode==='tail'?0xeccfa7:0x775c7f,name:'RESERVE COURIER'});
    van.health=debt.mode==='tail'?170:120;
    van.route=[{x:goal.x,z:Math.ceil((goal.z+23)/72)*72},{x:goal.x+72,z:Math.ceil((goal.z+23)/72)*72},{x:goal.x+72,z:goal.z},{x:goal.x,z:goal.z}];
    van.node=0;game.job.courier=van;
  }
  game.notice(debt.title);
  return true;
}
export function settleDebt(game){
  // Settlement is idempotent so retried inputs cannot multiply the reward.
  const j=game.job,d=debts[j.index];
  if(j.status!=='active'||!d)return false;
  game.profile.done=Math.max(game.profile.done,j.index+1);
  game.profile.cash+=d.reward;
  game.profile.respect=Math.min(550,game.profile.respect+36);
  game.profile.rp=Math.min(5200,(game.profile.rp||3900)+325);
  // Store the run grade with its mission so progression records survive reloads.
  game.profile.ratings??=[];
  game.profile.ratings[j.index]=j.timer>debts[j.index].seconds*.65?'G':j.timer>debts[j.index].seconds*.3?'S':'B';
  game.notice('Debt settled · $'+d.reward.toLocaleString('en-US'));
  j.status='settled';
  game.persist();
  return true;
}
export function failDebt(game,message){
  if(game.job.status!=='active')return;
  game.job.status='failed';game.job.message=message;
  game.notice(message+' · J to retry');
}
function deployRivals(game,p,count){
  spawnRivals(game,Array.from({length:count},(_,i)=>[p.x+(i%2?6.5:-6.5),p.z+((i>>1)-1)*6]));
  game.job.spawned=true;game.job.phase=1;
  game.raise(1);
}
function casesAt(game,van,count){
  return Array.from({length:count},(_,i)=>{
    const x=van.x+(i===0?2.75:-2.75),z=van.z;
    const mesh=shape(game.scene,new T.BoxGeometry(1,.45,.72),material(0x6bd99f,.42,.65),x,.46,z);
    return {mesh,x,z,taken:false};
  });
}
function moveCourier(v,dt,time){
  const target=v.route[v.node],step=Math.min(distance(v,target),dt*9.4);
  v.heading=bearing(v,target);
  v.x+=Math.sin(v.heading)*step;v.z+=Math.cos(v.heading)*step;
  if(distance(v,target)<.5)v.node=(v.node+1)%v.route.length;
  syncVehicle(v,time);
}
export function tickDebt(game,dt){
  const j=game.job,d=debts[j.index];
  if(j.status!=='active')return;
  j.timer-=dt;
  if(j.timer<=0){failDebt(game,'Time ran out');return;}
  if(game.health<=0||game.vehicle?.health<=0){failDebt(game,'Crew lost the run');return;}
  const p=game.player, goal=jobTarget(game), gap=distance(p,goal), van=j.courier;
  if(van?.health>0)moveCourier(van,dt,game.time);
  switch(d.mode){
    case 'tail':
      if(gap<68)j.phase=1;
      if(gap>13&&gap<68&&visible(game.city,p,van))j.progress+=dt;
      if(j.progress>=7){j.phase=2;if(game.keys.has('p')&&gap<68&&visible(game.city,p,van))settleDebt(game);}
      break;
    case 'drive':
      if(j.checkpoint<d.stops.length && gap<8 && game.vehicle?.kind==='car'){
        j.checkpoint++;j.phase=Math.min(2,j.checkpoint);game.notice('Checkpoint '+j.checkpoint+'/'+d.stops.length);
      }
      if(j.checkpoint>=d.stops.length&&(j.index!==1||!game.police.seen))settleDebt(game);
      break;
    case 'clear':
      if(!j.spawned&&gap<31)deployRivals(game,goal,4);
      if(j.spawned&&game.rivals.every(r=>r.health<=0)){j.phase=2;settleDebt(game);}
      break;
    case 'convoy':
      if(gap<85&&j.phase===0){j.phase=1;game.raise(2);}
      if(van?.health<=0&&j.phase<2){j.phase=2;j.cases=casesAt(game,van,j.index===8?2:1);j.courier=null;game.life.cars.push(van);}
      for(const c of j.cases)if(!c.taken&&!game.vehicle&&distance(c,p)<2.6){c.taken=true;c.mesh.visible=false;}
      if(j.cases.length&&j.cases.every(c=>c.taken))settleDebt(game);
      break;
    case 'hold':
      if(!j.spawned&&gap<28)deployRivals(game,goal,4);
      if(j.spawned&&gap<24)j.progress+=dt;
      if(j.index===9&&j.progress>=13&&j.phase===1){deployRivals(game,goal,6);j.phase=2;game.raise(2);}
      if(j.progress>=25&&(j.index===4||game.rivals.filter(r=>r.health>0).length<=2))settleDebt(game);
      break;
    case 'hide':
      if(gap<32&&!j.spawned){game.raise(3);j.spawned=true;j.phase=1;}
      if(j.spawned)j.progress=game.police.seen?0:j.progress+dt;
      if(j.progress>=14){j.phase=2;settleDebt(game);}
      break;
    case 'air': {
      if(j.checkpoint===0 && game.vehicle?.kind==='air'){j.checkpoint=1;j.phase=1;break;}
      const altitude=floorAt(game.city,goal.x,goal.z);
      if(j.checkpoint>0&&gap<9&&Math.abs(p.y-altitude)<2.6&&game.vehicle?.kind==='air'&&Math.abs(game.vehicle.speed)<4){
        j.progress+=dt;
        if(j.progress>4){j.checkpoint++;j.phase=2;j.progress=0;if(j.checkpoint===3)settleDebt(game);}
      }
      break;
    }
    case 'hack':
      if(!j.spawned&&gap<30)deployRivals(game,goal,3);
      if(!game.vehicle&&gap<7&&game.keys.has('f'))j.progress+=dt;
      if(j.progress>=11){j.phase=2;settleDebt(game);}
      break;
    case 'vault':
      if(j.phase<2){
        if(!j.spawned&&gap<32)deployRivals(game,goal,6);
        if(j.spawned&&game.rivals.every(r=>r.health<=0)&&gap<8&&!game.vehicle&&game.keys.has('f'))j.progress+=dt;
        if(j.progress>=10){j.phase=2;j.progress=0;game.alarm();game.raise(4);confrontation(game,24);}
      } else if(!game.police.seen) {
        j.progress+=dt;
        if(j.progress>5)j.phase=3;
        if(j.phase===3&&gap<12&&game.vehicle)settleDebt(game);
      }
      break;
  }
}
const haloMat=new T.MeshBasicMaterial({color:0x59f8d9,transparent:true,opacity:.87,side:T.DoubleSide});
export function objectiveMarker(scene) {
  const root=model(scene);
  const ring=shape(root,new T.RingGeometry(2.6,2.78,54),haloMat,0,0,0);
  ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  return root;
}
