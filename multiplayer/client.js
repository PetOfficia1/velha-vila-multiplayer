// Loaded in the game's shared script scope by the development build.
let sharedSession = false;
let localCreatures = [];
function leaveSharedWorld() {
  if (!sharedSession) return;
  sharedSession=false;
  mobs=localCreatures;
  localCreatures=[];
  target=null;
}
function receiveCreatureEvent(event) {
  if(event.type==='welcome' && event.sharedMobs) {
    localCreatures=mobs; mobs=[]; sharedSession=true; target=null;
    return;
  }
  if(!sharedSession) return;
  if(event.type==='mob_world' && event.zone===vvCMap()) {
    const previous=new Map(mobs.filter(m=>m.shared).map(m=>[m.id,m]));
    mobs=event.mobs.map(state=>{
      const old=previous.get(state.id);
      return Object.assign(old?.generation===state.generation ? old : {},state,
        {shared:true,instanceMap:state.map==='surface'?undefined:state.map});
    });
    if(target && !mobs.includes(target)) target=null;
  } else if(event.type==='mob_reward') {
    const m=mobs.find(m=>m.shared && m.id===event.id && m.generation===event.generation);
    if(m && event.finisher) {
      m.sharedXp=event.xp; defeatMob(m);
    } else {
      vvCGrantXP(event.xp);saveGame();
    }
  } else if(event.type==='mob_attack' && event.zone===vvCMap() && gameStarted) {
    const damage=damageToPlayer(event.dmg);
    p.hp-=damage;vvCRecordHit({type:event.name},damage);
    if(event.name==='Slime') p.slowUntil=Date.now()+1500;
    if(p.hp<=0) resetPlayer();
  } else if(event.type==='player_left') vvRemotePlayers.delete(event.id);
  else if(event.type==='player_joined') vvRemotePlayers.set(event.player.id,event.player);
}
