import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {createWorld} from './world.js';

test('dois jogadores veem a mesma criatura, dano e morte',async t=>{
  const port=18000+Math.floor(Math.random()*20000);
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)}});
  t.after(()=>server.kill());
  await once(server.stdout,'data');
  async function join(name,level) {
    const socket=new WebSocket('ws://localhost:'+port+'/ws');
    t.after(()=>socket.terminate());
    const messages=[];
    socket.on('message',data=>messages.push(JSON.parse(data)));
    await once(socket,'open');
    const send=e=>socket.send(JSON.stringify(e));
    send({type:'join',sharedMobs:true,name,level,zone:'cave1',x:320,y:300});
    async function wait(predicate) {
      for(let i=0;i<200;i++){
        const index=messages.findIndex(predicate);
        if(index>=0)return messages.splice(index,1)[0];
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      throw Error('Evento ausente para '+name);
    }
    return {send,wait};
  }
  const a=await join('A',1), b=await join('B',9);
  const snapshot=e=>e.type==='mob_world';
  const m=(await a.wait(snapshot)).mobs[0];
  assert.equal((await b.wait(snapshot)).mobs[0].id,m.id);
  const hit={type:'mob_hit',id:m.id,generation:m.generation};
  a.send({...hit,amount:1});
  const wounded=e=>snapshot(e)&&e.mobs.some(o=>o.id===m.id && o.hp===m.max-1);
  await Promise.all([a.wait(wounded),b.wait(wounded)]);
  b.send({...hit,amount:m.max});
  const reward=e=>e.type==='mob_reward';
  const [ra,rb]=await Promise.all([a.wait(reward),b.wait(reward)]);
  assert.equal(ra.xp+rb.xp,m.xp);assert.ok(rb.xp>ra.xp);
  const dead=e=>snapshot(e)&&!e.mobs.some(o=>o.id===m.id);
  await Promise.all([a.wait(dead),b.wait(dead)]);
  const c=await join('C',1);
  assert.ok(!(await c.wait(snapshot)).mobs.some(o=>o.id===m.id));
});

test('renasce uma vez e rejeita golpe da vida anterior',()=>{
 const world=createWorld(),m=world.snapshot('cave1')[0];
 const p={id:'a',level:1,zone:'cave1',x:m.x,y:m.y};
 const hit={id:m.id,generation:m.generation,amount:m.max};
 assert.equal(world.hit(p,hit,0)[0].xp,m.xp);
 assert.equal(world.hit(p,hit,1),undefined);
 world.tick([],80000,()=>{});
 const born=world.snapshot('cave1').find(o=>o.id===m.id);
 assert.equal(born.generation,m.generation+1);
 world.hit(p,hit,80001);
 assert.equal(world.snapshot('cave1').find(o=>o.id===m.id).hp,m.max);
});
