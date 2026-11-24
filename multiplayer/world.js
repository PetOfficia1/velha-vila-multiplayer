import { readFileSync } from 'node:fs';
const creatures = JSON.parse(readFileSync(new URL('./creatures.json', import.meta.url), 'utf8'));
import { surfaceSolid } from './terrain.js';

const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function blocked(map, x, y) {
  if (map === 'surface') return surfaceSolid(x,y,13) || Math.hypot(x-550,y-350)<24;
  return x<53 || x>907 || y<53 || y>667;
}

export function createWorld() {
  const mobs = [];
  for (const def of creatures) {
    let x=def.x, y=def.y;
    for (let i=0; blocked(def.map,x,y) || mobs.some(m=>m.map===def.map && distance(m,{x,y})<44); i++) {
      const radius=12*Math.sqrt(i+1), angle=i*2.4;
      x=def.x+Math.cos(angle)*radius; y=def.y+Math.sin(angle)*radius;
    }
    mobs.push({...def,id:String(mobs.length),x,y,homeX:x,homeY:y,hp:def.max,
      attackers:new Map(),generation:1,nextAttack:0,respawn:0});
  }
  function snapshot(map) {
    return mobs.filter(m=>m.map===map && m.hp>0).map(({attackers,nextAttack,respawn,...m})=>m);
  }
  function hit(player,event,now) {
    const m=mobs.find(m=>m.id===event.id);
    if (!m || m.generation!==event.generation || m.map!==player.zone || m.hp<=0 ||
        distance(m,player)>420 || !Number.isSafeInteger(event.amount) || event.amount<=0) return;
    m.hp-=Math.min(m.hp,event.amount);
    m.attackers.set(player.id,player.level);
    if (m.hp) return;
    const weights=[...m.attackers], sum=weights.reduce((s,[,lv])=>s+lv,0);
    const shares=weights.map(([id,lv])=>({id,xp:Math.floor(m.xp*lv/sum),rem:(m.xp*lv)%sum}));
    shares.sort((a,b)=>b.rem-a.rem);
    const remainder=m.xp-shares.reduce((s,a)=>s+a.xp,0);
    for(let i=0;i<remainder;i++) shares[i].xp++;
    m.respawn=now+(m.isBoss?180:m.type.includes('Lobo')?80:m.type.includes('Orc')?100:60)*1000;
    return shares;
  }
  function tick(players,now,hurt) {
    for(const m of mobs) {
      if(!m.hp) {
        if(now<m.respawn) continue;
        Object.assign(m,{hp:m.max,x:m.homeX,y:m.homeY,generation:m.generation+1,nextAttack:0});
        m.attackers.clear();
      }
      const nearby=players.filter(p=>p.zone===m.map && (distance(m,p)<=400 || m.attackers.has(p.id)));
      nearby.sort((a,b)=>distance(m,a)-distance(m,b));
      const p=nearby[0]; if(!p) continue;
      const d=distance(m,p);
      if(d<=41) {
        if(now>=m.nextAttack){hurt(p,m);m.nextAttack=now+1200;}
        continue;
      }
      const step=Math.min(9.6,d-40), dx=(p.x-m.x)*step/d,dy=(p.y-m.y)*step/d;
      for(const [x,y] of [[m.x+dx,m.y+dy],[m.x+dx,m.y],[m.x,m.y+dy]]) {
        if(blocked(m.map,x,y) || mobs.some(o=>o!==m && o.hp && o.map===m.map && distance(o,{x,y})<32)) continue;
        m.x=x;m.y=y;break;
      }
    }
  }
  return {snapshot,hit,tick};
}
