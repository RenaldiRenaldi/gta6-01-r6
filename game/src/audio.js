const radioTracks=[
  ['After the Rain','Lina Mar / Night Ferry'],
  ['Pearl Frequency','Marea Club'],
  ['Coastline Static','The Low Tides']
];
export {radioTracks};
export function createSound(){
  // Oscillators produce original local audio only after a user gesture.
  let context, output, motor, level, cursor=0, step=0;
  const bass=[[38,38,41,43,36,36,41,46],[34,34,41,41,37,37,44,44],[45,45,43,43,40,40,38,43]];
  function enable(){
    if(!context){
      context=new AudioContext();
      output=context.createGain();output.gain.value=.21;output.connect(context.destination);
      motor=context.createOscillator();motor.type='triangle';
      level=context.createGain();level.gain.value=0;motor.connect(level).connect(output);motor.start();
    }
    if(context.state==='suspended')context.resume().catch(()=>{});
  }
  function note(midi,at,duration,volume,wave){
    const osc=context.createOscillator(),gain=context.createGain();
    osc.type=wave;osc.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(.001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.022);
    gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    osc.connect(gain).connect(output);osc.start(at);osc.stop(at+duration+.02);
  }
  function update(game){
    if(!context||context.state!=='running')return;
    const now=context.currentTime, moving=game.started&&!game.paused;
    motor.frequency.setTargetAtTime(43+Math.abs(game.vehicle?.speed||0)*2.1,now,.08);
    level.gain.setTargetAtTime(moving&&game.vehicle?.kind==='car'?.093:0,now,.12);
    if(!moving||!game.radioOn){cursor=now;return;}
    if(cursor<now)cursor=now;
    while(cursor<now+.09){
      const root=bass[game.station][step%8];
      if(step%2===0)note(root,cursor,.27,.19,'sine');
      if(step%4===1)note(root+24,cursor,.17,.057,'triangle');
      if(step%4===3)note(root+31,cursor,.18,.072,'sine');
      cursor+=.18;step++;
    }
  }
  function shot(){if(context)note(48,context.currentTime,.105,.24,'sawtooth');}
  return {enable,update,shot};
}
