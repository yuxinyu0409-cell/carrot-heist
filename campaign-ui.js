'use strict';
ui('map-button').onclick=()=>{if(mode==='versus'&&state!=='home'){showHome();return;}selection=levelIndex;showMap();};
ui('modal-map').onclick=()=>{if(mode==='versus'){showHome();return;}selection=levelIndex;showMap();};
ui('map-start').onclick=()=>openLevel(selection);
function openVersus(){clearPresentation();mode='versus';ui('world-map').classList.add('hidden');ui('game-view').classList.remove('hidden');ui('pause').disabled=false;ui('restart').disabled=false;reset();state='ready';overlay('竞争模式 · 菜园争夺战','各自把萝卜存回自己一侧的兔洞。<br>从上方踩中对方，抢走他的收获！','开始竞争 ↗','90 秒一局 · 存入更多萝卜的一方获胜 · 同分则平局');}
ui('versus-button').onclick=openVersus;
// Touch controls also support keyboard-free play; pointer capture prevents stuck keys.
for(const button of document.querySelectorAll('[data-key]')){
 const release=()=>{keys.delete(button.dataset.key);button.classList.remove('pressed');};
 button.onpointerdown=e=>{e.preventDefault();if(state!=='playing')return;button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);button.classList.add('pressed');if(button.dataset.key==='KeyW')players[0].jumpBuffer=.12;if(button.dataset.key==='ArrowUp')players[1].jumpBuffer=.12;};
 button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
}

ui('home-button').onclick=showHome;
ui('home-start').onclick=()=>{selection=0;showMap();};
ui('home-continue').onclick=()=>{selection=Math.min(unlocked,LEVELS.findIndex((_,i)=>!cleared.includes(i))<0?4:LEVELS.findIndex((_,i)=>!cleared.includes(i)));showMap();};
ui('home-versus').onclick=openVersus;
ui('entry-skip').onclick=finishEntry;
ui('tip-close').onclick=()=>{tipClock=0;ui('mechanic-tip').classList.add('hidden');};
ui('result-primary').onclick=resultAction;
ui('result-map').onclick=showMap;
ui('result-home').onclick=showHome;

// Illustrated controls delegate to the existing game settings.
ui('home-sound').onclick=()=>{ui('sound').click();const label=ui('sound').textContent;ui('home-sound').setAttribute('aria-label',label);ui('home-sound').dataset.muted=String(muted);};
ui('home-fullscreen').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.();};
