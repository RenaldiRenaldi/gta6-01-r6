import assert from 'node:assert/strict';
import {withBrowser} from './browser.mjs';

await withBrowser(async(browser,base)=>{
  const page=await browser.newPage({viewport:{width:960,height:600}});
  page.setDefaultTimeout(180000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/?shot=summer');
  await page.waitForFunction(()=>window.__shotReady);
  assert.equal(await page.evaluate(()=>window.solmara.game.vehicle===null&&window.solmara.game.player.mesh.name==='Summer Dani on foot'),true,'summer hero shot stages Dani as the on-foot player');
  const checks=await page.evaluate(async()=>{
    const {game:g,interact,choose}=window.solmara;
    const {debts,newJob,startDebt,tickDebt,settleDebt,jobTarget}=await import('/src/debts.js');
    const {ride,syncVehicle}=await import('/src/actors.js');
    const {fireWeapon,weapons}=await import('/src/action.js');
    const {newProfile,saveProfile,loadProfile,buy,startTrial,updateActivities}=await import('/src/progress.js');
    const {passable,slide,visible,floorAt,canalX}=await import('/src/district.js');
    const {raise,resetPursuit,nextJunction,updatePursuit}=await import('/src/pursuit.js');
    const {radarProject,drawRadar}=await import('/src/radar.js');
    const {drawHud}=await import('/src/hud.js');
    const results=[];
    function check(name,condition){if(!condition)throw Error('Regression: '+name);results.push(name);}
    g.paused=true;g.shotLive=false;
    const fresh=()=>{
      if(g.job.courier)g.scene.remove(g.job.courier.mesh);
      for(const c of g.job.cases)g.scene.remove(c.mesh);
      g.profile=newProfile();g.keys.clear();g.health=100;g.vehicle=null;
      resetPursuit(g);g.job=newJob();g.cooldown=0;
      Object.assign(g.player,{x:0,y:0,z:-25,heading:0});
    };
    const at=p=>Object.assign(g.player,{x:p.x,z:p.z,y:p.y||0});
    check('Twelve unique titles across nine mission modes',debts.length===12&&new Set(debts.map(d=>d.title)).size===12&&new Set(debts.map(d=>d.mode)).size===9);
    for(let i=0;i<debts.length;i++){
      fresh();g.profile.done=i;
      startDebt(g);
      check('Debt '+(i+1)+' starts with target and deadline',g.job.index===i&&g.job.timer>100&&g.job.status==='active'&&Boolean(jobTarget(g)));
      g.job.timer=.01;tickDebt(g,.02);
      check('Debt '+(i+1)+' times out without reward',g.job.status==='failed'&&g.profile.cash===4800&&g.profile.done===i);
      startDebt(g);
      check('Debt '+(i+1)+' retries with a fresh timer',g.job.status==='active'&&g.job.timer===debts[i].seconds&&g.job.progress===0);
      const d=debts[i],j=g.job;
      at(d.stops[0]);
      switch(d.mode){
        case 'tail':
          at({x:j.courier.x,z:j.courier.z-22});
          j.progress=7;g.keys.add('p');tickDebt(g,.01);
          break;
        case 'drive':
          g.vehicle=g.homeCar;
          for(const stop of d.stops){at(stop);tickDebt(g,.01);}
          break;
        case 'clear':
          tickDebt(g,.01);for(const e of g.rivals)e.health=0;tickDebt(g,.01);
          break;
        case 'convoy':
          j.courier.health=0;tickDebt(g,.01);
          for(const c of j.cases){at(c);tickDebt(g,.01);}
          break;
        case 'hold':
          tickDebt(g,.01);j.progress=24.9;
          if(i===9){j.phase=2;for(const e of g.rivals)e.health=0;}
          tickDebt(g,.2);
          break;
        case 'hide':
          tickDebt(g,.01);g.police.seen=false;j.progress=13.9;tickDebt(g,.2);
          break;
        case 'air':
          g.vehicle=g.kite;tickDebt(g,.01);
          for(const index of [1,2]){
            const stop=d.stops[index];at({...stop,y:floorAt(g.city,stop.x,stop.z)});
            g.kite.speed=0;j.progress=4;tickDebt(g,.1);
          }
          break;
        case 'hack':
          tickDebt(g,.01);g.keys.add('f');j.progress=10.99;tickDebt(g,.02);
          break;
        case 'vault':
          tickDebt(g,.01);for(const e of g.rivals)e.health=0;
          g.keys.add('f');j.progress=9.99;tickDebt(g,.02);
          g.police.seen=false;j.progress=4.99;g.vehicle=g.homeCar;
          at(d.stops[1]);tickDebt(g,.02);
          break;
      }
      check('Debt '+(i+1)+' objective settles once with reward',j.status==='settled'&&g.profile.cash===4800+d.reward&&g.profile.done===i+1);
      const cash=g.profile.cash;settleDebt(g);
      check('Debt '+(i+1)+' cannot pay a duplicate reward',g.profile.cash===cash);
    }
    fresh();
    check('City has dense collision architecture',g.city.buildings.length>200&&g.life.cars.length>=44&&g.life.people.length>=90);
    const b=g.city.buildings[0];
    check('Building walls block ground movement',!passable(g.city,b.x,0,b.z));
    check('Rooftops allow helicopter landing',passable(g.city,b.x,b.h,b.z));
    check('Canal is impassable on foot',!passable(g.city,canalX(31),0,31));
    check('Intersection bridge crosses the canal',passable(g.city,canalX(0),0,0));
    const dummy={x:0,y:0,z:8};slide(g.city,dummy,0,2,.3);
    check('Street movement follows collision-safe position',dummy.z===10);
    check('Walls occlude line of sight',!visible(g.city,{x:b.x-b.w,y:1,z:b.z},{x:b.x+b.w,y:1,z:b.z}));
    Object.assign(g.homeCar,{x:0,y:0,z:-36,heading:0,speed:0,health:100});
    at({x:0,z:-36});
    check('E boards a nearby car',interact()&&g.vehicle===g.homeCar&&!g.player.mesh.visible);
    const drive={forward:1,back:0,steer:0,boost:0,brake:0,lift:0,drop:0};
    ride(g.city,g.homeCar,drive,.2);
    check('Throttle accelerates the vehicle',g.homeCar.speed>0&&g.homeCar.z>-36);
    g.homeCar.speed=45.3;ride(g.city,g.homeCar,{...drive,boost:1},.001);
    check('Boost respects the 163 km/h speed cap',g.homeCar.speed<=45.3&&g.homeCar.speed>45);
    const before=g.homeCar.speed;ride(g.city,g.homeCar,{...drive,forward:0,brake:1},.12);
    check('Handbrake slows the car',g.homeCar.speed<before);
    check('Cannot jump from a speeding car',interact()===false&&g.vehicle===g.homeCar);
    g.homeCar.speed=0;at(g.homeCar);
    check('E exits a stopped vehicle',interact()&&!g.vehicle&&g.player.mesh.visible);
    Object.assign(g.kite,{x:0,z:144,y:0,speed:0,heading:0});at(g.kite);
    check('E boards the helicopter',interact()&&g.vehicle===g.kite);
    ride(g.city,g.kite,{...drive,forward:0,lift:1},.5);
    check('Helicopter lift clears the pad',g.kite.y>7);
    at(g.kite);
    check('Helicopter safety prevents an airborne exit',!interact()&&g.vehicle===g.kite);
    const altitude=g.kite.y;ride(g.city,g.kite,{...drive,forward:0,drop:1},.2);
    check('Helicopter descend input reduces altitude',g.kite.y<altitude);
    fresh();g.slot=0;at({x:0,z:-20});const ammo=g.profile.ammo[0];
    check('Firing consumes selected ammunition',fireWeapon(g)&&g.profile.ammo[0]===ammo-1);
    check('Weapon cooldown prevents frame-rate rapid fire',!fireWeapon(g));
    g.cooldown=0;g.profile.ammo[0]=0;
    check('An empty weapon cannot fire',!fireWeapon(g));
    g.slot=4;g.cooldown=0;
    check('Fists do not need ammunition',fireWeapon(g));
    check('Gunfire raises the wanted level',g.police.heat>0);
    check('Locked weapons cannot be selected',choose(1)===false&&g.slot===4);
    check('Buying a rifle unlocks it and grants ammo',buy(g.profile,1)&&g.profile.owned.includes(1)&&g.profile.ammo[1]===48);
    check('Unlocked weapon selection succeeds',choose(1)===true&&g.slot===1);
    g.profile.cash=0;
    check('Insufficient funds prevents purchases',!buy(g.profile,2));
    g.profile.cash=98765;
    check('Local save roundtrips cash and unlocks',saveProfile(g.profile)&&loadProfile().cash===98765&&loadProfile().owned.includes(1));
    fresh();raise(g,12);
    check('Wanted escalation caps at six stars',g.police.heat===6);
    updatePursuit(g,.1);
    check('Dispatch creates a responding patrol',g.police.units.length===1);
    const u=g.police.units[0];at(u);updatePursuit(g,.1);
    check('Nearby unobstructed patrol sees the player',g.police.seen);
    const route=nextJunction({x:0,z:0},{x:144,z:144});
    check('Police routing uses a connected street junction',route.x===72&&route.z===0);
    resetPursuit(g);
    check('Pursuit reset removes all units and heat',g.police.units.length===0&&g.police.heat===0);
    fresh();g.vehicle=g.homeCar;at({x:0,z:-72});
    check('Nearby car starts a street trial',startTrial(g));
    g.activities.timeTrial.seconds=.01;updateActivities(g,.02);
    check('Street trial expires cleanly',g.activities.timeTrial===null);
    const token=g.activities.tokens[0];g.vehicle=null;at(token);const money=g.profile.cash;
    updateActivities(g,.01);updateActivities(g,.01);
    check('Hidden ledger rewards once',g.profile.cash===money+250&&g.profile.ledgers.includes(token.i));
    at({x:0,z:0});
    const map=document.getElementById('map');drawRadar(map,g);
    const first=map.toDataURL();at({x:7,z:9});drawRadar(map,g);
    check('Radar pixels change with the actual player position',first!==map.toDataURL());
    const point=radarProject({x:4,z:9},4,9);
    check('Radar keeps the player exactly at center',point[0]===200&&point[1]===200);
    at({x:0,z:0});g.slot=0;drawHud(g);
    const selected=document.getElementById('selected').getBoundingClientRect();
    const tiles=[...document.querySelectorAll('#alternates span')];
    check('Selected weapon is about twice the tile height',selected.height>=tiles[0].getBoundingClientRect().height*1.9);
    check('Four small weapon slots are icon only',tiles.length===4&&tiles.every(t=>t.textContent===''&&t.querySelector('canvas')));
    check('Small weapon slots form a horizontal row',tiles.every(t=>Math.abs(t.getBoundingClientRect().top-tiles[0].getBoundingClientRect().top)<1));
    check('All five weapon names and types are correct',weapons.map(w=>w.name).join('|')==='BREAKER 12|LONGLINE .30|KESTREL 72|TIDECUTTER|FISTS'&&weapons.map(w=>w.type).join('|')==='SHOTGUN|RIFLE|SMG|BLADE|UNARMED');
    const aircraft=g.kite;syncVehicle(aircraft,1);
    check('Helicopter spotlight remains attached to the aircraft',Math.abs(aircraft.beam.position.x-aircraft.x)<5&&aircraft.beam.scale.y>0);
    const clock=g.time;
    window.solmara.advance(-1);
    check('Simulation clock cannot run backwards',g.time===clock);
    g.profile.cash=10000;g.profile.engine=false;g.profile.armor=false;
    g.vehicle=g.homeCar;
    dispatchEvent(new KeyboardEvent('keydown',{key:'b'}));
    const stockButton=prefix=>[...document.querySelectorAll('#stock button')].find(b=>b.textContent.startsWith(prefix));
    stockButton('ENGINE').click();
    check('Garage engine purchase changes the live vehicle',g.profile.engine&&g.vehicle.engine&&g.profile.cash===7600);
    stockButton('ARMOR').click();
    check('Garage armor purchase changes the live vehicle',g.profile.armor&&g.vehicle.armor&&g.profile.cash===5800);
    stockButton('CANAL TEAL').click();
    check('Garage paint changes the actual car material',g.vehicle.coat.color.getHex()===0x259ca1&&g.profile.cash===5450);
    document.getElementById('shopClose').click();g.paused=true;g.keys.clear();
    Object.assign(g.homeCar,{x:0,y:0,z:91,heading:0,speed:25,vy:0});
    at(g.homeCar);const jumpCash=g.profile.cash;
    updateActivities(g,0);
    check('A fast approach launches from a physical ramp',g.homeCar.vy>9&&g.activities.jumping?.id===0);
    for(let step=0;step<180;step++){
      g.time+=1/60;
      ride(g.city,g.homeCar,{...drive,forward:0},1/60);
      at(g.homeCar);updateActivities(g,1/60);
    }
    check('Landing pays a stunt reward once',g.profile.cash===jumpCash+800&&g.profile.jumps.includes(0)&&g.homeCar.y===0);
    at({x:0,z:-72});g.activities.timeTrial=null;startTrial(g);
    const raceCash=g.profile.cash;
    for(const [x,z] of [[0,0],[72,0],[72,72],[0,72],[0,-72]]){at({x,z});updateActivities(g,.1);}
    check('Street trial finish records a best time and payout',g.activities.timeTrial===null&&g.profile.races[0]>0&&g.profile.cash===raceCash+1200);
    return results;
  });
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(checks.map((name,i)=>'PASS '+String(i+1).padStart(2,'0')+' '+name).join('\n'));
  console.log(checks.length+'/'+checks.length+' gameplay checks passed');
  await page.close();
  const menuPage=await browser.newPage({viewport:{width:960,height:600}});
  await menuPage.goto(base+'/?shot=title');
  await menuPage.waitForFunction(()=>window.__shotReady);
  assert.equal(await menuPage.locator('#mainMenu [data-menu]').count(),8,'title menu has eight actions');
  const reopenTitle=async()=>{await menuPage.goto(base+'/?shot=title');await menuPage.waitForFunction(()=>window.__shotReady);};
  await menuPage.locator('[data-menu="continue"]').click();
  assert.equal(await menuPage.evaluate(()=>document.body.dataset.screen),'game','continue opens the latest save');
  await reopenTitle();
  await menuPage.locator('[data-menu="new"]').click();
  await menuPage.locator('#titleSlots button').first().click();
  assert.equal(await menuPage.evaluate(()=>document.body.dataset.screen),'game','new game starts from a selected slot');
  await reopenTitle();
  await menuPage.locator('[data-menu="load"]').click();
  await menuPage.locator('#titleSlots button').first().click();
  assert.equal(await menuPage.evaluate(()=>document.body.dataset.screen),'game','load opens a selected save');
  await reopenTitle();
  await menuPage.locator('[data-menu="save"]').click();
  await menuPage.locator('#titleSlots button').first().click();
  assert.ok(await menuPage.evaluate(()=>JSON.parse(localStorage.getItem('solmara-r6-slots'))[0].savedAt),'save writes the selected slot');
  await reopenTitle();
  await menuPage.locator('[data-menu="settings"]').click();
  await menuPage.locator('#settingRadio').selectOption('off');
  assert.equal(await menuPage.evaluate(()=>JSON.parse(localStorage.getItem('solmara-r6-settings')).radio),'off','settings persist changes');
  await menuPage.locator('[data-close-dialog]').click();
  await menuPage.locator('[data-menu="free"]').click();
  assert.equal(await menuPage.evaluate(()=>document.body.dataset.screen),'game','free roam enters the city');
  await reopenTitle();
  await menuPage.locator('[data-menu="stats"]').click();
  assert.equal(await menuPage.locator('.jakarta-map').count(),1,'progression opens the city records screen');
  await menuPage.locator('[data-stats="back"]').click();
  await menuPage.locator('[data-menu="wanted"]').click();
  assert.equal(await menuPage.evaluate(()=>document.body.dataset.screen),'wanted','wanted file opens');
  await menuPage.locator('[data-wanted-close]').first().click();
  assert.equal(await menuPage.evaluate(()=>document.body.dataset.screen),'menu','wanted file returns to title');
  console.log('PASS 8 title menu actions and save-slot flows');
  await menuPage.close();
});
