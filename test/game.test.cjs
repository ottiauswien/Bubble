const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const chainSource=fs.readFileSync(require('node:path').join(__dirname, '../chain.js'),'utf8');
const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8');

// DOM/Canvas contract simulation. This deliberately does not claim browser or GPU coverage.
function game(save = '{}', storageFails = false, search = '', extraStorage = {}) {
  const elements = new Map(), events = new Map();
  let stored = save, drawCalls = 0;const otherStorage=new Map(Object.entries(extraStorage));
  const context2d = new Proxy({}, { get(target, key) {
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return (...args) => { drawCalls++; for (const arg of args) if (typeof arg === 'number') assert(Number.isFinite(arg), key + ' received a non-finite number'); };
  }, set() { return true; } });
  function element() {
    return { textContent: '', hidden: false, value: '', tagName: 'CANVAS',
      width: 440, height: 570, handlers: {}, attributes: {},
      addEventListener(type, cb) { this.handlers[type] = cb; },
      setAttribute(name, val) { this.attributes[name] = val; },
      focus() {}, setPointerCapture() {}, getContext: () => context2d,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 220, height: 285 }) };
  }
  const document = { hidden: false, createElement: element,
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    addEventListener(type, cb) { events.set(type, cb); } };
  const sandbox = vm.createContext({ console, Math, Set, Map, Array, Number, JSON, String, URLSearchParams,
    document, window: { devicePixelRatio: 2, location: {search}, addEventListener() {} },
    localStorage: { getItem(key) { if (storageFails) throw Error('denied'); return key==='bubble-orbit'?stored:otherStorage.get(key)||null; },
      setItem(key, val) { if (storageFails) throw Error('denied'); if(key==='bubble-orbit')stored = val;else otherStorage.set(key,val); } },
    performance: { now: () => 1000 }, requestAnimationFrame() {} });
  const run = code => vm.runInContext(code, sandbox);
  run(chainSource);run(source);
  return { run, el: id => document.getElementById(id), events, document,
    saved: (mode='classic') => JSON.parse(mode==='chain'?otherStorage.get('bubble-orbit-chain')||'{}':stored), draws: () => drawCalls };
}

test('all 100 starting boards are valid, fit above the danger line and use existing shot colors', () => {
  const g = game();
  for (let n = 1; n <= 100; n++) {
    g.run(`level=${n};setup()`);
    assert(g.run('grid.length >= 4 && grid.length <= 10'));
    assert(g.run('grid.every(row=>row.length===COLS&&row.every(v=>v===null||(v>=0&&v<colors.length)))'));
    assert(g.run('existing().includes(current)&&existing().includes(next)'));
    assert(g.run('grid.every((row,r)=>row.every((v,c)=>v===null||(pos(r,c).y+R<LIMIT&&pos(r,c).x-R>=0&&pos(r,c).x+R<=W)))'));
  }
});
test('hex neighbors are symmetric at both parities and edges', () => {
  const g=game();
  assert(g.run('Array.from({length:12},(_,r)=>Array.from({length:COLS},(_,c)=>neighbors(r,c).every(([a,b])=>neighbors(a,b).some(([x,y])=>x===r&&y===c)))).flat().every(Boolean)'));
});
test('two equal colors do not pop; three pop with correct bonus and delayed win animation', () => {
  const g=game();g.run('grid=[[0,...Array(10).fill(null)]];state="playing";score=0;endTurn(0,1,0)');
  assert.equal(g.run('score'),0);assert.equal(g.run('misses'),1);
  g.run('endTurn(0,2,0)');assert.equal(g.run('score'),130);assert.equal(g.run('state'),'clearing');
  assert(g.run('particles.length>0'));g.run('update(.8)');assert.equal(g.run('state'),'won');
});
test('floating bubbles fall while ceiling-connected bubbles stay', () => {
  const g=game();g.run('grid=[[0,...Array(10).fill(null)],[0,...Array(10).fill(null)],[...Array(10).fill(null),1]];score=0;dropFloating()');
  assert.equal(g.run('value(1,0)'),0);assert.equal(g.run('value(2,10)'),null);assert.equal(g.run('score'),20);assert(g.run('particles.some(p=>p.r===R)'));
});
test('five misses add exactly two rows and preserve hex parity', () => {
  const g=game();g.run('grid=[[0,...Array(10).fill(null)]];state="playing";misses=4;endTurn(1,0,1)');
  assert.equal(g.run('grid.length'),4);assert.equal(g.run('misses'),0);assert.equal(g.run('value(2,0)'),0);assert.equal(g.run('value(3,0)'),1);
});
test('danger-line collision ends the level', () => {
  const g=game();g.run('grid=[Array(11).fill(null)];state="playing";endTurn(14,0,1)');assert.equal(g.run('state'),'lost');
});
test('both walls reflect shots and keep them inside the board', () => {
  const g=game();g.run('grid=[];state="playing";shot={x:18,y:450,vx:-680,vy:-10,color:0};update(.02)');assert(g.run('shot.vx>0&&shot.x>=R'));
  g.run('shot={x:422,y:450,vx:680,vy:-10,color:0};update(.02)');assert(g.run('shot.vx<0&&shot.x<=W-R'));
});
test('collision substeps catch high-speed shots without tunnelling', () => {
  const g=game();g.run('grid=[[0,...Array(10).fill(null)]];state="playing";shot={x:40,y:180,vx:0,vy:-680,color:1};setSpeed(150);update(.2)');
  assert.equal(g.run('shot'),null);assert(g.run('grid.flat().includes(1)'));
});
test('a ceiling shot attaches to an empty slot and never overwrites a bubble', () => {
  const g=game();g.run('grid=[[0,...Array(10).fill(null)]];state="playing";attach({x:220,y:TOP,color:1},null)');
  assert.equal(g.run('value(0,0)'),0);assert.equal(g.run('grid.flat().filter(v=>v===1).length'),1);
});
test('only one shot can be active; swapping is blocked during flight', () => {
  const g=game();g.run('state="playing";current=0;next=1;fire();fire();swap()');assert.equal(g.run('turn'),1);assert.equal(g.run('current'),0);
});
test('25/100/150 percent tempo scales travel and clamps unsafe input', () => {
  const g=game();
  for (const [percent,dist] of [[25,17],[100,68],[150,102]]) {
    g.run(`grid=[];state="playing";setSpeed(${percent});shot={x:220,y:500,vx:0,vy:-680,color:0};update(.1)`);
    assert(Math.abs(g.run('500-shot.y')-dist)<1e-8);
  }
  g.run('setSpeed(999)');assert.equal(g.run('speed'),1.5);g.run('setSpeed(-100)');assert.equal(g.run('speed'),.25);
  g.el('speedReset').onclick();assert.equal(g.run('speed'),1);
});
test('pause freezes a shot; resuming and tab visibility work', () => {
  const g=game();g.run('play();fire();pause();update(.1)');assert.equal(g.run('shot.y'),515);
  g.run('pause();update(.1)');assert(g.run('shot.y<515'));
  g.document.hidden=true;g.events.get('visibilitychange')();assert.equal(g.run('state'),'paused');
});
test('restart restores the start-of-level score and cancels active shots', () => {
  const g=game();g.run('score=500;setup();score=700;state="playing";fire()');g.el('restart').onclick();
  assert.equal(g.run('score'),500);assert.equal(g.run('shot'),null);assert.equal(g.run('state'),'playing');
});
test('next-level button advances once and saves completed progress before reload', () => {
  const g=game();g.run('grid=[[0,0,...Array(9).fill(null)]];state="playing";score=0;endTurn(0,2,0)');
  assert.equal(g.saved().level,2);assert.equal(g.saved().score,130);
  g.run('update(1)');g.el('action').onclick();assert.equal(g.run('level'),2);assert.equal(g.run('score'),130);
});
test('speed and completed progress survive reloading', () => {
  const g=game('{"level":7,"score":800,"unlocked":7,"speed":0.4}');
  assert.equal(g.run('level'),7);assert.equal(g.run('score'),800);assert.equal(g.run('speed'),.4);assert.equal(g.el('speedValue').textContent,'40 %');
});
test('corrupt/null storage and disabled localStorage do not break startup', () => {
  for(const data of ['{','null','"string"','[]']) {const g=game(data);assert.equal(g.run('level'),1);g.run('draw()');}
  assert.equal(game('{}',true).run('level'),1);
});
test('pointer coordinates scale correctly on mobile and cancellation does not fire', () => {
  const g=game();assert.equal(g.run('coords({clientX:110,clientY:100}).x'),220);
  g.run('play()');const c=g.el('game');c.handlers.pointerdown({clientX:110,clientY:60,pointerId:1,button:0});c.handlers.pointercancel();c.handlers.pointerup({clientX:110,clientY:60});assert.equal(g.run('shot'),null);
  c.handlers.pointerdown({clientX:110,clientY:60,pointerId:1,button:0});c.handlers.pointerup({clientX:110,clientY:60});assert(g.run('shot!==null'));
});
test('keyboard pause works after a button click; slider arrows do not shoot', () => {
  const g=game();g.run('play()');const key=g.events.get('keydown');
  key({key:'p',target:{tagName:'BUTTON'},preventDefault(){}});assert.equal(g.run('state'),'paused');
  key({key:'p',target:{tagName:'CANVAS'},preventDefault(){}});assert.equal(g.run('state'),'playing');
  key({key:'ArrowUp',target:{tagName:'INPUT'},preventDefault(){}});assert.equal(g.run('shot'),null);
});
test('30/60/120/144 Hz produce the same travel distance over one second', () => {
  for(const hz of [30,60,120,144]) {const g=game();g.run('grid=[];state="playing";last=1000;shot={x:220,y:500,vx:0,vy:-100,color:0}');for(let i=1;i<=hz;i++)g.run(`frame(${1000+i*1000/hz})`);assert(Math.abs(g.run('shot.y')-400)<1e-6);}
});
test('retina rendering uses doubled backing resolution and cached sprites', () => {
  const g=game();assert.equal(g.el('game').width,880);assert.equal(g.el('game').height,1140);
  g.run('draw()');const count=g.run('spriteCache.size');g.run('draw()');assert.equal(g.run('spriteCache.size'),count);assert(g.draws()>0);
});
test('all six bubble types have unique vector symbols with at least 7:1 symbol contrast', () => {
  const g=game();
  assert.equal(g.run('new Set(symbols).size'),6);
  const palette=JSON.parse(g.run('JSON.stringify(colors)'));
  const luminance=hex=>{const a=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
  for(const color of palette) assert((luminance(color)+.05)/(luminance('#202741')+.05)>=7);
  g.run('colors.forEach((color,i)=>orb(40+i*50,200,color));draw()');
});
test('randomized play: 50 boards, up to 100 shots each, no stuck shots or invalid state', () => {
  const g=game();let shots=0;
  for(let n=1;n<=50;n++){
    g.run(`level=${n};score=0;setup();play();setSpeed(150)`);
    for(let t=0;t<100&&g.run('state')==='playing';t++){
      g.run('angle=-Math.PI+.17+Math.random()*(Math.PI-.34);fire()');shots++;
      for(let f=0;f<600&&g.run('shot!==null');f++)g.run('update(1/60)');
      assert.equal(g.run('shot'),null,'shot must settle');
      assert(g.run('grid.every(row=>row.length===COLS&&row.every(v=>v===null||(Number.isInteger(v)&&v>=0&&v<colors.length)))'));
      if(t%10===0)g.run('draw()');
    }
  }
  assert(shots>300);
});

test('mode links select the correct game and ignore invalid mode values', () => {
  assert.equal(game('{}',false,'?mode=chain').run('mode'),'chain');
  assert.equal(game('{}',false,'?mode=classic').run('mode'),'classic');
  assert.equal(game('{}',false,'?mode=invalid').run('mode'),'classic');
  assert.equal(game('{}',false,'',{'bubble-orbit-mode':'chain'}).run('mode'),'chain');
});
test('mode switching keeps progress separate and resets active shots safely', () => {
  const g=game('{"level":4,"score":700,"best":900}');
  g.run('play();fire();switchMode("chain")');assert.equal(g.run('shot'),null);
  assert.equal(g.run('level'),1);assert.equal(g.run('score'),0);assert.equal(g.run('state'),'intro');
  g.run('level=3;score=200;setup();play();switchMode("classic")');
  assert.equal(g.run('level'),4);assert.equal(g.run('score'),700);assert.equal(g.run('best'),900);
  g.run('switchMode("chain")');assert.equal(g.run('level'),3);assert.equal(g.run('score'),200);
});
test('switch buttons expose their selected state and matching instructions', () => {
  const g=game();g.el('modeChain').onclick();
  assert.equal(g.el('modeChain').attributes['aria-pressed'],'true');assert.equal(g.el('modeClassic').attributes['aria-pressed'],'false');
  assert.equal(g.el('classicRules').hidden,true);assert.equal(g.el('chainRules').hidden,false);assert.equal(g.el('chainMeter').hidden,false);
  g.el('modeClassic').onclick();assert.equal(g.el('chainRules').hidden,true);assert.equal(g.el('chainMeter').hidden,true);
});
test('chain track is monotonic in distance and contained within the board', () => {
  const g=game('{}',false,'?mode=chain');
  assert(g.run('trackLength>1200'));
  assert(g.run('track.every((p,i)=>p.x>=R&&p.x<=W-R&&p.y>=R&&p.y<LAUNCH.y-50&&(!i||p.s>track[i-1].s))'));
  for(let i=0;i<100;i++) {const p=g.run(`trackPoint(${i}*trackLength/99)`);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('100 chain levels start before the exit with valid finite ordered bubbles', () => {
  const g=game('{}',false,'?mode=chain');
  for(let n=1;n<=100;n++){
    g.run(`level=${n};setup()`);
    assert(g.run('chain[0].s<trackLength'));
    assert(g.run('chain.length+chainQueue.length===Math.min(80,24+level*4)'));
    assert(g.run('chain.every((b,i)=>b.color>=0&&b.color<6&&Number.isFinite(b.s)&&(!i||Math.abs(chain[i-1].s-b.s-CHAIN_GAP)<.01))'));
  }
});
test('inserting a third matching chain bubble resolves the group and wins', () => {
  const g=game('{}',false,'?mode=chain');
  g.run('chain=[{s:200,displayS:200,color:0},{s:165,displayS:165,color:0}];chainQueue=[];state="playing";score=0;insertChain(0,{...trackPoint(200),color:0})');
  assert.equal(g.run('chain.length'),0);assert.equal(g.run('state'),'clearing');assert.equal(g.run('score'),130);assert.equal(g.saved('chain').level,2);
});
test('different chain colors insert without destroying existing bubbles or breaking spacing', () => {
  const g=game('{}',false,'?mode=chain');
  g.run('chain=[{s:200,displayS:200,color:0},{s:165,displayS:165,color:0}];chainQueue=[];state="playing";insertChain(0,{...trackPoint(200),color:1})');
  assert.equal(g.run('chain.length'),3);assert(g.run('chain.every((b,i)=>!i||Math.abs(chain[i-1].s-b.s-CHAIN_GAP)<.01)'));
});
test('closing a chain gap triggers a scored chain reaction', () => {
  const g=game('{}',false,'?mode=chain');
  g.run('chain=[1,1,0,0,0,1].map((color,i)=>({s:400-i*35,displayS:400-i*35,color}));chainQueue=[];score=0;resolveChain(3)');
  assert.equal(g.run('chain.length'),0);assert.equal(g.run('score'),90);
});
test('pending chain balls spawn at the entry and prevent an early win', () => {
  const g=game('{}',false,'?mode=chain');
  g.run('chain=[];chainQueue=[1,1];state="playing";update(.01)');assert.equal(g.run('chain.length'),1);assert.equal(g.run('chainQueue.length'),1);
  assert.equal(g.run('chainWin()'),false);assert.equal(g.run('state'),'playing');
});
test('reaching the chain exit loses and pause freezes both chain and shot', () => {
  const g=game('{}',false,'?mode=chain');g.run('play();fire();pause()');const s=g.run('chain[0].s');g.run('update(.5)');assert.equal(g.run('chain[0].s'),s);assert.equal(g.run('shot.y'),515);
  g.run('play();chain[0].s=trackLength-.1;update(.1)');assert.equal(g.run('state'),'lost');assert.equal(g.run('shot'),null);
});
test('chain movement is frame-rate independent at 30/60/120/144 Hz', () => {
  let reference;
  for(const hz of [30,60,120,144]){
    const g=game('{}',false,'?mode=chain');g.run('play();last=1000');
    for(let i=1;i<=hz;i++)g.run(`frame(${1000+i*1000/hz})`);
    const s=g.run('chain[0].s');if(reference===undefined)reference=s;assert(Math.abs(s-reference)<1e-6);
  }
});
test('randomized chain play settles projectiles, preserves ordering and renders without errors', () => {
  const g=game('{}',false,'?mode=chain');
  for(let n=1;n<=15;n++){
    g.run(`level=${n};score=0;setup();play();setSpeed(150)`);
    for(let t=0;t<50&&g.run('state')==='playing';t++){
      g.run('angle=-Math.PI+.17+Math.random()*(Math.PI-.34);fire()');
      for(let f=0;f<700&&g.run('shot!==null');f++)g.run('update(1/60)');
      assert.equal(g.run('shot'),null);
      assert(g.run('chain.every((b,i)=>Number.isFinite(b.s)&&Number.isFinite(b.displayS)&&(!i||chain[i-1].s>b.s))'));
      g.run('draw()');
    }
  }
});
