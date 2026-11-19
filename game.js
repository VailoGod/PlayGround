(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=480,H=270;
ctx.imageSmoothingEnabled=false;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const worlds=[
 {name:'THE LOST TEA FOREST',short:'FOREST',mood:'forest',sky:['#8daaa0','#d9c7a1'],far:'#657b67',mid:'#3c5c4d',ground:'#304741',top:'#607f5a',accent:'#f1cf78',boss:'ANCIENT BLOOM'},
 {name:'THE DEEPWATER WORKS',short:'WORKS',mood:'deep',sky:['#315f67','#70aaa0'],far:'#3e7880',mid:'#315763',ground:'#24404a',top:'#56808a',accent:'#91d7c1',boss:'THE BOILER KING'},
 {name:'THE SCORCHED FOUNDRY',short:'FOUNDRY',mood:'forge',sky:['#5a4541','#c98a59'],far:'#775347',mid:'#5b4741',ground:'#403936',top:'#78645a',accent:'#f4b368',boss:'IRON HEART'},
 {name:'THE CANDY COLONY',short:'COLONY',mood:'candy',sky:['#8e8ba4','#f1c1a5'],far:'#a7788c',mid:'#77677c',ground:'#654f63',top:'#b28391',accent:'#ffd49a',boss:'QUEEN JELLY'},
 {name:'THE SUGAR CROWN',short:'CROWN',mood:'crown',sky:['#31394d','#9a6d77'],far:'#4e5363',mid:'#383e50',ground:'#30363f',top:'#70717a',accent:'#f7d36e',boss:'THE SUGAR EMPRESS'}
];
const weapons=[
 {name:'TEA BLASTER',icon:'✦',speed:6,damage:1,cooldown:12,color:'#ffe08a'},
 {name:'ROSE REPEATER',icon:'◆',speed:7,damage:1,cooldown:7,color:'#ff9b91'},
 {name:'STEAM SPLITTER',icon:'≋',speed:5,damage:1,cooldown:18,color:'#8fd5ce',spread:3},
 {name:'CLOCKWORK ORB',icon:'◉',speed:4,damage:2,cooldown:26,color:'#dec98a',homing:true},
 {name:'THUNDER KEG',icon:'ϟ',speed:3,damage:3,cooldown:38,color:'#a9c8ff',kind:'electric'},
 {name:'HONEY BOMBER',icon:'●',speed:4,damage:4,cooldown:44,color:'#d99e55',kind:'bomb'}
];
const enemyNames=['ACORN BOT','MOUSE KNIGHT','PUDDLE SPIKE','CLOCK BEE','CINDER CRAB','RAIL RAT','MARSH MOTH','GEAR GNOME','BRIAR HOPPER','TINY KETTLE','LICORICE WISP','FOAM FROG','SUGAR GUARD','SNOW JAR','CHAMPION CUP'];
let state='title',selectedWorld=0,world=worlds[0];
let unlocked=1,sceneTime=0,last=0,camera=0,worldX=0,shake=0;
try{unlocked=clamp(Number(localStorage.getItem('teapot-unlocked')||1),1,5)}catch(e){}
const keys={},touch={};
let player={x:90,y:206,vx:0,vy:0,w:18,h:23,face:1,hp:5,maxHp:5,steam:0,jumps:0,dash:0,dashCooldown:0,fireCooldown:0,invuln:0,weapon:0,parry:0,ult:0};
let shots=[],enemyShots=[],foes=[],drops=[],particles=[],platformList=[];
let boss=null,bossActive=false,bossMax=180;

function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));if(id)$(id)?.classList.add('visible');}
function toast(text){$('game-tip').textContent=text;$('game-tip').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('game-tip').classList.remove('show'),2200)}

function makePlatforms(){platformList=[];for(let i=0;i<9;i++){platformList.push({x:250+i*280+(i%3)*45,y:165-(i%3)*24,w:58+(i%2)*28})}}
function makeFoes(){foes=[];for(let i=0;i<18;i++){let arche=i%15,x=300+i*145+(i%4)*20,y=196;foes.push({x,y,vx:i%2?-.55:.55,w:14,h:15,hp:[1,2,2,1,3,2,1,3,2,2,1,2,3,2,4][arche],maxHp:[1,2,2,1,3,2,1,3,2,2,1,2,3,2,4][arche],arche,name:enemyNames[arche],cooldown:rand(30,100),anim:0,dead:false})}}
function startWorld(i){if(i>=unlocked)return;selectedWorld=i;world=worlds[i];camera=0;state='playing';shots=[];enemyShots=[];drops=[];particles=[];boss=null;bossActive=false;makePlatforms();makeFoes();Object.assign(player,{x:90,y:196,vx:0,vy:0,hp:5,steam:0,jumps:0,dash:0,dashCooldown:0,invuln:0,weapon:i%weapons.length});$('hud').classList.remove('hidden');$('boss-bar').classList.add('hidden');$('hud-world').textContent=world.name;$('weapon-name').textContent=weapons[player.weapon].name;$('weapon-icon').textContent=weapons[player.weapon].icon;showScreen(null);toast(['JUMP TWENTY TIMES','DASH THROUGH DANGER','SHOOT WITH J OR FIRE','KEEP MOVING, LITTLE POT','BREAK THE SUGAR COURT'][i])}

function updateHUD(){const hp=clamp(player.hp,0,player.maxHp);$('hp-text').textContent=`${hp} / ${player.maxHp}`;$('health-fill').style.width=`${hp/player.maxHp*100}%`;$('steam-fill').style.width=`${player.steam}%`;$('steam-text').textContent=`${Math.floor(player.steam)}%`;if(bossActive&&boss){$('boss-fill').style.width=`${clamp(boss.hp/bossMax*100,0,100)}%`}}

function burst(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-2.4,2.4),vy:rand(-2.5,.5),life:30,max:30,size:rand(1,3)|0,color})}
function hurt(dmg=1,x=player.x){if(player.invuln>0||player.parry>0)return;player.hp-=dmg;player.invuln=70;shake=5;burst(player.x+9,player.y+10,'#ffb07a',10);if(player.hp<=0)showResult(false)}
function showResult(win){state='result';$('hud').classList.add('hidden');showScreen('result-screen');if(win){unlocked=Math.max(unlocked,Math.min(5,selectedWorld+2));try{localStorage.setItem('teapot-unlocked',unlocked)}catch(e){}$('result-eyebrow').textContent='RELIC RECOVERED';$('result-title').textContent=selectedWorld===4?'THE CROWN IS BROKEN!':'A FINE BREW!';$('result-copy').textContent=world.boss+' has been defeated.';$('result-stats').innerHTML=`<b>${foes.filter(e=>e.dead).length}</b><small>FOES BOILED</small><b>${player.hp}</b><small>HEARTS LEFT</small>`;$('result-button').textContent=selectedWorld===4?'PLAY AGAIN':'NEXT WORLD'}else{$('result-eyebrow').textContent='THE KETTLE IS COLD';$('result-title').textContent='NOT THIS BREW';$('result-copy').textContent='Dust yourself off. The wilds are waiting.';$('result-stats').innerHTML='<b>—</b><small>TRY AGAIN</small>';$('result-button').textContent='RETRY'}}

function fire(){if(state!=='playing'||player.fireCooldown>0)return;const w=weapons[player.weapon];player.fireCooldown=w.cooldown;let count=w.spread||1,base=-((count-1)/2)*.12;for(let i=0;i<count;i++){shots.push({x:player.x+player.face*12,y:player.y+10,vx:player.face*w.speed,vy:Math.tan(base+i*.12)*w.speed,w:3,h:3,damage:w.damage,life:100,kind:w.kind||'',homing:w.homing,color:w.color,size:w.kind==='bomb'?7:4})}burst(player.x+player.face*14,player.y+10,w.color,3);player.steam=clamp(player.steam+1.5,0,100)}
function dash(){if(state!=='playing'||player.dashCooldown>0)return;player.dash=14;player.dashCooldown=70;player.invuln=Math.max(player.invuln,10);burst(player.x+9,player.y+16,'#b7ddd2',7)}
function parry(){if(state!=='playing'||player.parry>0)return;player.parry=12;burst(player.x+9+player.face*9,player.y+12,'#baf7dc',6)}
function useSpecial(){if(state!=='playing'||player.steam<100)return;player.steam=0;player.ult=100;shake=8;for(let i=0;i<24;i++)shots.push({x:player.x,y:player.y+10,vx:Math.cos(i/24*Math.PI*2)*5,vy:Math.sin(i/24*Math.PI*2)*5,w:5,h:5,damage:2,life:80,kind:'electric',homing:false,color:'#baf7dc',size:5});burst(player.x+9,player.y+12,'#d9ffe9',20)}

function update(dt){sceneTime+=dt;if(shake>0)shake-=dt*.4;if(state!=='playing')return;
 if(keys.ArrowLeft||keys.a||keys.A||touch.left){player.vx-=.38*dt;player.face=-1}if(keys.ArrowRight||keys.d||keys.D||touch.right){player.vx+=.38*dt;player.face=1}
 player.vx*=Math.pow(player.dash>0?.96:.76,dt);player.vx=clamp(player.vx,player.dash>0?-7:3.2*-1,3.2);if(player.dash>0){player.vx=player.face*7;player.dash-=dt;if(player.vx)burst(player.x+9,player.y+17,'#b6d9cf',1)}
 player.vy+=.34*dt;if(player.dash<=0)player.vy=clamp(player.vy,-9,7);
 let px=player.x+player.vx*dt,py=player.y+player.vy*dt;
 player.x=clamp(px,8,worldX+Math.max(100,W));
 if(py+player.h>=222){py=222-player.h;player.vy=0;player.jumps=0}
 for(const p of platformList){if(player.vy>=0&&player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h<=p.y+5&&py+player.h>=p.y){py=p.y-player.h;player.vy=0;player.jumps=0}}
 player.y=py;if(player.y>H+30)hurt(99);
 worldX=clamp(player.x-150,0,2600);camera+=(worldX-camera)*.12;
 player.fireCooldown=Math.max(0,player.fireCooldown-dt);if(keys.j||keys.J||keys.z||keys.Z||touch.fire)fire();player.dashCooldown=Math.max(0,player.dashCooldown-dt);player.invuln=Math.max(0,player.invuln-dt);player.parry=Math.max(0,player.parry-dt);player.ult=Math.max(0,player.ult-dt);

 if(player.x>2480&&!bossActive){bossActive=true;boss={x:2500,y:205,hp:bossMax};$('boss-bar').classList.remove('hidden');$('boss-name').textContent=world.boss}
 if(bossActive){boss.x+=((player.x>boss.x?1:-1)*.35)*dt;if(Math.abs(player.x-boss.x)<32)hurt(1);boss.cooldown=(boss.cooldown||70)-dt;if(boss.cooldown<=0){boss.cooldown=70-rand(0,25);let dx=player.x-boss.x,dy=player.y-boss.y,a=Math.atan2(dy,dx);enemyShots.push({x:boss.x,y:boss.y-20,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5,life:150,color:'#f5c76d'})}}

 for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.homing){let target=foes.find(e=>!e.dead&&Math.abs(e.x-s.x)<150)||boss; if(target){let a=Math.atan2(target.y-s.y,target.x-s.x);s.vx+=(Math.cos(a)-s.vx*.1)*.12*dt;s.vy+=(Math.sin(a)-s.vy*.1)*.12*dt}}}
 shots=shots.filter(s=>s.life>0&&s.x>-30&&s.x<2700&&s.y>-20&&s.y<H+30);
 for(const s of enemyShots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(Math.abs(s.x-player.x)<10&&Math.abs(s.y-player.y)<15){if(player.parry>0){player.steam=clamp(player.steam+12,0,100);burst(player.x+9,player.y+10,'#baf7dc',8)}else hurt(1,s.x);s.life=0}}enemyShots=enemyShots.filter(s=>s.life>0);
 for(const e of foes){if(e.dead)continue;e.anim+=dt;e.vx=e.arche%2?-Math.cos(e.anim*.025)*.55:.55*Math.cos(e.anim*.025);e.x+=e.vx*dt;if(Math.abs(e.x-player.x)<15&&Math.abs(e.y-player.y)<18){if(player.parry>0){e.hp--;player.steam=clamp(player.steam+12,0,100);if(e.hp<=0){e.dead=true;burst(e.x,e.y,world.accent,10)}}else hurt(1)}e.cooldown-=dt;if(e.cooldown<=0&&Math.abs(e.x-player.x)<230){e.cooldown=rand(90,150);let a=Math.atan2(player.y-e.y,player.x-e.x);enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*1.8,vy:Math.sin(a)*1.8,life:130,color:world.accent})}}
 for(const s of shots){for(const e of foes){if(!e.dead&&Math.abs(s.x-e.x)<11&&Math.abs(s.y-e.y)<13){e.hp-=s.damage;s.life=0;burst(s.x,s.y,s.color,4);if(e.hp<=0){e.dead=true;burst(e.x,e.y,world.accent,12);player.steam=clamp(player.steam+7,0,100);if(Math.random()<.18)drops.push({x:e.x,y:e.y,vy:-2,t:0})}}}if(bossActive&&boss&&Math.abs(s.x-boss.x)<28&&Math.abs(s.y-(boss.y-20))<30){boss.hp-=s.damage;s.life=0;shake=2;burst(s.x,s.y,s.color,5);if(boss.hp<=0){boss=null;bossActive=false;showResult(true)}}}
 for(const d of drops){d.t+=dt;d.y=(d.y||d.t*-0.05)}
 drops=drops.filter(d=>{if(Math.abs(d.x-player.x)<12&&Math.abs(d.y-player.y)<18){player.hp=clamp(player.hp+1,0,player.maxHp);player.steam=clamp(player.steam+15,0,100);return false}return d.t<400});
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.08*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
 updateHUD();
}

function drawBackground(){const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,world.sky[0]);grad.addColorStop(1,world.sky[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);const orbX=selectedWorld===1?380:370,orbY=54;ctx.fillStyle='#f7d49a66';ctx.fillRect(orbX-12,orbY-12,24,24);ctx.fillStyle='#f4d18c';ctx.fillRect(orbX-6,orbY-6,12,12);
 const par=camera*.18;ctx.fillStyle=world.far;for(let i=-1;i<12;i++){const x=i*63-(par%63),h=42+(Math.sin(i*12.3+selectedWorld)*16|0);ctx.fillRect(x+20,112-h*.35,24,h*.55);ctx.fillRect(x+8,124,48,20)}
 const mp=camera*.38;ctx.fillStyle=world.mid;for(let i=-1;i<16;i++){const x=i*42-(mp%42);ctx.fillRect(x+16,128,8,45);ctx.fillRect(x+5,140,28,15)}
 for(let n=0;n<18;n++){const x=((n*67-sceneTime*.35)%(W+20)+W+20)%(W+20),y=(n*43+Math.sin(sceneTime*.03+n)*9)%170+20;ctx.fillStyle=world.accent;ctx.globalAlpha=.35;ctx.fillRect(x,y,n%4===0?2:1,n%4===0?2:1)}ctx.globalAlpha=1}
function drawHero(){const x=Math.round(player.x-camera),y=Math.round(player.y);ctx.save();ctx.fillStyle='#17232a88';ctx.fillRect(x-3,y+22,24,3);ctx.translate(x,y);if(player.invuln>0&&Math.floor(player.invuln/5)%2===0)ctx.globalAlpha=.45;
 ctx.fillStyle='#b94145';ctx.fillRect(3,12,13,11);ctx.fillStyle='#e7ece0';ctx.fillRect(4,5,12,11);ctx.fillStyle='#f5d58c';ctx.fillRect(7,9,6,6);ctx.fillStyle='#26343a';ctx.fillRect(player.face>0?12:7,7,2,3);ctx.fillRect(player.face>0?12:7,12,2,2);ctx.fillStyle='#d4ad68';ctx.fillRect(1,8,3,10);ctx.fillRect(14,8,5,3);ctx.fillStyle='#8c4d42';ctx.fillRect(0,15,3,7);ctx.fillStyle='#d9e4d5';ctx.fillRect(5,20,4,5);ctx.fillRect(10,20,4,5);ctx.restore()}
function drawEnemy(e){const x=Math.round(e.x-camera),y=Math.round(e.y);ctx.fillStyle='#151d20aa';ctx.fillRect(x-5,y+14,19,3);ctx.fillStyle=['#637b4b','#7b6c67','#5d8790','#dba85c','#a66b4d','#656f62','#7b76a1','#9d7b55','#6f914b','#b8aa82','#9a88af','#4d9c91','#d58e91','#8397a3','#c8a66b'][e.arche];ctx.fillRect(x-2,y+2,17,13);ctx.fillStyle='#e9dfb5';ctx.fillRect(x+(e.arche%2?11:2),y+5,4,4);ctx.fillStyle='#26343a';ctx.fillRect(x+(e.arche%2?13:3),y+6,2,2);ctx.fillStyle='#edb4a1';ctx.fillRect(x+6,y+11,5,2)}
function drawWorld(){drawBackground();ctx.fillStyle=world.ground;ctx.fillRect(0,222,W,H-222);ctx.fillStyle=world.top;ctx.fillRect(0,222,W,4);for(let x=-(camera%24);x<W;x+=24){ctx.fillStyle='#d4c98b55';ctx.fillRect(x,230,10,2);ctx.fillRect(x+12,248,8,3)}for(const p of platformList){const x=Math.round(p.x-camera);if(x+p.w<0||x>W)continue;ctx.fillStyle='#1a292a';ctx.fillRect(x,p.y+5,p.w,10);ctx.fillStyle=world.ground;ctx.fillRect(x,p.y+3,p.w,8);ctx.fillStyle=world.top;ctx.fillRect(x,p.y,p.w,4)}for(const d of drops){ctx.fillStyle='#ffe68d';ctx.fillRect(d.x-camera-3,d.y,7,7)}for(const s of shots){ctx.fillStyle=s.color;ctx.fillRect(s.x-camera-s.size/2,s.y-s.size/2,s.size,s.size)}for(const s of enemyShots){ctx.fillStyle=s.color;ctx.fillRect(s.x-camera-3,s.y-2,7,5)}for(const e of foes)if(!e.dead)drawEnemy(e);if(boss&&bossActive){const x=boss.x-camera,y=boss.y-38;ctx.fillStyle='#29343a';ctx.fillRect(x-24,y+10,49,26);ctx.fillStyle=world.accent;ctx.fillRect(x-16,y+3,32,12);ctx.fillStyle='#f5d276';ctx.fillRect(x-13,y+20,7,6);ctx.fillRect(x+8,y+20,7,6);ctx.fillStyle='#273335';ctx.fillRect(x-11,y+21,3,4);ctx.fillRect(x+10,y+21,3,4)}drawHero();for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-camera,p.y,p.size,p.size)}ctx.globalAlpha=1}

function draw(){ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));if(state==='title'||state==='world'){world=worlds[0];camera=0;worldX=0}drawWorld();ctx.restore()}
function frame(t){let dt=Math.min(2.5,(t-last)/16.667||1);last=t;if(state==='playing')update(dt);else sceneTime+=dt;draw();requestAnimationFrame(frame)}

function renderWorlds(){const list=$('world-list');list.innerHTML='';worlds.forEach((w,i)=>{const card=document.createElement('button');card.className='world-card'+(i>=unlocked?' locked':'');card.innerHTML=`<span class="world-number">0${i+1}</span><b>${w.short}</b><small>${i>=unlocked?'LOCKED':w.name}</small>`;card.disabled=i>=unlocked;card.onclick=()=>startWorld(i);list.appendChild(card)})}
function openWorlds(){state='world';renderWorlds();$('hud').classList.add('hidden');showScreen('world-screen')}
function pauseGame(){if(state==='playing'){state='paused';showScreen('pause-screen')}}
function resumeGame(){state='playing';showScreen(null)}
function jump(){if(state!=='playing'||player.jumps>=2)return;player.vy=-6.2;player.jumps++;burst(player.x+9,player.y+21,'#e3ead9',4)}

$('play-button').onclick=openWorlds;$('back-title').onclick=()=>{state='title';showScreen('title-screen')};$('pause-button').onclick=pauseGame;$('resume-button').onclick=resumeGame;$('quit-button').onclick=openWorlds;
$('result-button').onclick=()=>{if($('result-title').textContent.includes('THE CROWN'))openWorlds();else if($('result-title').textContent.includes('NOT'))startWorld(selectedWorld);else startWorld(selectedWorld+1)};
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='Escape'){if(state==='playing')pauseGame();else if(state==='paused')resumeGame()}if(!e.repeat&&(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W'))jump();if(!e.repeat&&(e.key==='j'||e.key==='J'||e.key==='z'||e.key==='Z'))fire();if(!e.repeat&&(e.key==='l'||e.key==='L'||e.key==='Shift'))dash();if(!e.repeat&&(e.key==='p'||e.key==='P'))parry();if(!e.repeat&&(e.key==='k'||e.key==='K'||e.key==='x'||e.key==='X'))useSpecial();if(!e.repeat&&(e.key==='q'||e.key==='Q'||e.key==='e'||e.key==='E')){player.weapon=(player.weapon+(e.key.toLowerCase()==='q'?weapons.length-1:1))%weapons.length;$('weapon-name').textContent=weapons[player.weapon].name;$('weapon-icon').textContent=weapons[player.weapon].icon}});
window.addEventListener('keyup',e=>{keys[e.key]=false});
document.querySelectorAll('[data-control]').forEach(b=>{const key=b.dataset.control;const down=e=>{e.preventDefault();touch[key]=true;b.classList.add('active');if(key==='jump')jump();if(key==='dash')dash();if(key==='parry')parry();if(key==='special')useSpecial();if(key==='fire')fire()};const up=e=>{e.preventDefault();touch[key]=false;b.classList.remove('active')};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);if(state==='playing')pauseGame()});
showScreen('title-screen');renderWorlds();requestAnimationFrame(frame);
})();
