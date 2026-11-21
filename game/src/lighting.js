import {T,random} from './geometry.js';

export const seasons=[
  {name:'SPRING',weather:'FLOWER MARKET',time:'16:23',sky:0x827baf,horizon:0xffc5a9,fog:0xd4a8ac,sun:0xffd1a6,light:2.5},
  {name:'SUMMER',weather:'GOLDEN HOUR',time:'18:27',sky:0x60448e,horizon:0xffa75e,fog:0xd78575,sun:0xffa45d,light:3.8},
  {name:'AUTUMN',weather:'GOLDEN WIND',time:'16:50',sky:0x646c9e,horizon:0xfbc18a,fog:0xc29487,sun:0xffbf77,light:2.9},
  {name:'WINTER',weather:'SNOWFALL',time:'22:06',sky:0x101839,horizon:0x53406a,fog:0x322b4c,sun:0x9bbdff,light:.67}
];
const vertex='varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}';
export function createView(canvas) {
  const view=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  view.shadowMap.enabled=true;
  view.shadowMap.type=T.PCFShadowMap;
  view.toneMapping=T.ACESFilmicToneMapping;
  view.toneMappingExposure=1.08;
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(57,1,.07,850);
  const format={type:T.HalfFloatType};
  const hdr=new T.WebGLRenderTarget(1,1,{...format,samples:2});
  const bloom=new T.WebGLRenderTarget(1,1,format);
  const scan=new T.Scene(), screen=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const quad=new T.Mesh(new T.PlaneGeometry(2,2));quad.frustumCulled=false;scan.add(quad);
  const extract=new T.ShaderMaterial({
    vertexShader:vertex,uniforms:{image:{value:hdr.texture},size:{value:new T.Vector2()}},
    fragmentShader:'varying vec2 coord;uniform sampler2D image;uniform vec2 size;void main(){vec3 b=vec3(0.);for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){vec3 a=texture2D(image,coord+vec2(float(x),float(y))/size*3.).rgb;b+=max(a-vec3(1.05),0.)*(1.-.11*float(abs(x)+abs(y)));}gl_FragColor=vec4(b/19.,1.);}'
  });
  const combine=new T.ShaderMaterial({
    vertexShader:vertex,uniforms:{image:{value:hdr.texture},bloom:{value:bloom.texture}},
    fragmentShader:'varying vec2 coord;uniform sampler2D image;uniform sampler2D bloom;void main(){vec3 c=texture2D(image,coord).rgb+texture2D(bloom,coord).rgb*.36;float gray=dot(c,vec3(.22,.69,.09));c=max(vec3(0.),mix(vec3(gray),c,1.09));c*=1.-.23*dot(coord-.5,coord-.5);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  });
  function resize(){
    const scale=Math.min(1.4,devicePixelRatio), w=Math.round(innerWidth*scale), h=Math.round(innerHeight*scale);
    view.setSize(w,h,false);hdr.setSize(w,h);bloom.setSize(Math.ceil(w/4),Math.ceil(h/4));
    extract.uniforms.size.value.set(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  addEventListener('resize',resize);resize();
  function draw(){
    // Bloom is extracted at quarter size; the base scene stays full-resolution.
    view.setRenderTarget(hdr);view.render(scene,camera);
    quad.material=extract;view.setRenderTarget(bloom);view.render(scan,screen);
    quad.material=combine;view.setRenderTarget(null);view.render(scan,screen);
  }
  return {view,scene,camera,draw};
}
export function createLight(scene) {
  const uniforms={
    high:{value:new T.Color()},low:{value:new T.Color()}, light:{value:new T.Vector3()},
    night:{value:0},clock:{value:0}
  };
  const sky=new T.Mesh(new T.SphereGeometry(690,40,26),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,uniforms,
    vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec3 ray;
      uniform vec3 high,low,light;
      uniform float night,clock;
      float grain(vec2 uv){return fract(sin(dot(uv,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(ray);
        float rise=pow(clamp(d.y*2.5,0.,1.),.62);
        vec3 color=mix(low,high,rise);
        float angle=acos(clamp(dot(d,light),-.99999,.99999));
        float core=exp(-pow(angle/.023,2.4));
        float halo=exp(-angle*15.);
        float haze=exp(-abs(d.y-.06)*17.);
        color+=vec3(5.1,2.85,1.02)*core*(1.-night);
        color+=vec3(1.25,.45,.102)*halo*(1.-night);
        color+=vec3(.24,.074,.025)*haze*(1.-night);
        float clouds=sin(d.y*53.+sin(d.x*10.)*1.45)+.55*sin(d.y*118.+d.x*19.);
        color=mix(color,mix(vec3(.32,.094,.19),vec3(.73,.24,.12),halo),smoothstep(.56,1.54,clouds)*.29*(1.-night*.78));
        float star=step(.994,grain(floor(d.xz*350.+d.y*240.)))*smoothstep(.01,.2,d.y);
        color+=star*night*.26;
        gl_FragColor=vec4(color,1.);
      }`
  }));
  sky.frustumCulled=false;sky.renderOrder=-100;scene.add(sky);
  const ambient=new T.HemisphereLight(0xf7c2a6,0x735586,1.6);
  const key=new T.DirectionalLight(0xffad71,3.55);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-57,right:57,top:57,bottom:-57,near:.5,far:260});
  key.shadow.bias=-.0004;key.shadow.normalBias=.1;
  scene.add(ambient,key,key.target);
  scene.fog=new T.FogExp2(0xe89982,.0026);
  const tiles=[];
  for(let i=0;i<6;i++){
    const c=document.createElement('canvas');c.width=c.height=32;
    const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,32);
    g.addColorStop(0,'#44345b');g.addColorStop(.45,i===4?'#ffb372':'#a07e94');g.addColorStop(1,'#33283b');
    ctx.fillStyle=g;ctx.fillRect(0,0,32,32);tiles.push(c);
  }
  const cube=new T.CubeTexture(tiles);cube.colorSpace=T.SRGBColorSpace;cube.needsUpdate=true;
  scene.environment=cube; scene.environmentIntensity=.54;
  const rng=random(293), seed=new Float32Array(650*3), current=new Float32Array(seed.length);
  for(let i=0;i<seed.length;i+=3)seed.set([(rng()-.5)*100,rng()*49,(rng()-.5)*100],i);
  const positions=new T.BufferAttribute(current,3), geo=new T.BufferGeometry();
  geo.setAttribute('position',positions);
  const dust=new T.Points(geo,new T.PointsMaterial({size:.15,color:0xffffff,transparent:true,opacity:.84,depthWrite:false}));
  dust.frustumCulled=false;scene.add(dust);
  return {sky,uniforms,ambient,key,scene,positions,seed,dust};
}
export function updateLight(light,season,player,camera,time,summerShowcase=false){
  const {sky,uniforms,ambient,key,scene,positions,seed,dust}=light;
  const palette=season===1&&summerShowcase
    ?{sky:0x278dcc,horizon:0xffb86d,fog:0x78c7bf,sun:0xffe6a1,light:3.35}:seasons[season];
  uniforms.high.value.setHex(palette.sky);uniforms.low.value.setHex(palette.horizon);
  uniforms.light.value.set(.014,.085,1).normalize();uniforms.night.value=season===3?1:0;
  sky.position.copy(camera.position);
  ambient.color.setHex(season===3?0x9bb6ed:0xffd8c8);ambient.intensity=season===3?.95:1.34;
  key.color.setHex(palette.sun);key.intensity=palette.light;
  key.position.set(player.x-43,player.y+49,player.z+82);
  key.target.position.set(player.x,Math.max(0,player.y-32),player.z);
  scene.fog.color.setHex(palette.fog);
  scene.fog.density=season===3 ? .004 : season===1 && summerShowcase ? .0019 : .00265;
  dust.visible=season!==1;
  if(dust.visible){
    dust.material.color.setHex([0xffbbd9,0xffffff,0xffb654,0xf5fbff][season]);
    dust.material.size=season===2?.34:season===3?.31:.12;
    dust.position.set(player.x,player.y-17,player.z);
    for(let i=0;i<seed.length;i+=3)positions.array.set([
      ((seed[i]+50+time*.55)%100)-50,((seed[i+1]+490-time*(season===3?3:1))%49+49)%49,seed[i+2]
    ],i);
    positions.needsUpdate=true;
  }
}
