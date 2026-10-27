'use strict';
const canvas=document.getElementById('study'),ctx=canvas.getContext('2d'),art=new Image();
const ui=id=>document.getElementById(id);let bounds=[],ready=false,time=0,playing=true,last=0,once=false;
const poses=[
// time, body drop, body pitch, fore paw x/y, hind paw x/y, torso scale x/y, head pitch
[0,0,0,27,0,-29,0,1,1,0],
[.16,8,.07,24,0,-18,0,1.07,.86,-.07],
[.27,-2,-.17,17,-25,-45,0,1.07,.97,.07],
[.4,0,-.13,40,-19,-47,-4,1.15,.91,.06],
[.66,0,-.03,20,-16,-12,-12,.98,1.02,-.02],
[.84,0,.08,37,3,-12,-15,1.04,.98,-.05],
[1.02,2,.13,40,0,-10,-8,1.06,.97,-.1],
[1.13,9,.08,32,0,-22,0,1.1,.86,-.06],
[1.3,2,0,27,0,-29,0,1,1,0],
[1.48,0,0,27,0,-29,0,1,1,0],
[1.8,0,0,27,0,-29,0,1,1,0]];
const phases=[['伏低蓄力','身体压低，后腿收在身下'],['后腿蹬伸','后腿向后蹬开，身体向前上方展开'],['身体展开','身体前伸，后腿在蹬地后逐渐回收'],['空中收腿','前爪与后腿向腹下收拢'],['前爪落地','前爪向前下方伸出，准备支撑身体'],['后腿跟进','后腿跟进落地，身体压低吸收冲击']];
function poseAt(t){let i=0;while(i<poses.length-2&&t>poses[i+1][0])i++;const a=poses[i],b=poses[i+1],f=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))),u=f*f*(3-2*f);return a.map((n,j)=>j?n+(b[j]-n)*u:t);}
function trajectory(t){const f=Math.max(0,Math.min(1,(t-.25)/.77));return{x:250+400*f,y:4*126*f*(1-f)};}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function part(i,x,y,w,h,angle=0,alpha=1,anchor=.5){const[sx,sy,sw,sh]=bounds[i];ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.drawImage(art,sx,sy,sw,sh,-w*anchor,0,w,h);ctx.restore();}
function limb(i,hx,hy,fx,fy,w,alpha=1){const len=Math.hypot(fx-hx,fy-hy);part(i,hx,hy,w,len,Math.atan2(fy-hy,fx-hx)-Math.PI/2,alpha,.45);}
function drawRabbit(t){const p=poseAt(t),path=trajectory(t),foot=412-path.y;ctx.save();ctx.globalAlpha=.15-path.y*.00045;ellipse(path.x,414,42-path.y*.1,5,'#526a47');ctx.restore();ctx.save();ctx.translate(path.x,foot);ctx.scale(1.6,1.6);const drop=p[1];
// Far limbs are offset only slightly; paired hindlegs propel together.
limb(3,-28,-30+drop,p[5]-4,p[6]-1,36,.75);
limb(2,16,-32+drop,p[3]-4,p[4]-1,16,.75);
ctx.save();ctx.translate(-8,-56+drop);ctx.rotate(p[2]);ctx.scale(p[7],p[8]);part(0,0,0,77,43,0,1,.5);ctx.restore();
ctx.save();ctx.translate(22,-66+drop);ctx.rotate(p[2]*.55+p[9]);part(1,0,-32,65,61,0,1,.5);ctx.restore();
limb(3,-24,-29+drop,p[5]+3,p[6],37);
limb(2,20,-32+drop,p[3]+2,p[4],17);
ctx.restore();
// Small, restrained landing dust follows foot contact.
if(t>1.02&&t<1.42){let f=(t-1.02)/.4;ctx.save();ctx.globalAlpha=(1-f)*.3;for(let i=0;i<5;i++)ellipse(trajectory(1.02).x+20+(i-2)*f*21,412-f*14,3+f*7,2+f*3,'#b9b18a');ctx.restore();}}
function render(){ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,1000,500);ctx.fillStyle='#c9d4ad';ctx.fillRect(0,414,1000,86);ctx.fillStyle='#a2b489';ctx.fillRect(0,413,1000,2);for(let x=25;x<1000;x+=31){ctx.strokeStyle='#a4b78b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,414);ctx.lineTo(x+3,407-(x%7));ctx.stroke();}ctx.setLineDash([3,7]);ctx.strokeStyle='#c2cebc';ctx.beginPath();ctx.moveTo(245,412);ctx.quadraticCurveTo(450,160,655,412);ctx.stroke();ctx.setLineDash([]);if(ready)drawRabbit(time);const idx=time<.23?0:time<.35?1:time<.57?2:time<.82?3:time<1.09?4:5;ui('phase').textContent=phases[idx][0];ui('description').textContent=phases[idx][1];document.querySelectorAll('.steps button').forEach((b,i)=>b.classList.toggle('active',i===idx));}
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(ready&&playing){time+=dt*Number(ui('speed').value);if(time>=1.8){if(once){time=1.8;playing=false;ui('play').textContent='播放';}else time=0;}ui('scrub').value=time;}render();requestAnimationFrame(frame);}
ui('play').onclick=()=>{playing=!playing;if(time>=1.8)time=0;ui('play').textContent=playing?'暂停':'播放';};ui('again').onclick=()=>{time=0;playing=true;once=true;ui('play').textContent='暂停';};ui('scrub').oninput=e=>{time=Number(e.target.value);playing=false;ui('play').textContent='播放';};document.querySelectorAll('.steps button').forEach(b=>b.onclick=()=>{time=Number(b.dataset.t);ui('scrub').value=time;playing=false;ui('play').textContent='播放';});document.addEventListener('visibilitychange',()=>{last=performance.now();});
Promise.all([fetch('assets/jump-rig.json').then(r=>{if(!r.ok)throw Error('bounds');return r.json();}),new Promise((resolve,reject)=>{art.onload=resolve;art.onerror=reject;art.src='assets/rabbit-jump-rig.png';})]).then(([b])=>{bounds=b;ready=true;ui('loading').style.display='none';}).catch(()=>{ui('loading').textContent='素材暂未加载，请刷新页面重试';});requestAnimationFrame(frame);
