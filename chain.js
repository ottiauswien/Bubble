'use strict';

// Ordered from the leading ball towards the entry. Distances are measured
// along an arc-length sampled track, so curves do not change the speed.
let chain = [], chainQueue = [], track = [], trackLength = 0;
const CHAIN_GAP = 35;
let progressPercent = -1,trackImage=null,trackImageDpr=0;

function buildTrack() {
  track = [{ x: 25, y: 85, s: 0 }];
  function add(x, y) {
    const last = track[track.length - 1];
    track.push({ x, y, s: last.s + Math.hypot(x - last.x, y - last.y) });
  }
  function line(x, y) {
    const start = track[track.length - 1], steps = Math.ceil(Math.hypot(x-start.x,y-start.y)/3);
    for (let i=1;i<=steps;i++) add(start.x+(x-start.x)*i/steps,start.y+(y-start.y)*i/steps);
  }
  function curve(ax, ay, bx, by, x, y) {
    const start=track[track.length-1];
    for(let i=1;i<=90;i++) {
      const t=i/90,u=1-t;
      add(u*u*u*start.x+3*u*u*t*ax+3*u*t*t*bx+t*t*t*x,
          u*u*u*start.y+3*u*u*t*ay+3*u*t*t*by+t*t*t*y);
    }
  }
  line(345,85);curve(425,85,425,215,345,215);
  line(95,215);curve(15,215,15,345,95,345);
  line(345,345);curve(408,345,408,420,345,420);
  trackLength=track[track.length-1].s;
}

function trackPoint(distance) {
  const s=Math.max(0,Math.min(trackLength,distance));
  let lo=0,hi=track.length-1;
  while(lo+1<hi) { const mid=(lo+hi)>>1;if(track[mid].s<s)lo=mid;else hi=mid; }
  const a=track[lo],b=track[hi],t=(s-a.s)/(b.s-a.s||1);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}

function setupChain() {
  buildTrack();chain=[];chainQueue=[];progressPercent=-1;trackImage=null;
  const total=Math.min(80,24+level*4),initial=Math.min(total,16+Math.min(level,8));
  const colorCount=Math.min(6,3+Math.floor((level-1)/3));
  let seed=level*73129;
  function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  let previous=-1;
  while(chainQueue.length<total) {
    let color=Math.floor(rand()*colorCount);
    if(color===previous)color=(color+1)%colorCount;
    chainQueue.push(color,color);previous=color;
  }
  chainQueue.length=total;
  for(let i=0;i<initial;i++) {
    const s=(initial-1-i)*CHAIN_GAP;
    chain.push({s,displayS:s,color:chainQueue.shift()});
  }
  chainStatus();
}

function chainColors() {
  return [...new Set((chain.length?chain:chainQueue.map(color=>({color}))).map(ball=>ball.color))];
}

function chainStatus(message='') {
  $('status').textContent=message||('Noch '+(chain.length+chainQueue.length)+' Kugeln · Halte den Ausgang frei.');
}

function chainWin() {
  if(chain.length||chainQueue.length)return false;
  score+=level*100;unlocked=Math.max(unlocked,level+1);
  state='clearing';winDelay=.7;ui();return true;
}

function resolveChain(index) {
  let combo=1,removed=0;
  while(chain[index]) {
    const color=chain[index].color;
    let left=index,right=index;
    while(left>0&&chain[left-1].color===color)left--;
    while(right+1<chain.length&&chain[right+1].color===color)right++;
    const count=right-left+1;
    if(count<3)break;
    for(let i=left;i<=right;i++) {
      const p=trackPoint(chain[i].displayS);
      burst(p.x,p.y,colors[color]);
    }
    score+=count*10*combo;removed+=count;
    // Pull the leading segment back to close the gap. Display positions ease
    // towards these targets, while the logical order stays deterministic.
    for(let i=0;i<left;i++)chain[i].s-=count*CHAIN_GAP;
    chain.splice(left,count);combo++;
    if(left===0||left>=chain.length||chain[left-1].color!==chain[left].color)break;
    index=left-1;
  }
  chainStatus(removed?(combo>2?'Kettenreaktion! ':'Treffer! ')+removed+' Kugeln aufgelöst.':'Eingereiht! Suche zwei gleiche Symbole.');
  return removed;
}

function insertChain(hit, projectile) {
  const ball=chain[hit],p=trackPoint(ball.displayS);
  const a=trackPoint(ball.displayS-2),b=trackPoint(ball.displayS+2);
  const ahead=(projectile.x-p.x)*(b.x-a.x)+(projectile.y-p.y)*(b.y-a.y)>=0;
  const index=hit+(ahead?0:1);
  const s=index<chain.length?chain[index].s+CHAIN_GAP:chain[chain.length-1].s;
  for(let i=0;i<index;i++)chain[i].s+=CHAIN_GAP;
  chain.splice(index,0,{s,displayS:s,color:projectile.color});shot=null;
  resolveChain(index);
  if(chainWin())return;
  const available=chainColors();
  current=available.includes(next)?next:randomColor();next=randomColor();ui();
}

function updateChain(dt) {
  const distance=(14+Math.min(30,level*1.8))*dt;
  const ease=1-Math.exp(-18*dt);
  for(const ball of chain) {
    ball.s+=distance;ball.displayS+=distance;
    ball.displayS+=(ball.s-ball.displayS)*ease;
  }
  if(!chain.length&&chainQueue.length) {
    const color=chainQueue.shift();chain.push({s:0,displayS:0,color});
    if(!chainColors().includes(current))current=randomColor();
  }
  while(chainQueue.length&&chain.length&&chain[chain.length-1].s>=CHAIN_GAP) {
    const s=chain[chain.length-1].s-CHAIN_GAP;
    chain.push({s,displayS:s,color:chainQueue.shift()});chainStatus();
  }
  if(chain.length&&chain[0].s>=trackLength) {
    shot=null;
    overlay('NOCH EIN VERSUCH?','Ausgang erreicht.','Die Kugelkette war schneller. Probiere es noch einmal – mit dem Tempo-Regler kannst du sie verlangsamen.','Level erneut spielen ↗','lost');
    return;
  }
  if(shot) {
    const steps=Math.max(1,Math.ceil(dt*680/8)),step=dt/steps;
    for(let i=0;i<steps&&shot;i++) {
      const s=shot;s.x+=s.vx*step;s.y+=s.vy*step;
      if(s.x<R){s.x=R;s.vx=Math.abs(s.vx);}
      if(s.x>W-R){s.x=W-R;s.vx=-Math.abs(s.vx);}
      let hit=-1;
      for(let j=0;j<chain.length;j++) {
        const p=trackPoint(chain[j].displayS);
        if((s.x-p.x)**2+(s.y-p.y)**2<(2*R-.5)**2){hit=j;break;}
      }
      if(hit>=0)insertChain(hit,s);
      else if(s.y<-R) {
        shot=null;const available=chainColors();
        current=available.includes(next)?next:randomColor();next=randomColor();
        chainStatus('Vorbei – die nächste Kugel wartet.');
      }
    }
  }
  const percent=chain.length?Math.max(0,Math.min(100,Math.round(chain[0].s/trackLength*100))):0;
  if(percent!==progressPercent){progressPercent=percent;$('chainProgress').value=percent;$('chainProgress').setAttribute('aria-valuetext',percent+' Prozent des Wegs zum Ausgang');}
}

function drawChainGuide() {
  let x=LAUNCH.x,y=LAUNCH.y,vx=Math.cos(angle),vy=Math.sin(angle);
  const occupied=chain.map(ball=>trackPoint(ball.displayS));
  ctx.fillStyle=colors[current]+'99';
  for(let i=0;i<400;i++) {
    x+=vx*7;y+=vy*7;
    if(x<R||x>W-R){vx=-vx;x=Math.max(R,Math.min(W-R,x));}
    if(y<0||occupied.some(p=>(p.x-x)**2+(p.y-y)**2<(2*R-.5)**2))break;
    if(i%3===0){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
  }
}

function drawChainBoard() {
  if(!trackImage||trackImageDpr!==dpr){
  trackImage=surface(W*dpr,H*dpr);trackImageDpr=dpr;
  const c=trackImage.getContext('2d');c.scale(dpr,dpr);c.lineJoin='round';c.lineCap='round';
  c.beginPath();track.forEach((p,i)=>{if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});
  c.strokeStyle='#ffffff08';c.lineWidth=42;c.stroke();
  c.strokeStyle='#b1bcdf33';c.lineWidth=2;c.setLineDash([4,8]);c.stroke();c.setLineDash([]);
  const start=track[0],end=track[track.length-1];
  c.fillStyle='#b6a3ff';c.beginPath();c.arc(start.x,start.y,8,0,Math.PI*2);c.fill();
  c.strokeStyle='#ffe680';c.lineWidth=3;c.beginPath();c.arc(end.x,end.y,23,0,Math.PI*2);c.stroke();
  c.font='10px system-ui';c.textAlign='right';c.fillStyle='#ffe680';c.fillText('AUSGANG',end.x-30,end.y+4);
  }
  ctx.drawImage(trackImage,0,0,W,H);
  for(const ball of chain){const p=trackPoint(ball.displayS);orb(p.x,p.y,colors[ball.color]);}
  ctx.font='10px system-ui';ctx.fillStyle='#a8b7d5';ctx.textAlign='left';
  ctx.fillText('NOCH '+chainQueue.length+' IM ZULAUF',24,34);
}
