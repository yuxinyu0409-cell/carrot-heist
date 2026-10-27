'use strict';
const LEVELS=[
 {name:'自家菜园',tag:'从家门口出发',desc:'晴天、低跳台和满园萝卜。熟悉采集，把两人的收获带回任意一侧兔洞。',target:15,time:120,bandits:0,knife:0,platforms:[[260,330,180],[680,330,180],[470,240,180]],colors:['#9bceea','#6b9b49']},
 {name:'山坡菜地',tag:'向风车山坡前进',desc:'沿高低台阶寻找收获。背得越多跳得越低，先回洞存一趟再去高处。',target:20,time:115,bandits:0,knife:0,platforms:[[210,335,145],[410,255,140],[650,190,150],[860,300,130]],colors:['#a9d4d3','#638f45']},
 {name:'守卫菜园',tag:'留意高台上的动静',desc:'守卫会从高台投刀，先亮橙色预警。空投会送来加速靴和双倍工具，也可能落下炸弹。',target:25,time:110,bandits:0,knife:3.5,platforms:[[235,320,165],[480,230,170],[740,320,165]],colors:['#e9c49c','#a27b3d']},
 {name:'林间小路',tag:'守住背包里的收获',desc:'强盗会跳上平台追逐背菜的兔子。从上方踩晕它可追回萝卜；利用空投工具，避开炸弹。',target:30,time:105,bandits:1,knife:0,platforms:[[220,335,160],[440,245,160],[680,310,160],[875,220,120]],colors:['#91b8a8','#3d6d50']},
 {name:'强盗营地',tag:'最后一趟，合作突围',desc:'投刀、跨平台强盗和随机炸弹共同守住仓库。利用加速与双倍工具，分批把粮食带回家。',target:40,time:100,bandits:2,knife:2.5,platforms:[[215,330,155],[420,245,150],[640,320,150],[845,220,135]],colors:['#887fba','#635342']}
];
let mode='campaign',levelIndex=0,unlocked=0,cleared=[],knives=[],bandits=[],knifeClock=2,selection=0,drops=[],dropClock=4;
try{const saved=JSON.parse(localStorage.getItem('carrot-heist-progress')||'{}');unlocked=Math.max(0,Math.min(4,Number(saved.unlocked)||0));cleared=Array.isArray(saved.cleared)?saved.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<5):[];}catch{}
function saveProgress(){try{localStorage.setItem('carrot-heist-progress',JSON.stringify({unlocked,cleared}));}catch{}}
function currentLevel(){return LEVELS[levelIndex];}
function campaignSetup(){
 platforms.splice(0,platforms.length,...(mode==='versus'?[[247,275,178],[710,275,168],[436,174,250]]:currentLevel().platforms).map(([x,y,w])=>({x,y,w,h:19})));
 knives=[];bandits=[];drops=[];dropClock=4;knifeClock=2.5;
 if(mode==='campaign')for(let i=0;i<currentLevel().bandits;i++)bandits.push({x:460+i*240,y:GROUND-20,vx:0,vy:0,grounded:true,surface:-1,dropThrough:-2,jumpCd:0,patrol:0,destination:i%platforms.length,dir:i?-1:1,stun:0,bag:0,escape:0});
 const scene=['garden','hills','guard','forest','camp'][levelIndex];
 canvas.style.backgroundImage=`url(assets/scene-${mode==='versus'?'garden':scene}-v2.png)`;const surface=[650,640,648,640,650][mode==='versus'?0:levelIndex];
 canvas.style.backgroundSize=`100% ${442/520*855/surface*100}%`;canvas.style.backgroundPosition='center top';
 ui('mission').classList.toggle('hidden',mode==='versus');
 ui('map-button').textContent=mode==='versus'?'模式选择':'冒险地图';
 ui('modal-map').textContent=mode==='versus'?'返回模式选择':'返回冒险地图';
 ui('controls-hint').textContent=mode==='versus'?'靠近自动捡菜，回自己一侧兔洞存入。踩中对方可抢走背包里的菜。P / Esc 暂停。':'靠近自动捡菜，任意兔洞都能存入。背得越多跳得越低，踩队友可借力。P / Esc 暂停。';
 ui('play-objective').textContent=mode==='versus'?'竞争目标：90 秒内各自存菜，存入更多的人获胜。踩中对方可抢夺背包里的萝卜。':'合作目标：一起完成收获目标，任意兔洞均可存菜。踩晕强盗可追回收获。';
 ui('mode-label').textContent=mode==='versus'?'● 竞争模式':'● 合作模式';
 ui('level-label').textContent=mode==='versus'?'菜园争夺战':`${String(levelIndex+1).padStart(2,'0')} ${currentLevel().name}`;
}
function showMap(){clearPresentation();mode='campaign';state='map';ui('mode-label').textContent='● 合作模式';ui('map-button').textContent='冒险地图';keys.clear();knives=[];ui('overlay').classList.add('hidden');ui('game-view').classList.add('hidden');ui('world-map').classList.remove('hidden');ui('pause').disabled=true;ui('restart').disabled=true;renderMap();}
function renderMap(){
 selection=Math.min(selection,unlocked);
 ui('map-progress').textContent=`已完成 ${cleared.length} / 5 关`;
 ui('level-nodes').innerHTML=LEVELS.map((l,i)=>`<button class="map-node ${i===selection?'selected':''} ${i>unlocked?'locked':''}" data-level="${i}" style="--nx:${[13,31,49,68,88][i]}%;--ny:${[74,58,49,38,26][i]}%" ${i>unlocked?'disabled':''} aria-label="第${i+1}关 ${l.name}${i>unlocked?'，未解锁':''}"><span>${i>unlocked?'🔒':cleared.includes(i)?'✓':String(i+1).padStart(2,'0')}</span><b>${l.name}</b></button>`).join('');
 ui('level-nodes').querySelectorAll('button').forEach(b=>b.onclick=()=>{selection=Number(b.dataset.level);renderMap();});
 const l=LEVELS[selection];ui('selected-num').textContent=`CHAPTER 0${selection+1}`;ui('selected-name').textContent=l.name;ui('selected-desc').textContent=l.desc;ui('difficulty').textContent='●'.repeat(selection+1)+'○'.repeat(4-selection);ui('selected-target').textContent=`${l.target} 根`;ui('selected-time').textContent=`${l.time} 秒`;ui('map-start').textContent=cleared.includes(selection)?'再去探险 ↗':'出发，收集粮食 ↗';
}
function openLevel(index){if(!Number.isInteger(index)||index<0||index>unlocked||index>=LEVELS.length)return;clearPresentation();mode='campaign';levelIndex=index;ui('world-map').classList.add('hidden');ui('game-view').classList.remove('hidden');ui('pause').disabled=false;ui('restart').disabled=false;reset();state='ready';overlay(`0${index+1} · ${currentLevel().name}`,currentLevel().desc,'开始合作 ↗',`共同存入 ${currentLevel().target} 根 · ${currentLevel().time} 秒 · 任意兔洞均可存菜`);}
function winLevel(){state='won';keys.clear();if(!cleared.includes(levelIndex))cleared.push(levelIndex);unlocked=Math.max(unlocked,Math.min(4,levelIndex+1));selection=Math.min(4,levelIndex+1);saveProgress();updateHUD();showResult(true);}
function hurt(p,direction=1){if(p.invuln>0||state!=='playing')return;spill(p,Math.min(p.bag,3));p.invuln=1.6;p.stun=.35;p.vx=direction*150;p.vy=-210;p.grounded=false;p.squash=.6;shake=.15;float('小心！收获掉了',p.x,p.y-55,'#a34d34');sound('stomp');}
function hazardTick(dt){
 if(mode!=='campaign')return;
 const l=currentLevel();
 if(l.knife){knifeClock-=dt;if(knifeClock<=0){knifeClock=l.knife;const targets=players.filter(p=>p.x>220&&p.x<900);const target=targets.length?targets[Math.floor(rand()*targets.length)]:null;const x=Math.max(250,Math.min(870,(target?target.x:320+rand()*480)));let y=GROUND;for(const plat of platforms)if(x>plat.x&&x<plat.x+plat.w)y=Math.min(y,plat.y);knives.push({x,y,age:0,hit:false});tone(560,.09,'triangle',.035);}}
 for(const k of knives){k.age+=dt;if(k.age>=1.1&&!k.hit){k.hit=true;burst(k.x,k.y,'#e5bc70',5);for(const p of players)if(Math.abs(p.x-k.x)<29&&Math.abs(p.y+p.r-k.y)<56)hurt(p,p.x<k.x?-1:1);}}
 knives=knives.filter(k=>k.age<1.85);
 for(const b of bandits)banditTick(b,dt);
 dropTick(dt);

}
// Platforms are cached artwork: stable textures without per-frame randomness.
const terrainCache=new Map();
const platformImage=new Image(),banditImage=new Image();let platformArtReady=false,banditArtReady=false;
banditImage.src='assets/bandit-v2.png';banditImage.decode().then(()=>{banditArtReady=true;}).catch(()=>{});
platformImage.src='assets/platforms-v2.png';platformImage.decode().then(()=>{platformArtReady=true;}).catch(()=>{});
// Crop bounds include only each material, with the walkable top aligned to y.
const platformRegions=[[30,105,1710,175,-6,38],[40,380,1685,155,-4,35],[40,640,1685,155,-2,32]];
function terrainArtwork(w,chapter){
 const key=`${chapter}:${w}`;if(terrainCache.has(key))return terrainCache.get(key);
 const art=document.createElement('canvas');art.width=(w+24)*2;art.height=124;
 const c=art.getContext('2d');c.scale(2,2);c.translate(12,6);
 const noise=n=>{const v=Math.sin(n*127.1+w*3.7+chapter*41)*43758.5453;return v-Math.floor(v);};
 const wood=chapter===4,stone=chapter===2;
 c.shadowColor='#25332744';c.shadowBlur=8;c.shadowOffsetY=5;
 const fill=c.createLinearGradient(0,0,0,40);
 fill.addColorStop(0,wood?'#b28a58':stone?'#b7aa88':'#9e805b');
 fill.addColorStop(1,wood?'#594436':stone?'#756d5a':'#514a38');
 c.fillStyle=fill;c.beginPath();c.moveTo(0,1);c.lineTo(w,1);
 if(wood){c.lineTo(w-2,22);c.lineTo(2,22);}else{c.lineTo(w-5,25);for(let n=w-12;n>3;n-=12)c.lineTo(n,29+noise(n)*10);c.lineTo(2,22);}
 c.closePath();c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
 c.save();c.clip();
 for(let n=0;n<w;n+=wood?24:16){
  if(wood){c.strokeStyle='#493c2f66';c.lineWidth=1;c.beginPath();c.moveTo(n,3);c.lineTo(n-1,22);c.stroke();c.strokeStyle='#e5bb7d55';c.beginPath();c.moveTo(n+3,6);c.lineTo(n+19,5+noise(n)*4);c.stroke();}
  else{for(let row=0;row<2;row++){const px=n+(row?7:0),py=10+row*14+noise(n+row)*4;c.fillStyle=stone?'#d0c4a455':'#c2a47a66';c.beginPath();c.ellipse(px,py,5+noise(n)*4,3+noise(n+1)*3,-.2,0,Math.PI*2);c.fill();}}
 }
 c.restore();
 const rim=c.createLinearGradient(0,-3,0,9);rim.addColorStop(0,wood?'#d1ad76':chapter===3?'#9aad70':'#c3cb8c');rim.addColorStop(1,wood?'#8e6943':chapter===3?'#526d48':'#71824d');
 c.fillStyle=rim;c.beginPath();c.roundRect(-1,-2,w+2,9,3);c.fill();
 if(!wood){for(let n=3;n<w-2;n+=4){const h=2+noise(n)*4;c.strokeStyle=n%3?'#9eaf72':'#d2d5a0';c.lineWidth=.8;c.beginPath();c.moveTo(n,2);c.quadraticCurveTo(n-1,-h/2,n+noise(n+8)*3-1,-h);c.stroke();}}
 else{for(let n=12;n<w;n+=36){c.fillStyle='#594633';c.beginPath();c.arc(n,3,1,0,Math.PI*2);c.fill();}}
 terrainCache.set(key,art);return art;
}
function drawCampaignScene(){
 const chapter=mode==='campaign'?levelIndex:0;
 for(const {x,y,w} of platforms){
  if(platformArtReady){const [sx,sy,sw,sh,dy,h]=platformRegions[chapter===4?2:chapter===2?1:0];ctx.save();ctx.shadowColor='#25332733';ctx.shadowBlur=5;ctx.shadowOffsetY=4;ctx.drawImage(platformImage,sx,sy,sw,sh,x-3,y+dy,w+6,h);ctx.restore();}
  else{const art=terrainArtwork(w,chapter);ctx.drawImage(art,x-12,y-6,w+24,62);}
 }
 if(mode==='campaign'&&currentLevel().knife)drawTower();
}
function timberBeam(x1,y1,x2,y2,width){
 ctx.save();ctx.translate(x1,y1);ctx.rotate(Math.atan2(y2-y1,x2-x1));const length=Math.hypot(x2-x1,y2-y1);
 if(platformArtReady)ctx.drawImage(platformImage,65,655,1610,65,0,-width/2,length,width);
 else rounded(0,-width/2,length,width,1,'#78583d');
 ctx.strokeStyle='#e2c29455';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,-width/2);ctx.lineTo(length,-width/2);ctx.stroke();ctx.restore();
}
function drawTower(){
 ctx.save();ctx.translate(990,GROUND);
 timberBeam(-18,0,-18,-260,11);timberBeam(35,0,35,-260,11);
 timberBeam(-18,-18,35,-110,6);timberBeam(35,-18,-18,-110,6);
 timberBeam(-18,-110,35,-202,6);timberBeam(35,-110,-18,-202,6);
 timberBeam(-40,-254,57,-254,14);
 timberBeam(-35,-260,-35,-296,5);timberBeam(52,-260,52,-296,5);
 // Subdued roof texture belongs to the same wooden structure as its beams.
 ctx.save();ctx.beginPath();ctx.moveTo(-48,-296);ctx.lineTo(8,-326);ctx.lineTo(65,-296);ctx.closePath();ctx.clip();
 const roof=ctx.createLinearGradient(0,-326,0,-296);roof.addColorStop(0,'#9b7852');roof.addColorStop(1,'#4e4236');ctx.fillStyle=roof;ctx.fillRect(-48,-326,114,32);
 ctx.strokeStyle='#c6a57b55';ctx.lineWidth=1;for(let n=-42;n<65;n+=9){ctx.beginPath();ctx.moveTo(n,-325);ctx.lineTo(n+9,-295);ctx.stroke();}ctx.restore();
 drawBandit({x:8,y:-280,dir:-1,bag:0,stun:0},true);ctx.restore();
}
function drawBandit(b,local=false){ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.dir||1,1);const bob=b.stun?3:Math.sin(elapsed*9)*1.5;ctx.translate(0,bob);if(banditArtReady){ctx.drawImage(banditImage,-56,-55,82,75);if(b.bag){drawBasket(-21,-15);carrot(-23,-25,.5);}if(b.stun){ctx.fillStyle='#ffe4a0';ctx.font='20px serif';ctx.fillText('✦',-5,-62);}ctx.restore();return;}oval(-13,4,17,7,'#746253');oval(-5,-5,20,20,'#756b5b');oval(8,-23,17,14,'#aaa18b');oval(0,-35,6,7,'#655f52');oval(20,-34,6,7,'#655f52');rounded(-5,-29,32,10,5,'#302d2b');oval(8,-25,2,2,'#fff2c9');oval(21,-25,2,2,'#fff2c9');oval(25,-19,5,4,'#d1c6a7');oval(28,-21,2,2,'#302d2b');rounded(-16,10,13,7,3,'#504636');rounded(7,10,13,7,3,'#504636');if(b.bag){drawBasket(-21,-15);carrot(-23,-25,.5);}if(b.stun){ctx.fillStyle='#ffe4a0';ctx.font='20px serif';ctx.fillText('✦',-5,-47);}ctx.restore();}
function drawHazards(){if(mode!=='campaign')return;for(const k of knives){ctx.save();if(k.age<1.1){ctx.globalAlpha=.45+Math.sin(elapsed*20)*.25;rounded(k.x-31,k.y-5,62,5,2,'#ff9d38');ctx.fillStyle='#fff0b3';ctx.font='bold 21px sans-serif';ctx.textAlign='center';ctx.fillText('⚠',k.x,k.y-21);ctx.globalAlpha=.35;ctx.strokeStyle='#ffb249';ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(980,180);ctx.lineTo(k.x,k.y-20);ctx.stroke();}const f=Math.max(0,Math.min(1,(k.age-.75)/.35));if(k.age>=.75){const x=980+(k.x-980)*f,y=180+(k.y-180)*f;ctx.translate(x,y-10);ctx.rotate(.55);rounded(-3,-17,6,13,2,'#8c542d');ctx.fillStyle='#e0ece8';ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(5,-4);ctx.lineTo(0,18);ctx.closePath();ctx.fill();}ctx.restore();}for(const b of bandits)drawBandit(b);drawDrops();}

// One-way platforms share the same gravity/collision rules as the rabbits.
function surfaceFor(x,foot){let best=-1,distance=Math.abs(foot-GROUND);platforms.forEach((p,i)=>{const d=Math.abs(foot-p.y);if(x>=p.x-20&&x<=p.x+p.w+20&&d<distance){best=i;distance=d;}});return best;}
function banditTick(b,dt){
 b.vy??=0;b.jumpCd=Math.max(0,(b.jumpCd||0)-dt);b.patrol=(b.patrol||0)-dt;b.stun=Math.max(0,b.stun-dt);
 const targets=players.filter(p=>p.bag>0&&p.x>200&&p.x<920).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y));
 const target=targets[0];
 if(b.patrol<=0){b.destination=Math.floor(rand()*(platforms.length+1))-1;b.patrol=3+rand()*3;}
 const dest=b.bag?-1:target?surfaceFor(target.x,target.y+target.r):b.destination;
 const desired=dest<0?null:platforms[dest];
 const aim=b.bag?930:target?target.x:desired?desired.x+desired.w/2:400+Math.sin(elapsed*.3)*140;
 if(b.stun<=0){
  if(b.grounded){
   const launch=desired?Math.max(desired.x+20,Math.min(desired.x+desired.w-20,aim)):aim;
   const dx=(dest===b.surface?aim:launch)-b.x;
   b.dir=Math.sign(dx)||b.dir;b.vx=Math.abs(dx)>10?b.dir*(target?105:65):0;
   if(dest!==b.surface&&b.jumpCd<=0){
    const rise=desired?b.y+20-desired.y:0;
    if(desired&&rise>=-25&&rise<234&&Math.abs(launch-b.x)<(rise>200?45:100)){
     b.vy=-860;b.grounded=false;b.airAim=launch;b.jumpCd=.65;b.dropThrough=-2;
    }else if(b.surface>=0){b.dropThrough=b.surface;b.grounded=false;b.y+=4;b.vy=40;b.jumpCd=.5;}
   }
  }else{const dx=(b.airAim??aim)-b.x;b.vx=Math.abs(dx)>8?Math.sign(dx)*165:0;if(b.vx)b.dir=Math.sign(b.vx);}
 }else b.vx=0;
 const previousFoot=b.y+20;b.vy+=GRAVITY*dt;b.x=Math.max(235,Math.min(930,b.x+b.vx*dt));b.y+=b.vy*dt;b.grounded=false;
 if(b.y+20>=GROUND){b.y=GROUND-20;b.vy=0;b.grounded=true;b.surface=-1;b.dropThrough=-2;}
 for(let i=0;i<platforms.length;i++){const p=platforms[i];if(i!==b.dropThrough&&b.vy>=0&&previousFoot<=p.y+1&&b.y+20>=p.y&&b.x>p.x-8&&b.x<p.x+p.w+8){b.y=p.y-20;b.vy=0;b.grounded=true;b.surface=i;b.dropThrough=-2;}}
 if(b.stun>0)return;
 if(b.bag&&b.x>=925&&b.grounded&&b.surface===-1){b.escape+=dt;if(b.escape>2){for(let i=0;i<b.bag;i++)addCarrot(480+rand()*180,80);b.bag=0;b.escape=0;b.x=810;float('仓库的萝卜又出现了',700,150);}}
 for(const p of players){
  if(Math.abs(p.x-b.x)>34||Math.abs(p.y-b.y)>48)continue;
  if(p.vy>50&&p.prevY<b.y-25){p.vy=-410;p.grounded=false;b.stun=2.5;b.vx=0;for(let i=0;i<b.bag;i++)addCarrot(b.x,b.y-15,(rand()-.5)*150,-240);b.bag=0;b.escape=0;burst(b.x,b.y,'#ebc56d',8);float('强盗晕倒了！',b.x,b.y-55);sound('stomp');break;}
  if(p.invuln<=0){const n=Math.min(p.bag,2);p.bag-=n;b.bag+=n;hurt(p,p.x<b.x?-1:1);}
 }
}
function makeDrop(kind,x){return{kind,x,y:-25,vy:0,age:0,warning:.9,landed:false,fuse:1.1,life:13,exploded:false};}
function dropTick(dt){
 if(levelIndex<2)return;
 dropClock-=dt;if(dropClock<=0){dropClock=levelIndex===4?4+rand()*2:5+rand()*3;const roll=rand();drops.push(makeDrop(roll<.35?'speed':roll<.7?'double':'bomb',245+rand()*620));}
 for(const d of drops){
  d.age+=dt;d.warning=Math.max(0,d.warning-dt);if(d.warning>0)continue;
  if(d.exploded){d.life-=dt;continue;}
  if(!d.landed){const prev=d.y+13;d.vy+=700*dt;d.y+=d.vy*dt;let floor=GROUND;for(const plat of platforms)if(prev<=plat.y+1&&d.y+13>=plat.y&&d.x>plat.x&&d.x<plat.x+plat.w)floor=Math.min(floor,plat.y);if(d.y+13>=floor){d.y=floor-13;d.landed=true;d.vy=0;}}
  if(d.kind==='bomb'){
   if(d.landed){d.fuse-=dt;if(d.fuse<=0){d.exploded=true;d.life=.35;shake=.2;burst(d.x,d.y,'#e6a859',18);sound('stomp');for(const p of players){if(p.invuln>0||Math.hypot(p.x-d.x,p.y-12-d.y)>85)continue;const lost=Math.min(4,p.bag);p.bag-=lost;p.invuln=1.6;p.stun=.3;p.vy=-240;p.grounded=false;p.vx=(p.x<d.x?-1:1)*145;float(lost?`炸弹 −${lost} 根`:'躲开炸弹！',p.x,p.y-55,'#ab563c');}}}
  }else{
   d.life-=dt;
   for(const p of players)if(p.stun<=0&&Math.hypot(p.x-d.x,p.y-15-d.y)<34){if(d.kind==='speed')p.speedBuff=8;else p.doubleBuff=8;d.life=0;float(d.kind==='speed'?'加速靴 · 8秒':'双倍收菜 · 8秒',p.x,p.y-65,'#647943');sound('bank');break;}
  }
 }
 drops=drops.filter(d=>d.life>0);
}
function drawDrops(){
 for(const d of drops){ctx.save();
  if(d.exploded){ctx.globalAlpha=Math.max(0,d.life/.35)*.35;oval(d.x,d.y,85,65,'#ffb653');ctx.restore();continue;}
  if(d.warning>0){ctx.globalAlpha=.65+Math.sin(elapsed*15)*.25;rounded(d.x-36,80,72,24,5,d.kind==='bomb'?'#a45a38':'#5d8260');ctx.fillStyle='#fff1cc';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(d.kind==='bomb'?'⚠ 炸弹 ↓':'工具 ↓',d.x,96);ctx.restore();continue;}
  ctx.translate(d.x,d.y);
  if(d.kind==='bomb'){
   if(d.landed){ctx.globalAlpha=.1+.08*Math.sin(elapsed*18);oval(0,8,85,22,'#fa9a41');ctx.globalAlpha=1;}
   oval(0,1,12,12,d.landed&&Math.sin(elapsed*18)>0?'#b56542':'#403b36');rounded(-4,-15,8,6,2,'#9e8a58');ctx.strokeStyle='#d7b97c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-14);ctx.quadraticCurveTo(7,-25,13,-17);ctx.stroke();ctx.fillStyle='#ffe77d';ctx.fillRect(11,-21,5,5);oval(-4,-3,3,3,'#8e8980');
  }else{
   ctx.shadowColor=d.kind==='speed'?'#8fdbb1':'#f4cf69';ctx.shadowBlur=12;rounded(-15,-15,30,30,6,d.kind==='speed'?'#50876d':'#c18c42');ctx.shadowBlur=0;ctx.strokeStyle='#ffedba';ctx.lineWidth=1.5;ctx.strokeRect(-12,-12,24,24);ctx.fillStyle='#fff4cb';
   if(d.kind==='speed'){ctx.beginPath();ctx.moveTo(-7,-8);ctx.lineTo(1,-8);ctx.lineTo(1,1);ctx.lineTo(8,4);ctx.lineTo(8,9);ctx.lineTo(-7,9);ctx.closePath();ctx.fill();}else{ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('2×',0,5);}
  }
  ctx.restore();
 }
}
