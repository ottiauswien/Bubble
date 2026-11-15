const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createGame,terrain}=require('../runner-core.js');
function advance(g,seconds,input={}){for(let t=0;t<Math.ceil(seconds*120);t++)g.step(1/120,input);}
test('player starts safely on the floor and does not sink',()=>{const g=createGame();advance(g,2);assert.equal(g.player.y,416);assert(g.player.grounded);assert.equal(g.deaths,0);});
test('left/right controls accelerate, stop, and respect world bounds',()=>{const g=createGame();advance(g,1,{left:true});assert.equal(g.player.x,0);advance(g,1,{right:true});assert(g.player.x>200);advance(g,.2);assert.equal(g.player.vx,0);});
test('jump rises and lands on solid ground',()=>{const g=createGame();g.step(1/120,{jump:true});assert(g.player.vy<0);assert(!g.player.grounded);advance(g,.9,{jump:true});assert(g.player.grounded);assert.equal(g.player.y,416);});
test('releasing jump early gives a lower jump',()=>{const full=createGame(),short=createGame();let fullTop=416,shortTop=416;for(let i=0;i<90;i++){full.step(1/120,{jump:i<70});short.step(1/120,{jump:i<6});fullTop=Math.min(fullTop,full.player.y);shortTop=Math.min(shortTop,short.player.y);}assert(shortTop>fullTop+35);});
test('pressing jump again in midair does not create an extra jump',()=>{const g=createGame();g.step(1/120,{jump:true});advance(g,.12);const vy=g.player.vy;g.step(1/120,{jump:true});assert(g.player.vy>vy);});
test('coyote time permits jumping just beyond a ledge',()=>{const g=createGame();g.player.x=630;g.player.grounded=false;g.coyote=.07;g.step(1/120,{jump:true});assert(g.player.vy<-600);});
test('buffered jump activates after landing',()=>{const g=createGame();g.player.y=409;g.player.vy=160;g.player.grounded=false;g.coyote=0;advance(g,.06,{jump:true});assert(g.player.vy<0);assert(g.player.y<416);});
test('platforms can be jumped through from below and landed on from above',()=>{const g=createGame();g.player.x=320;g.step(1/120,{jump:true});advance(g,.7,{jump:true});assert.equal(g.player.y,321);assert(g.player.grounded);});
test('falling into a pit respawns without a game-over barrier',()=>{const g=createGame();g.player.x=675;g.player.y=500;g.player.grounded=false;advance(g,1);assert.equal(g.deaths,1);assert.equal(g.player.x,70);assert.equal(g.state,'playing');});
test('checkpoint and collected crystals survive respawning',()=>{const g=createGame();g.player.x=1340;g.step(1/120);assert(g.checkpoint);g.crystals[0].taken=true;g.player.x=1510;g.player.y=650;g.step(1/120);assert.equal(g.deaths,1);assert.equal(g.player.x,1360);assert(g.crystals[0].taken);});
test('side contact with a guardian respawns the player',()=>{const g=createGame();g.player.x=1021;g.step(1/120);assert.equal(g.deaths,1);assert(g.enemies[0].alive);});
test('landing on a guardian defeats it and bounces upwards',()=>{const g=createGame();g.player.x=1021;g.player.y=385;g.player.vy=200;g.player.grounded=false;advance(g,.025);assert(!g.enemies[0].alive);assert(g.player.vy<0);assert.equal(g.deaths,0);});
test('crystals count once and are optional for completing the level',()=>{const g=createGame();g.player.x=190;g.step(1/120);assert(g.crystals[0].taken);g.player.x=3062;g.player.y=416;g.step(1/120);assert.equal(g.state,'won');assert(g.crystals.some(c=>!c.taken));});
test('restart resets checkpoint, time, deaths, guardians and collectibles',()=>{const g=createGame();g.checkpoint=true;g.deaths=5;g.crystals[0].taken=true;g.enemies[0].alive=false;advance(g,.1);g.reset();assert.equal(g.time,0);assert.equal(g.deaths,0);assert(!g.checkpoint);assert(g.enemies.every(e=>e.alive));assert(g.crystals.every(c=>!c.taken));});
test('the complete test level is traversable with normal controls and no deaths',()=>{
  const g=createGame();let lastJump=-100;
  for(let i=0;i<12000&&g.state!=='won';i++){
    const p=g.player;
    const pit=[620,1450,2250].find(x=>x>p.x+p.w-2&&x-p.x-p.w<58);
    const guardian=g.enemies.find(e=>e.alive&&e.x>p.x&&e.x-p.x<95&&Math.abs(p.y+p.h-e.y)<35);
    const jump=!!((pit||guardian)&&p.grounded);if(jump)lastJump=i;
    g.step(1/120,{right:true,jump:jump||i-lastJump<42});
  }
  assert.equal(g.state,'won');assert.equal(g.deaths,0);assert(g.checkpoint);assert(g.crystals.filter(c=>c.taken).length>=10);
});
test('all terrain is well-formed and finite',()=>{for(const s of terrain){assert(s.x>=0&&s.w>0&&s.h>0);assert(Number.isFinite(s.y));}});
