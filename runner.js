'use strict';
const canvas=document.getElementById('runner'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
const game=RunnerCore.createGame(),W=960,H=540,STEP=1/120;
const held=new Set(),touch={left:new Set(),right:new Set(),jump:new Set()};
let phase='intro',last=0,accumulator=0,drawTime=0,prevX=game.player.x,prevY=game.player.y,prevCamera=0,camera=0;
let hudKey='',messageTimer=0;
function resize(){const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;}
resize();window.addEventListener('resize',resize);
function controls(){return {left:held.has('ArrowLeft')||held.has('a')||touch.left.size>0,right:held.has('ArrowRight')||held.has('d')||touch.right.size>0,jump:held.has(' ')||held.has('ArrowUp')||held.has('w')||touch.jump.size>0};}
function clearInput(){held.clear();for(const key of Object.keys(touch)){touch[key].clear();$(key).classList.remove('active');}}
function show(tag,title,text,button){$('dialogTag').textContent=tag;$('dialogTitle').textContent=title;$('dialogText').textContent=text;$('start').textContent=button;$('overlay').hidden=false;}
function syncPosition(){prevX=game.player.x;prevY=game.player.y;camera=Math.max(0,Math.min(RunnerCore.WIDTH-W,game.player.x-W*.33));prevCamera=camera;}
function play(){phase='playing';clearInput();accumulator=0;last=performance.now();$('overlay').hidden=true;canvas.focus({preventScroll:true});}
function pause(){if(phase==='playing'){phase='paused';clearInput();show('KURZ DURCHATMEN','Kleine Pause.','Luna wartet auf dich. Dein Level bleibt genau hier stehen.','Weiterspielen ↗');}else if(phase==='paused')play();}
function restart(){game.reset();syncPosition();hudKey='';messageTimer=0;play();}
$('start').onclick=()=>{if(phase==='won')restart();else play();};$('pause').onclick=pause;$('restart').onclick=restart;
for(const key of ['left','right','jump']){
  const button=$(key);
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(phase!=='playing')return;button.setPointerCapture(e.pointerId);touch[key].add(e.pointerId);button.classList.add('active');});
  const release=e=>{touch[key].delete(e.pointerId);if(!touch[key].size)button.classList.remove('active');};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('contextmenu',e=>e.preventDefault());
}
document.addEventListener('keydown',e=>{
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(key)&&e.target.tagName!=='BUTTON')e.preventDefault();
  if((key==='p'||key==='Escape')&&!e.repeat){pause();return;}
  if(e.target.tagName==='BUTTON'&&(key===' '||key==='Enter'))return;
  if(phase==='playing')held.add(key);
});
document.addEventListener('keyup',e=>held.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>{clearInput();if(phase==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause();});
function hud(){const collected=game.crystals.filter(g=>g.taken).length,seconds=Math.floor(game.time);const key=collected+':'+seconds+':'+game.deaths;if(key===hudKey)return;hudKey=key;$('gems').textContent=collected+' / '+game.crystals.length;$('deaths').textContent=game.deaths;$('timer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function notice(text){$('status').textContent=text;messageTimer=4;}
function events(){
  if(game.event==='checkpoint')notice('Rückkehrpunkt erreicht! Bei einem Sturz startest du an dieser Fahne.');
  if(game.event==='respawn'){syncPosition();notice('Noch ein Versuch! Dein Rückkehrpunkt wartet auf dich.');}
  if(game.event==='won'){
    phase='won';clearInput();const gems=game.crystals.filter(g=>g.taken).length;
    show('TESTLEVEL GESCHAFFT','Sternentor erreicht!','Du hast '+gems+' von '+game.crystals.length+' Kristallen gesammelt und '+game.deaths+' Wiederanläufe gebraucht. Lust auf eine zweite Runde?','Noch einmal spielen ↗');
    try{const old=JSON.parse(localStorage.getItem('luna-sprung')||'{}');localStorage.setItem('luna-sprung',JSON.stringify({completed:true,bestGems:Math.max(Number(old?.bestGems)||0,gems)}));}catch{}
  }
}
function sky(cam){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#333966');g.addColorStop(.65,'#6e709a');g.addColorStop(1,'#b7a9cb');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff1c5';ctx.beginPath();ctx.arc(785-cam*.025,90,38,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8e322';ctx.beginPath();ctx.arc(785-cam*.025,90,52,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#eee8ff88';for(let i=0;i<38;i++){const x=((i*173.3-cam*.06)%1020+1020)%1020;const y=25+(i*41)%205;ctx.fillRect(x,y,i%3===0?3:2,2);}
  for(let layer=0;layer<2;layer++){
    const offset=cam*(layer?.25:.12),base=layer?420:355;
    ctx.fillStyle=layer?'#62688f':'#777ba0';ctx.beginPath();ctx.moveTo(0,H);
    for(let x=-160;x<W+200;x+=80){const wx=x+offset,y=base-Math.sin(wx*.008)*55-Math.cos(wx*.018)*25;ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  }
  for(let i=0;i<10;i++){const x=i*410-cam*.45;if(x<-120||x>W+120)continue;const y=430;ctx.fillStyle='#abb1d066';ctx.fillRect(x+30,y-75,11,85);ctx.beginPath();ctx.ellipse(x+35,y-78,43,28,0,Math.PI,Math.PI*2);ctx.fill();}
}
function terrain(cam){
  for(const s of RunnerCore.terrain){if(s.x+s.w<cam||s.x>cam+W)continue;const x=s.x-cam;
    ctx.fillStyle=s.oneWay?'#73618b':'#655878';ctx.fillRect(x,s.y,s.w,s.h);
    ctx.fillStyle='#d8c3ff';ctx.fillRect(x,s.y,s.w,6);ctx.fillStyle='#a6d9e8';ctx.fillRect(x,s.y+6,s.w,3);
    ctx.fillStyle='#b29ac344';for(let tx=Math.ceil(s.x/32)*32;tx<s.x+s.w;tx+=32){ctx.fillRect(tx-cam,s.y+18,17,4);if(!s.oneWay)ctx.fillRect(tx-cam+11,s.y+48,14,5);}
    if(s.oneWay){ctx.fillStyle='#24294344';ctx.fillRect(x+4,s.y+s.h,s.w-8,5);}
  }
}
function crystal(x,y,phase){const bob=Math.sin(drawTime*3+phase)*3;ctx.save();ctx.translate(x+10,y+13+bob);ctx.fillStyle='#ffe68022';ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe680';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,0);ctx.lineTo(0,13);ctx.lineTo(-10,0);ctx.closePath();ctx.fill();ctx.fillStyle='#fff6c8';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,8);ctx.lineTo(-6,0);ctx.closePath();ctx.fill();ctx.restore();}
function hero(x,y,p){
  ctx.save();ctx.translate(Math.round(x+15),Math.round(y));ctx.scale(p.facing,1);ctx.translate(-15,0);
  const stride=p.grounded&&Math.abs(p.vx)>20?Math.sin(game.time*19)*4:0;
  ctx.fillStyle='#2d294b';ctx.fillRect(4,4,24,20);ctx.fillRect(0,5,8,10);ctx.fillRect(25,5,7,10);
  ctx.fillStyle='#f6dbc7';ctx.fillRect(8,9,18,14);ctx.fillStyle='#202741';ctx.fillRect(21,13,3,4);ctx.fillStyle='#fff7ed';ctx.fillRect(22,13,1,1);
  ctx.fillStyle='#c7b2ff';ctx.fillRect(6,24,21,13);ctx.fillStyle='#89d8ff';ctx.fillRect(9,28,16,10);
  ctx.fillStyle='#ffe680';ctx.fillRect(5,22,23,5);ctx.fillRect(-4,23,12,4);
  ctx.fillStyle='#f6dbc7';ctx.fillRect(3,27,5,9);ctx.fillRect(25,27,5,8);
  ctx.fillStyle='#33324f';ctx.fillRect(9,36,7,7+Math.max(0,stride));ctx.fillRect(21,36,7,7+Math.max(0,-stride));
  ctx.fillStyle='#f6f4ff';ctx.fillRect(7,41+Math.max(0,stride)*.3,10,4);ctx.fillRect(20,41+Math.max(0,-stride)*.3,11,4);ctx.restore();
}
function enemy(e,cam){const x=Math.round(e.x-cam),y=e.y+Math.sin(game.time*8)*1.3;ctx.fillStyle='#392d5a';ctx.fillRect(x+3,y+11,28,17);ctx.fillStyle='#b9a4e6';ctx.beginPath();ctx.moveTo(x,y+12);ctx.lineTo(x+9,y);ctx.lineTo(x+17,y+5);ctx.lineTo(x+25,y);ctx.lineTo(x+34,y+12);ctx.closePath();ctx.fill();ctx.fillStyle='#fff3c5';ctx.fillRect(x+7,y+14,7,6);ctx.fillRect(x+21,y+14,7,6);ctx.fillStyle='#202741';ctx.fillRect(x+10,y+15,3,4);ctx.fillRect(x+24,y+15,3,4);}
function draw(alpha){
  const p=game.player,x=prevX+(p.x-prevX)*alpha,y=prevY+(p.y-prevY)*alpha;
  const cam=prevCamera+(camera-prevCamera)*alpha;
  sky(cam);terrain(cam);
  for(let i=0;i<game.crystals.length;i++){const g=game.crystals[i];if(!g.taken&&g.x>=cam-30&&g.x<=cam+W+30)crystal(g.x-cam,g.y,i);}
  // Safe ground, checkpoint and exit are signposted with shapes as well as color.
  ctx.fillStyle='#d9e4fa';ctx.fillRect(1370-cam,375,5,85);ctx.fillStyle=game.checkpoint?'#ffe680':'#d2c3fa';ctx.beginPath();ctx.moveTo(1375-cam,375);ctx.lineTo(1413-cam,389);ctx.lineTo(1375-cam,403);ctx.closePath();ctx.fill();ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#f4eaff';ctx.fillText('RÜCKKEHRPUNKT',1384-cam,361);
  const gx=3080-cam;ctx.strokeStyle='#fff0b8';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(gx,413,30,46,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffe68033';ctx.fill();ctx.font='23px system-ui';ctx.fillStyle='#fff1b0';ctx.fillText('✦',gx,422);ctx.font='11px system-ui';ctx.fillText('ZIEL',gx,350);
  for(const e of game.enemies)if(e.alive&&e.x>=cam-40&&e.x<=cam+W+40)enemy(e,cam);
  hero(x-cam,y,p);
  if(cam<130){ctx.font='14px system-ui';ctx.textAlign='left';ctx.fillStyle='#f5edff';ctx.fillText('DEIN ABENTEUER →',70-cam,355);}
}
function frame(now){
  const elapsed=last?Math.max(0,Math.min(.1,(now-last)/1000)):0;last=now;drawTime+=elapsed;
  if(phase==='playing'){
    accumulator+=elapsed;
    while(accumulator>=STEP&&phase==='playing'){
      prevX=game.player.x;prevY=game.player.y;prevCamera=camera;
      game.step(STEP,controls());events();camera=Math.max(0,Math.min(RunnerCore.WIDTH-W,game.player.x-W*.33));accumulator-=STEP;
      messageTimer-=STEP;if(messageTimer<=0&&$('status').textContent!=='Laufen: ← → oder A / D · Springen: Leertaste, ↑ oder W · Pause: P')$('status').textContent='Laufen: ← → oder A / D · Springen: Leertaste, ↑ oder W · Pause: P';
    }
  }
  draw(phase==='playing'?Math.min(1,accumulator/STEP):1);hud();requestAnimationFrame(frame);
}
syncPosition();requestAnimationFrame(frame);
