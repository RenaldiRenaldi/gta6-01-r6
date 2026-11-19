import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const local='/opt/hatch/skills/spaces/ts-runtime/dist/node_modules/playwright-core';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || (existsSync(local)?local:'playwright'));
const hatchChrome='/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';

export async function withBrowser(task){
  // A per-process port allows capture and simulation checks to run independently.
  const port=process.env.SOLMARA_PORT||'8095';
  const base='http://127.0.0.1:'+port;
  const server=spawn(process.execPath,['serve.ts'],{env:{...process.env,PORT:port},stdio:'ignore'});
  let browser;
  try {
    for(let attempt=0;attempt<100;attempt++){
      try{if((await fetch(base)).ok) break;}catch{}
      if(attempt===99)throw Error('Solmara server did not start');
      await new Promise(r=>setTimeout(r,100));
    }
    browser=await chromium.launch({headless:true,
      executablePath:process.env.CHROME_BIN||(existsSync(hatchChrome)?hatchChrome:undefined),
      args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']
    });
    return await task(browser,base);
  }finally{
    if(browser)await browser.close();
    server.kill();
  }
}
