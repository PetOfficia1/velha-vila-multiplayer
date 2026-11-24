import test from 'node:test';
import assert from 'node:assert/strict';
import {archipelago as map} from './archipelago.js';

function flood(start,step,walkable){
  const key=(x,y)=>x+','+y,queue=[start],seen=new Set([key(start.x,start.y)]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const x=p.x+dx,y=p.y+dy,k=key(x,y);
      if(seen.has(k)||!walkable(x,y))continue;
      seen.add(k);queue.push({x,y});
    }
  }
  return seen;
}
test('a partir da barca há caminho para todas as vilas e entradas',()=>{
 const start=map.kingdoms[0].start,step=20;
 const grid=flood(start,step,(x,y)=>!map.solid(map.sea,x,y,10));
 for(const point of [...map.towns,...map.sites]){
   const x=start.x+step*Math.round((point.x-start.x)/step),y=start.y+step*Math.round((point.y-start.y)/step);
   assert.ok(grid.has(x+','+y),point.name);
 }
});
test('cada reino tem três vilas, seis caves, um cume e objetivos acessíveis',()=>{
 for(const k of map.kingdoms){
   assert.equal(map.towns.filter(t=>t.k===k.index).length,3);
   assert.equal(map.sites.filter(s=>s.k===k.index&&!s.peak).length,6);
   assert.equal(map.sites.filter(s=>s.k===k.index&&s.peak).length,1);
 }
 for(const [id,r] of map.inside){
   const grid=flood(r.entry,40,(x,y)=>!map.solid(id,x,y,10));
   assert.ok(grid.has(r.goal.x+','+r.goal.y),id);
   assert.ok(grid.has(r.guard.x+','+r.guard.y),id);
 }
});
