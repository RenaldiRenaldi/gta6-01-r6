import {mkdirSync,readFileSync} from 'node:fs';
import {withBrowser} from './browser.mjs';

const manifest=JSON.parse(readFileSync('shots.json','utf8'));
const {width,height}=manifest.viewport;
if(Math.max(width,height)>1280||Math.min(width,height)<480)throw Error('Capture viewport must stay within 480–1280 pixels per side');
mkdirSync('screenshots',{recursive:true});
await withBrowser(async (browser,base)=>{
  const scenes=manifest.shots.filter(s=>!process.env.SHOT||s.season.toLowerCase()===process.env.SHOT);
  for(const shot of scenes){
    const page=await browser.newPage({viewport:manifest.viewport,deviceScaleFactor:1});
    page.setDefaultTimeout(180000);
    try {
      const errors=[];
      page.on('pageerror',e=>{errors.push(e.message);console.error(e);});
      page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
      await page.goto(base+shot.url);
      await page.waitForFunction(()=>window.__shotReady);
      await page.evaluate(()=>{
        const panels=['mission','dispatch','loadout','mapbox','dialogue','rightfoot','controls','alert'];
        for(const id of panels){
          const node=document.getElementById(id), box=node.getBoundingClientRect();
          if(box.left<0||box.top<0||box.right>innerWidth||box.bottom>innerHeight||node.scrollWidth>node.clientWidth)
            throw Error('HUD extends beyond bounds: '+id);
        }
        const dispatch=document.getElementById('dispatch').getBoundingClientRect();
        const map=document.getElementById('mapbox').getBoundingClientRect();
        if(dispatch.bottom>map.top)throw Error('Dispatch overlaps the minimap');
      });
      if(errors.length)throw Error(errors.join('\n'));
      const photo=async quality=>page.screenshot({type:'jpeg',quality,animations:'disabled',timeout:180000});
      // Search for the clearest unedited browser JPEG below the delivery cap.
      let low=35,high=90,best=0;
      while(low<=high) {
        const quality=Math.floor((low+high)/2), bytes=await photo(quality);
        if(bytes.length<262144){best=quality;low=quality+1;}else high=quality-1;
      }
      if(!best)throw Error('Capture is too large: '+shot.file);
      const result=await page.screenshot({path:'screenshots/'+shot.file,type:'jpeg',quality:best,animations:'disabled',timeout:180000});
      if(result.length>=262144||errors.length)throw Error('Capture finalization failed: '+shot.file);
      console.log(shot.file+' '+result.length+' bytes · Q'+best);
    }finally{await page.close();}
  }
});
