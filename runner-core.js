(function(root){
'use strict';
const WIDTH=3200,HEIGHT=540,GROUND=460;
const terrain=[
  {x:0,y:460,w:620,h:160},{x:748,y:460,w:702,h:160},
  {x:1578,y:460,w:672,h:160},{x:2378,y:460,w:822,h:160},
  ...[[280,365,150],[510,300,130],[830,370,180],[1140,350,190],
      [1650,365,150],[1880,300,150],[2160,370,120],[2450,365,150],
      [2700,310,160]].map(([x,y,w])=>({x,y,w,h:20,oneWay:true}))
];
const gems=[[190,418],[320,326],[380,326],[540,262],[595,262],[680,325],
  [865,332],[945,332],[1060,416],[1180,312],[1250,312],[1390,416],
  [1510,325],[1690,327],[1750,327],[1915,262],[1980,262],[2100,416],
  [2200,332],[2310,325],[2490,327],[2550,327],[2740,272],[2810,272],
  [2930,418]];
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function createGame(){
  const game={player:null,crystals:[],enemies:[],checkpoint:false,deaths:0,time:0,state:'playing',jumpBuffer:0,coyote:0,jumpHeld:false,event:null};
  function respawn(){game.player={x:game.checkpoint?1360:70,y:416,w:30,h:44,vx:0,vy:0,grounded:true,facing:1};game.jumpBuffer=0;game.coyote=.1;game.jumpHeld=false;}
  function reset(){game.checkpoint=false;game.deaths=0;game.time=0;game.state='playing';game.crystals=gems.map(([x,y])=>({x,y,w:20,h:26,taken:false}));game.enemies=[{x:1020,y:432,w:34,h:28,min:980,max:1100,vx:58,alive:true},{x:1790,y:432,w:34,h:28,min:1720,max:1850,vx:-66,alive:true},{x:2600,y:432,w:34,h:28,min:2600,max:2690,vx:54,alive:true}];game.event=null;respawn();}
  function die(){game.deaths++;respawn();game.event='respawn';}
  function step(dt,input={}){
    if(game.state!=='playing')return;
    dt=Math.max(0,Math.min(.05,dt));game.event=null;game.time+=dt;
    const p=game.player,oldBottom=p.y+p.h;
    const axis=(input.right?1:0)-(input.left?1:0);
    if(input.jump&&!game.jumpHeld)game.jumpBuffer=.13;
    else game.jumpBuffer=Math.max(0,game.jumpBuffer-dt);
    if(!input.jump&&game.jumpHeld&&p.vy<-230)p.vy=-230;
    game.jumpHeld=!!input.jump;
    game.coyote=p.grounded?.11:Math.max(0,game.coyote-dt);
    const target=axis*260,accel=(axis?2100:2400)*dt;
    p.vx+=Math.max(-accel,Math.min(accel,target-p.vx));
    if(axis)p.facing=axis;
    if(game.jumpBuffer>0&&game.coyote>0){p.vy=-650;p.grounded=false;game.coyote=0;game.jumpBuffer=0;game.event='jump';}
    p.x=Math.max(0,Math.min(WIDTH-p.w,p.x+p.vx*dt));
    for(const solid of terrain){if(!solid.oneWay&&intersects(p,solid)){if(p.vx>0)p.x=solid.x-p.w;else if(p.vx<0)p.x=solid.x+solid.w;p.vx=0;}}
    p.vy=Math.min(900,p.vy+1750*dt);p.y+=p.vy*dt;p.grounded=false;
    for(const solid of terrain){
      if(p.x+p.w<=solid.x||p.x>=solid.x+solid.w)continue;
      if(p.vy>=0&&oldBottom<=solid.y+.5&&p.y+p.h>=solid.y){p.y=solid.y-p.h;p.vy=0;p.grounded=true;}
      else if(!solid.oneWay&&p.vy<0&&p.y<solid.y+solid.h&&oldBottom-p.h>=solid.y+solid.h){p.y=solid.y+solid.h;p.vy=0;}
    }
    for(const enemy of game.enemies){
      if(!enemy.alive)continue;
      enemy.x+=enemy.vx*dt;
      if(enemy.x<=enemy.min){enemy.x=enemy.min;enemy.vx=Math.abs(enemy.vx);}
      if(enemy.x>=enemy.max){enemy.x=enemy.max;enemy.vx=-Math.abs(enemy.vx);}
      if(intersects(p,enemy)){
        if(p.vy>0&&oldBottom<=enemy.y+10){enemy.alive=false;p.vy=-390;game.event='stomp';}
        else {die();return;}
      }
    }
    for(const gem of game.crystals){if(!gem.taken&&intersects(p,gem)){gem.taken=true;game.event='gem';}}
    if(!game.checkpoint&&p.x>=1330&&p.y<GROUND){game.checkpoint=true;game.event='checkpoint';}
    if(p.y>HEIGHT+100){die();return;}
    if(p.x>=3060&&p.grounded){game.state='won';game.event='won';}
  }
  reset();return Object.assign(game,{step,reset,respawn});
}
const api={createGame,terrain,gems,WIDTH,HEIGHT,GROUND,intersects};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RunnerCore=api;
})(globalThis);
