'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=1120,H=520,GROUND=442,GRAVITY=1550;
const ui=id=>document.getElementById(id);
const keys=new Set();
const platforms=[{x:247,y:275,w:178,h:19},{x:710,y:275,w:168,h:19},{x:436,y:174,w:250,h:20}];
let players=[],carrots=[],particles=[],floats=[],state='ready',remaining=90,spawnTimer=0,elapsed=0,last=0,muted=false,audioCtx;
let hitStop=0,shake=0,bankFlights=[],lastCountdown=90;
let seed=8472;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function oval(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function tone(freq=400,len=.08,type='square',vol=.025,delay=0,endFreq=freq*.7){if(muted)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+len);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+len);}catch{}}
// A quick, bright two-note sparkle for each carrot.
function pickupSound(){
 if(muted)return;
 try{
  audioCtx??=new(window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const t=audioCtx.currentTime;
  for(const [frequency,delay,volume,duration] of [[1047,0,.045,.09],[1568,.035,.028,.12]]){
   const o=audioCtx.createOscillator(),g=audioCtx.createGain(),start=t+delay;
   o.type='sine';o.frequency.setValueAtTime(frequency,start);
   g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.006);
   g.gain.exponentialRampToValueAtTime(.0001,start+duration);
   o.connect(g);g.connect(audioCtx.destination);o.start(start);o.stop(start+duration+.01);
  }
 }catch{}
}
function sound(event,pitch=0){if(event==='pickup')pickupSound();if(event==='bag-full'){tone(784,.15,'sine',.035,.035,784);tone(1047,.22,'sine',.028,.12,1047);}if(event==='jump')tone(160,.1,'triangle',.04,0,400);if(event==='land')tone(75,.06,'triangle',.025);if(event==='throw')tone(440,.09,'triangle',.025,0,140);if(event==='stomp'){tone(110,.13,'triangle',.08,0,30);tone(650,.07,'square',.025,.035,200);tone(400,.08,'square',.018,.1,160);}if(event==='bank'){[660,880,1320].forEach((f,i)=>tone(f,.16,'triangle',.055,i*.075,f));}if(event==='end'){[523,659,784,1047].forEach((f,i)=>tone(f,.24,'square',.025,i*.13,f));}}
function makePlayer(id){return{id,x:id?985:135,y:GROUND-21,prevY:GROUND-21,vx:0,vy:0,r:21,grounded:true,bag:0,score:0,dir:id?-1:1,stun:0,invuln:0,coyote:.1,jumpBuffer:0,dropCd:0,squash:0,stride:0,stepIndex:0,stepCooldown:0,dustCooldown:0,wasMoving:false,gait:0,gaitWeight:0,airTuck:0,speedBuff:0,doubleBuff:0,visualDir:id?-1:1,turnTime:0,lean:0};}
function addCarrot(x,y,vx=0,vy=0,lock=-1,delay=0){carrots.push({x,y,vx,vy,lock,delay,angle:rand()*.4-.2,age:0});}
function reset(){campaignSetup();players=[makePlayer(0),makePlayer(1)];carrots=[];particles=[];floats=[];remaining=mode==='campaign'?currentLevel().time:90;elapsed=0;spawnTimer=0;hitStop=0;shake=0;bankFlights=[];lastCountdown=90;for(let i=0;i<11;i++)addCarrot(330+i*42,GROUND-10);for(const plat of platforms)for(let i=0;i<3;i++)addCarrot(plat.x+25+i*(plat.w-50)/2,plat.y-10);updateHUD();}
function overlay(title,text,button,hint){ui('modalTitle').textContent=title;ui('modalText').innerHTML=text;ui('play').textContent=button;ui('modalHint').textContent=hint;ui('start-controls').classList.toggle('hidden',state!=='ready');ui('overlay').classList.remove('hidden');}
function start(){if(state==='entering'){finishEntry();return;}if(state==='won'){resultAction();return;}if(state==='home'||state==='map')return;if(state==='paused'){state='playing';}else if(mode==='campaign'){enterLevel();return;}else{reset();state='playing';}keys.clear();ui('overlay').classList.add('hidden');canvas.focus();ui('pause').textContent='暂停';tone(620,.12);last=performance.now();}
function pause(){if(state==='playing'){state='paused';ui('pause').textContent='继续';keys.clear();overlay('先歇一小会儿','胡萝卜都替你们看好了。<br>准备好后继续冒险。','继续抢菜 ↗','P / Esc 也可以继续');}else if(state==='paused')start();}
function float(text,x,y,color='#4f6c43'){floats.push({text,x,y,life:1.3,color});}
function burst(x,y,color,count=12){for(let i=0;i<count;i++)particles.push({x,y,vx:(rand()-.5)*220,vy:-rand()*220,life:.45+rand()*.3,color,r:2+rand()*3});}
function spill(p,count){for(let i=0;i<count;i++)addCarrot(p.x+(rand()-.5)*18,p.y-15,(rand()-.5)*360,-200-rand()*200,p.id,.9);p.bag-=count;}
function end(){if(mode==='campaign'){state='ended';updateHUD();showResult(false);return;}state='ended';keys.clear();const[a,b]=players;const tie=a.score===b.score;overlay(tie?'平分秋色，谁也不服！':`${a.score>b.score?'奶油兔':'灰灰兔'}，菜园新霸主！`,`奶油兔存入 <b>${a.score}</b> 根 · 灰灰兔存入 <b>${b.score}</b> 根<br>${tie?'再来一局，这次一定分个高下。':'友谊还在吗？再抢一局就知道了。'}`,'再抢一局 ↻','只统计存进兔子洞的胡萝卜');sound('end');}
function updateHUD(){for(const p of players){ui('score'+p.id).textContent=p.score;ui('bag'+p.id).textContent=p.bag;}if(mode==='campaign'){const total=players.reduce((s,p)=>s+p.score,0);ui('harvest').textContent=`${total} / ${currentLevel().target}`;ui('harvest-bar').style.width=Math.min(100,total/currentLevel().target*100)+'%';}let t=Math.ceil(remaining);ui('time').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;ui('status').textContent=remaining<=15?'✦ 最后冲刺！快把胡萝卜带回家':'✦ 只算带回洞里的胡萝卜';}
function movementFeedback(p,dt,axis){
 const speed=Math.abs(p.vx),moving=p.grounded&&speed>24&&p.stun<=0;
 p.dustCooldown=Math.max(0,p.dustCooldown-dt);p.stepCooldown=Math.max(0,p.stepCooldown-dt);
 if(moving){p.stride+=speed*dt/70;const step=Math.floor(p.stride);
 if(step!==p.stepIndex){p.stepIndex=step;if(p.stepCooldown<=0){tone(85+rand()*40,.035,'triangle',.012,0,55);p.stepCooldown=.09;}for(let i=0;i<3;i++)particles.push({x:p.x-p.dir*17,y:p.y+p.r-2,vx:-p.dir*(20+rand()*35),vy:-12-rand()*22,life:.24+rand()*.13,maxLife:.4,color:'#e8d4ad',r:3+rand()*4,dust:true});}
 const braking=axis===0||Math.sign(p.vx)!==axis;
 if(braking&&speed>75&&p.dustCooldown===0){p.dustCooldown=.07;for(let i=0;i<4;i++)particles.push({x:p.x+p.dir*8,y:p.y+p.r-2,vx:-p.dir*(35+rand()*55),vy:-10-rand()*25,life:.3+rand()*.15,maxLife:.45,color:'#ecdab7',r:4+rand()*5,dust:true});}
 }
 const target=moving?Math.min(1,speed/175):0;
 p.gaitWeight+=(target-p.gaitWeight)*(1-Math.exp(-dt*12));
 // One paired bound per travelled stride; no walking cycle in mid-air.
 if(moving)p.gait=p.stride*Math.PI*2;
 const tuck=p.grounded?0:Math.max(0,Math.min(1,(250-p.vy)/650));
 p.airTuck+=(tuck-p.airTuck)*(1-Math.exp(-dt*20));
 const facing=Math.abs(p.vx)>35?Math.sign(p.vx):p.dir;
 if(facing!==p.visualDir&&p.turnTime<=0){p.turnTime=.14;p.nextDir=facing;}
 if(p.turnTime>0){p.turnTime=Math.max(0,p.turnTime-dt);if(p.turnTime<.07)p.visualDir=p.nextDir;}
 p.lean+=((p.vx/240)*.055-p.lean)*(1-Math.exp(-dt*9));
 p.wasMoving=moving;
}
function tick(dt){elapsed+=dt;remaining=Math.max(0,remaining-dt);const countdown=Math.ceil(remaining);if(countdown<=10&&countdown!==lastCountdown){tone(countdown<=3?700:430,.045,'triangle',.035);lastCountdown=countdown;}for(const f of bankFlights)f.life-=dt;bankFlights=bankFlights.filter(f=>f.life>0);if(remaining===0){end();return;}
 spawnTimer-=dt;if(spawnTimer<=0){spawnTimer=.85;if(carrots.length<35){let x=420+rand()*280;addCarrot(x,65,(rand()-.5)*45,0);}}
 for(const p of players){p.prevY=p.y;p.speedBuff=Math.max(0,p.speedBuff-dt);p.doubleBuff=Math.max(0,p.doubleBuff-dt);p.stun=Math.max(0,p.stun-dt);p.invuln=Math.max(0,p.invuln-dt);p.dropCd=Math.max(0,p.dropCd-dt);p.squash=Math.max(0,p.squash-dt*4);p.coyote=p.grounded?.1:p.coyote-dt;p.jumpBuffer-=dt;
 const left=keys.has(p.id?'ArrowLeft':'KeyA'),right=keys.has(p.id?'ArrowRight':'KeyD');
 const axis=p.stun>0?0:Number(right)-Number(left);const speed=(205-p.bag*6)*(p.speedBuff>0?1.5:1);
 if(p.stun<=0){p.vx+=(axis*speed-p.vx)*Math.min(1,dt*(p.grounded?15:8));if(axis)p.dir=axis;}
 else p.vx*=Math.pow(.15,dt);
 if(p.jumpBuffer>0&&p.coyote>0&&p.stun<=0){p.vy=-(760-p.bag*12);p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.squash=0;sound('jump');burst(p.x,p.y+21,'#e4c58b',5);}
 if(keys.has(p.id?'ArrowDown':'KeyS')&&p.bag>0&&p.dropCd<=0&&p.stun<=0){p.bag--;addCarrot(p.x+p.dir*27,p.y-10,p.dir*220,-180,p.id,.8);p.dropCd=.25;sound('throw');burst(p.x,p.y+15,'#d1ae6f',3);}
 p.vy+=GRAVITY*dt;const impactSpeed=p.vy;p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=Math.max(24,Math.min(W-24,p.x));p.grounded=false;
 if(p.y+p.r>=GROUND){p.y=GROUND-p.r;p.vy=0;p.grounded=true;}
 for(const plat of platforms)if(p.vy>=0&&p.prevY+p.r<=plat.y+2&&p.y+p.r>=plat.y&&p.x+p.r*.65>plat.x&&p.x-p.r*.65<plat.x+plat.w){p.y=plat.y-p.r;p.vy=0;p.grounded=true;}
 if(p.grounded&&impactSpeed>160){p.squash=Math.min(.85,impactSpeed/850);burst(p.x,p.y+p.r,'#e4c58b',5);sound('land');}
 movementFeedback(p,dt,axis);
 const home=mode==='campaign'?(p.x<160||p.x>960):(p.id?p.x>960:p.x<160);if(home&&p.grounded&&p.y>390&&p.bag>0){const n=p.bag;p.score+=n;p.bag=0;float(`+${n} 入库！`,p.x,p.y-47);burst(p.x,p.y-15,'#f5bb51',16);sound('bank');for(let i=0;i<n;i++)bankFlights.push({x:p.x,y:p.y-25,tx:mode==='campaign'?(p.x>560?1010:110):(p.id?1010:110),ty:430,life:.55+i*.045,total:.55+i*.045});ui('score'+p.id).classList.remove('pop');void ui('score'+p.id).offsetWidth;ui('score'+p.id).classList.add('pop');}
 }
 const[a,b]=players;for(const [top,bottom] of [[a,b],[b,a]]){if(bottom.invuln<=0&&top.stun<=0&&Math.abs(top.x-bottom.x)<36&&top.vy>70&&top.prevY<bottom.prevY-27&&top.y+top.r>=bottom.y-18&&top.y<bottom.y-12){if(mode==='campaign'){top.vy=-480;top.grounded=false;top.y=bottom.y-45;float('借力一跳！',top.x,top.y-40);continue;}const n=bottom.bag;spill(bottom,n);bottom.stun=.65;bottom.invuln=1.65;bottom.vx=top.x<bottom.x?165:-165;top.vy=-440;top.y=bottom.y-44;bottom.squash=2.6;hitStop=.05;shake=.22;float(n?`掉了 ${n} 根！`:'踩中了！',bottom.x,bottom.y-45,'#d17a45');burst(bottom.x,bottom.y,'#f0bd66');sound('stomp');}}
 if(Math.abs(a.x-b.x)<36&&Math.abs(a.y-b.y)<30){const overlap=(36-Math.abs(a.x-b.x))/2;const sign=a.x<b.x?-1:1;a.x+=sign*overlap;b.x-=sign*overlap;}
 for(let i=carrots.length-1;i>=0;i--){const c=carrots[i];c.age+=dt;c.delay=Math.max(0,c.delay-dt);const prevY=c.y;c.vy+=GRAVITY*.7*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=Math.pow(.4,dt);if(c.x<18||c.x>W-18){c.x=Math.max(18,Math.min(W-18,c.x));c.vx*=-.5;}let floor=GROUND-9;for(const plat of platforms)if(c.vy>=0&&prevY<=plat.y-7&&c.y>=plat.y-7&&c.x>plat.x&&c.x<plat.x+plat.w)floor=Math.min(floor,plat.y-7);if(c.y>=floor){c.y=floor;c.vy=Math.abs(c.vy)>80?-c.vy*.28:0;c.vx*=.9;}
 for(const p of players)if(p.stun<=0&&p.bag<8&&!(c.lock===p.id&&c.delay>0)&&Math.hypot(c.x-p.x,c.y-(p.y+4))<32){const gain=Math.min(8-p.bag,p.doubleBuff>0?2:1);p.bag+=gain;if(gain===2)float('双倍 +2',c.x,c.y-20,'#82633b');carrots.splice(i,1);burst(c.x,c.y,'#eaa44d',3);sound('pickup',p.bag);if(p.bag===8){sound('bag-full');float('装满啦，回家！',p.x,p.y-57,'#b97a30');}break;}}
 hazardTick(dt);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.dust?-15:700)*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);for(const f of floats){f.y-=28*dt;f.life-=dt;}floats=floats.filter(f=>f.life>0);updateHUD();if(mode==='campaign'&&players.reduce((s,p)=>s+p.score,0)>=currentLevel().target)winLevel();}
// High-resolution artwork; physics stays in the same logical coordinate space.
const gardenImage=new Image(),rabbitImage=new Image(),rigImage=new Image();let assetsReady=false,rigReady=false;
gardenImage.src='assets/scene-garden-v2.png';rabbitImage.src='assets/rabbits-hd.png';rigImage.src='assets/rabbits-rig.png';rigImage.decode().then(()=>{rigReady=true;}).catch(()=>{});
Promise.all([gardenImage.decode(),rabbitImage.decode()]).then(()=>{assetsReady=true;ui('loading').classList.add('hidden');}).catch(()=>{ui('loading').textContent='场景加载失败，请刷新重试';});
function carrot(x,y,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.shadowColor='#30482755';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
ctx.fillStyle='#cd6829';ctx.beginPath();ctx.moveTo(-6,-6);ctx.bezierCurveTo(-10,-2,-5,7,0,14);ctx.bezierCurveTo(5,8,10,-4,6,-7);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#ffa94e';ctx.beginPath();ctx.moveTo(-4,-5);ctx.quadraticCurveTo(-6,0,0,10);ctx.quadraticCurveTo(3,-3,4,-5);ctx.fill();ctx.strokeStyle='#a85125';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(0,1);ctx.moveTo(3,5);ctx.lineTo(1,6);ctx.stroke();ctx.strokeStyle='#39713a';ctx.lineCap='round';ctx.lineWidth=3;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(0,-6);ctx.quadraticCurveTo(i*3,-13,i*6,-16);ctx.stroke();}ctx.strokeStyle='#71a64e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,-15);ctx.stroke();ctx.restore();}
const rigBounds=[[[138, 23, 412, 478], [703, 182, 161, 263], [1117, 128, 283, 329]], [[138, 521, 411, 470], [702, 658, 162, 266], [1116, 609, 284, 329]]];
function rigPart(p,part,x,y,w,h,angle=0,opacity=1){const [sx,sy,sw,sh]=rigBounds[p.id][part];ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=opacity;ctx.drawImage(rigImage,sx,sy,sw,sh,-w/2,0,w,h);ctx.restore();}
function drawBasket(x,y){ctx.save();ctx.translate(x,y);ctx.rotate(-.12);rounded(-10,-6,19,23,4,'#76502e');rounded(-8,-5,15,20,3,'#ba8a4e');ctx.strokeStyle='#795631';ctx.lineWidth=.7;for(let i=-6;i<8;i+=3){ctx.beginPath();ctx.moveTo(i,-4);ctx.lineTo(i,14);ctx.stroke();}for(let j=-2;j<15;j+=4){ctx.beginPath();ctx.moveTo(-8,j);ctx.lineTo(7,j+1);ctx.stroke();}rounded(-10,-7,20,4,2,'#d3a568');ctx.restore();}
function bunny(p){const footY=p.y+p.r;
ctx.save();ctx.globalAlpha=p.grounded?.15:.07;oval(p.x,footY+1,22,3.2,'#35412d');ctx.restore();ctx.save();ctx.translate(p.x,footY);
if(p.invuln>0&&Math.floor(p.invuln*12)%2===0)ctx.globalAlpha=.5;
const turning=p.turnTime>0?1-Math.sin(p.turnTime/.14*Math.PI)*.3:1;
const weight=p.gaitWeight,cycle=(1-Math.cos(p.gait))*.5;
const bound=p.grounded?cycle*weight:0,tuck=p.airTuck;
const squ=p.squash*.13,stretch=p.grounded?bound*.025:tuck*.035;
ctx.scale((1+squ-stretch)*p.visualDir*turning,1-squ+stretch);
const breathe=Math.sin(elapsed*2.8+p.id)*.3*(1-weight);
const bob=p.grounded?-bound*3+breathe:-1;
if(rigReady){
 // Both hind paws push and recover together. Short poses follow velocity,
 // so a buffered jump or early release never waits for an animation clip.
 const push=Math.sin(p.gait)*weight*(p.grounded?1:0);
 const hindX=-3-push*4+tuck*7,hindY=-bound*4-tuck*11;
 const foreX=12+push*2-tuck*5,foreY=-12-bound*2-tuck*9;
 const limb=(part,hx,hy,fx,fy,w,alpha=1)=>{
  const length=Math.hypot(fx-hx,fy-hy);
  rigPart(p,part,hx,hy,w,length,Math.atan2(fy-hy,fx-hx)-Math.PI/2,alpha);
 };
 limb(2,-8,-24+bob,hindX-4,hindY-1,19,.85);
 limb(1,7,-38+bob,foreX-3,foreY-2,12,.85);
 ctx.save();ctx.translate(0,bob);ctx.rotate(p.lean*p.visualDir);
 rigPart(p,0,0,-79,54,64);
 drawBasket(-19,-33);
 for(let i=0;i<Math.min(p.bag,5);i++)carrot(-23+(i%3)*5,-42-Math.floor(i/3)*5,.43,(i-2)*.13);
 ctx.restore();
 limb(2,-3,-24+bob,hindX+3,hindY,20);
 limb(1,11,-38+bob,foreX+2,foreY,13);
}else if(assetsReady){const half=rabbitImage.naturalWidth/2;ctx.drawImage(rabbitImage,p.id*half,0,half,rabbitImage.naturalHeight,-43,-76,86,79);}
if(p.stun>0){ctx.fillStyle='#f6d57c';ctx.font='bold 16px Georgia';ctx.fillText('✦',Math.sin(elapsed*15)*18,-84);ctx.fillText('✧',-Math.sin(elapsed*15)*20,-73);}ctx.restore();
ctx.textAlign='center';ctx.font='bold 9px sans-serif';ctx.fillStyle=p.id?'#435f66':'#825425';ctx.shadowColor='#fff8df';ctx.shadowBlur=3;ctx.fillText(`P${p.id+1}${p.bag?' · '+p.bag:''}`,p.x,footY-87);ctx.shadowBlur=0;const effects=[p.speedBuff>0?`加速 ${Math.ceil(p.speedBuff)}s`:'',p.doubleBuff>0?`双倍 ${Math.ceil(p.doubleBuff)}s`:''].filter(Boolean);if(effects.length){ctx.font='bold 10px sans-serif';ctx.fillStyle='#fff6d4';const label=effects.join(' · ');rounded(p.x-52,footY-111,104,17,5,'#526a43');ctx.fillStyle='#fff6d4';ctx.fillText(label,p.x,footY-99);}}
function render(){ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.save();if(canvas.style)canvas.style.transform=shake>0?`translate(${Math.sin(shake*170)*shake*8}px,${Math.cos(shake*140)*shake*5}px)`:'';
if(!assetsReady){ctx.fillStyle='#a7ced0';ctx.fillRect(0,0,W,H);}
drawCampaignScene();
// Burrow landing zones align with the doors in the environment.
for(const p of players){if(p.bag&&p.grounded&&((p.id&&p.x>910)||(!p.id&&p.x<210))){ctx.save();ctx.globalAlpha=.22+Math.sin(elapsed*5)*.08;oval(p.id?1010:110,GROUND-3,46,5,'#ffe3a0');ctx.restore();}}
for(const c of carrots){ctx.save();ctx.globalAlpha=.12;oval(c.x,c.y+13,7,2,'#34492c');ctx.restore();carrot(c.x,c.y,.9,c.angle+(Math.abs(c.vx)>10?elapsed*c.vx*.02:Math.sin(elapsed*2+c.x)*.035));}drawHazards();for(const p of players){if(state==='won'&&resultPending){const y=p.y;p.y-=Math.abs(Math.sin(resultClock*9+p.id)) * 12;bunny(p);p.y=y;}else bunny(p);}
for(const f of bankFlights){const t=1-f.life/f.total;carrot(f.x+(f.tx-f.x)*t,f.y+(f.ty-f.y)*t-Math.sin(t*Math.PI)*65,.7,t*4);}
for(const p of particles){ctx.globalAlpha=p.dust?Math.min(.36,p.life/p.maxLife*.36):Math.min(1,p.life*3);ctx.fillStyle=p.color;if(p.dust){const size=p.r*(1+(1-p.life/p.maxLife)*.8);oval(p.x,p.y,size,size*.55,p.color);}else ctx.fillRect(p.x,p.y,p.r,p.r);}ctx.globalAlpha=1;
for(const f of floats){ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fff7df';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
if(remaining<=10&&state==='playing'){ctx.fillStyle='#9e5630';ctx.font='bold 28px Georgia';ctx.textAlign='center';ctx.strokeStyle='#fff0cd';ctx.lineWidth=4;ctx.strokeText(Math.ceil(remaining),W/2,128);ctx.fillText(Math.ceil(remaining),W/2,128);}drawCelebration();ctx.restore();}
function frame(now){const dt=Math.min((now-last)/1000||0,.033);last=now;const previousState=state;cinematicTick(dt);if(previousState===state&&state==='playing'&&assetsReady){shake=Math.max(0,shake-dt);if(hitStop>0)hitStop=Math.max(0,hitStop-dt);else tick(dt);}if(state!=='map'&&state!=='home')render();requestAnimationFrame(frame);}
const gameKeys=['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyP','Escape'];
window.addEventListener('keydown',e=>{if(!gameKeys.includes(e.code))return;e.preventDefault();if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape'){if(state==='entering')finishEntry();else pause();return;}if(e.code==='Space'&&(state==='ready'||state==='ended'||state==='paused'||state==='won'||state==='entering')){start();return;}keys.add(e.code);if(state==='playing'){if(e.code==='KeyW')players[0].jumpBuffer=.12;if(e.code==='ArrowUp')players[1].jumpBuffer=.12;}});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(gameKeys.includes(e.code))e.preventDefault();if(e.code==='KeyW'&&players[0].vy< -230)players[0].vy=-230;if(e.code==='ArrowUp'&&players[1].vy< -230)players[1].vy=-230;});
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
ui('pause').onclick=()=>{pause();ui('pause').textContent=state==='paused'?'继续':'暂停';};ui('fullscreen').onclick=()=>{const arena=ui('arena');if(!document.fullscreenElement)arena.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.();};ui('play').onclick=start;ui('restart').onclick=()=>{if(mode==='campaign')openLevel(levelIndex);else{reset();state='ready';keys.clear();overlay('新一轮，重新交朋友','把胡萝卜带回自己一侧的兔子洞。<br>从上方踩中对方，就能抢走他的收获！','开始抢菜 ↗','90 秒一局 · 共用一个键盘');}};ui('sound').onclick=()=>{muted=!muted;ui('sound').textContent=`音效：${muted?'关':'开'}`;};
reset();showHome();requestAnimationFrame(frame);
