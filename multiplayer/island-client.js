(() => {
  const A=archipelago, harbor=A.kingdoms[0].start, visited=new Set();
  const mapName=vvCMapLabel;
  vvCMapLabel=function(map=vvCMap()){
    if(map===A.sea)return A.island(p.x,p.y)?.name || 'Pontes dos Três Reinos';
    return A.inside.get(map)?.site.name || mapName(map);
  };
  const oldSolid=outdoorSolid;
  outdoorSolid=(x,y,r=10)=>A.owns(vvCMap())?A.solid(vvCMap(),x,y,r):oldSolid(x,y,r);
  const ensure=vvCEnsureMap;
  vvCEnsureMap=function(map){
    if(!A.owns(map))return ensure(map);
    if(sharedSession || visited.has(map))return;
    visited.add(map);
    for(const d of A.creatures.filter(d=>d.map===map))
      mobs.push({...d,instanceMap:map,hp:d.max,homeX:d.x,homeY:d.y,cool:0});
  };
  const actionButton=(box,label,fn)=>{
    const btn=document.createElement('button');btn.textContent=label;btn.onclick=fn;box.append(btn);
  };
  function quest(t){
    const k=A.kingdoms[t.k],status=p.islandQuests?.[t.id],box=vvCModal(t.npc+' · '+t.name);
    vvCText(box,k.quests[t.j]+' · Nível '+t.level);
    if(status==='done'){vvCText(box,'Missão concluída. Obrigado por voltar, '+p.name+'!');return}
    vvCText(box,'Encontre '+k.items[t.j]+' em '+t.goal.name+' e volte para falar comigo.');
    vvCText(box,'Recompensa: '+(t.level*75)+' XP e '+(t.level*12)+' gold.');
    if(p.lvl<t.level){vvCText(box,'Volte no nível '+t.level+'.');return}
    if(status==='found')actionButton(box,'Entregar',()=>{
      if(p.islandQuests[t.id]!=='found'||!withinOneSqm(t))return;
      p.islandQuests[t.id]='done';vvQuestUnregister(t.id);gold+=t.level*12;
      vvCGrantXP(t.level*75);vvCEvent('quest',k.quests[t.j]+' · '+t.name);saveGame();quest(t);
    });
    else if(!status)actionButton(box,'Aceitar missão',()=>{
      if(!withinOneSqm(t)||!vvQuestRegister(t.id)){log('Até cinco missões ativas.');return}
      (p.islandQuests??={})[t.id]='active';p.questLogExpanded=true;saveGame();quest(t);
    });
  }
  function explore(site){
    const t=A.towns.find(t=>t.goal===site),k=A.kingdoms[site.k];
    if(!t || p.islandQuests?.[t.id]!=='active'){
      log(t?'Fale com '+t.npc+' em '+t.name+'.':'Você explorou '+site.name+'.');return;
    }
    p.islandQuests[t.id]='found';saveGame();log('Encontrou '+k.items[t.j]+'. Volte a '+t.name+'.');
  }
  const previousLog=vvQuestRenderSmall;
  let logKey='';
  vvQuestRenderSmall=function(){
    previousLog();
    const ids=vvQuestActiveIds(),towns=A.towns.filter(t=>ids.includes(t.id));
    if(!towns.length){logKey='';return}
    const lines=towns.map(t=>A.kingdoms[t.k].quests[t.j]+' — '+(p.islandQuests[t.id]==='found'?'Volte a '+t.name:t.goal.name));
    if(ids.includes('castle-key'))lines.unshift(p.castleKey?'Entregue a chave a Eldric.':'Encontre o Alfa Sombrio.');
    const text=lines.join(' • ');
    if(logKey!==text || vvQuestLog.querySelector('strong').textContent!=='Missões em andamento'){
      vvQuestLog.querySelector('strong').textContent='Missões em andamento';$('vvQuestObjective').textContent=text;logKey=text;
    }
  };
  const travel=(map,point)=>vvCTransition(map,point.x,point.y);
  const mark=(pos,label,icon,action)=>({...pos,label,icon,action});
  const oldMarkers=vvCMarkers;
  vvCMarkers=function(){
    const map=vvCMap();
    if(map==='surface')return [...oldMarkers(),mark(A.port,'BARCA DOS TRÊS REINOS','⚓',()=>travel(A.sea,harbor))];
    if(map===A.sea)return [
      mark({...harbor,y:harbor.y+90},'BARCA · VELHA VILA','⚓',()=>travel('surface',{x:A.port.x,y:A.port.y+40})),
      ...A.towns.map(t=>mark(t,t.npc,'npc',()=>quest(t))),
      ...A.sites.map(s=>mark(s,s.name,s.peak?'▲':'▼',()=>travel(s.id,A.inside.get(s.id).entry)))];
    const room=A.inside.get(map);
    if(room)return [mark(room.entry,'Retornar','↥',()=>travel(A.sea,{x:room.site.x,y:room.site.y+40})),
      mark(room.goal,room.site.peak?'Marco do cume':'Investigar','✦',()=>explore(room.site))];
    return oldMarkers();
  };
  function print(g,label,x,y,size=12){
    g.save();g.font='bold '+size+'px Georgia';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#232b29';g.strokeText(label,x,y);g.fillStyle='#fff1c8';g.fillText(label,x,y);g.restore();
  }
  function roof(x,y,color){
    ctx.fillStyle='#594b3c';ctx.fillRect(x-35,y-30,70,51);
    ctx.fillStyle='#d3b78a';ctx.fillRect(x-30,y-26,60,43);
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-45,y-28);ctx.lineTo(x-26,y-56);ctx.lineTo(x+27,y-56);ctx.lineTo(x+45,y-28);ctx.closePath();ctx.fill();
    ctx.fillStyle='#493c34';ctx.fillRect(x-7,y-4,14,21);
    for(const a of [-23,14]){ctx.fillStyle='#674c38';ctx.fillRect(x+a,y-16,11,12);ctx.fillStyle='#e6c78d';ctx.fillRect(x+a+2,y-14,7,8)}
  }
  function flag(x,y,color){ctx.fillStyle='#634d35';ctx.fillRect(x-2,y-61,4,61);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+2,y-60);ctx.lineTo(x+32,y-50);ctx.lineTo(x+2,y-40);ctx.fill()}
  function drawSite(s){
    const k=A.kingdoms[s.k],x=s.x,y=s.y;
    ctx.fillStyle=s.peak?'#616978':'#625c50';ctx.beginPath();ctx.moveTo(x-38,y+6);ctx.lineTo(x-16,y-31);ctx.lineTo(x+1,y-(s.peak?86:39));ctx.lineTo(x+38,y+6);ctx.fill();
    if(s.peak){ctx.fillStyle='#e6dfd1';ctx.beginPath();ctx.moveTo(x-9,y-63);ctx.lineTo(x+1,y-86);ctx.lineTo(x+14,y-54);ctx.lineTo(x+1,y-62);ctx.fill()}
    else{ctx.fillStyle='#222827';ctx.beginPath();ctx.ellipse(x,y,13,17,0,Math.PI,2*Math.PI);ctx.fill()}
    print(ctx,s.name,x,y+24);
  }
  const groundCache=new Map();
  function tileInfo(i,j){const key=i+','+j;if(groundCache.has(key))return groundCache.get(key);
    const x=i*40+20,y=j*40+20,k=A.island(x,y),ground=k?'land':A.ground(x,y);
    const tone=k?.land || ({fort:'#aa996f',bridge:'#93724e',sea:'#407680'})[ground];
    const info={tone,k,ground};groundCache.set(key,info);return info;
  }
  const oldDraw=vvDrawWorld;
  vvDrawWorld=function(){
    const map=vvCMap();if(!A.owns(map))return oldDraw();
    const room=A.inside.get(map),cx=p.x-360,cy=p.y-240,k=room&&A.kingdoms[room.site.k];
    const visible=o=>Math.abs(o.x-p.x)<455&&Math.abs(o.y-p.y)<365;
    ctx.save();ctx.translate(-cx,-cy);
    for(let j=Math.floor(cy/40);j<=Math.floor((cy+480)/40);j++)for(let i=Math.floor(cx/40);i<=Math.floor((cx+720)/40);i++){
      const x=i*40,y=j*40,noise=terrainHash(i,j,13),open=room?.grid.has(i+','+j);
      const cell=room?null:tileInfo(i,j);
      ctx.fillStyle=room?(open?(room.site.peak?k.land:'#7e7163'):(room.site.peak?'#5c6068':'#343537')):cell.tone;ctx.fillRect(x,y,40.5,40.5);
      ctx.fillStyle=room?(open?'#ffffff1b':'#ffffff11'):(cell.k?cell.k.light:'#ffffff38');
      if(cell?.ground==='bridge'){ctx.fillStyle='#624d38';ctx.fillRect(x,y+18,40,2);ctx.fillRect(x,y+38,40,2)}
      else{ctx.fillRect(x+4+noise*17,y+8,cell?.ground==='sea'?14:4,2);ctx.fillRect(x+25,y+24+noise*9,6,2)}
    }
    if(!room){
      // Keep decorative trails on land so coastlines and bridge crossings stay readable.
      for(const t of A.towns){
        const realm=A.kingdoms[t.k];
        if(Math.abs(t.x-p.x)>1350 || Math.abs(t.y-p.y)>1300)continue;
        ctx.lineCap='round';ctx.lineWidth=18;ctx.strokeStyle=realm.index===1?'#bdd0cb':'#b2976d';
        for(const dest of [realm,...t.sites]){ctx.beginPath();ctx.moveTo(t.x,t.y+18);ctx.lineTo(dest.x,dest.y+12);ctx.stroke()}
      }
      for(let j=Math.floor(cy/115);j<=Math.ceil((cy+480)/115);j++)for(let i=Math.floor(cx/115);i<=Math.ceil((cx+720)/115);i++){
        const x=i*115+terrainHash(i,j,31)*80,y=j*115+terrainHash(i,j,32)*80,realm=A.island(x,y);
        if(!realm||A.towns.some(t=>Math.hypot(x-t.x,y-t.y)<155)||A.sites.some(t=>Math.hypot(x-t.x,y-t.y)<66))continue;
        if(realm.index===0){ctx.fillStyle='#446344';ctx.fillRect(x-2,y-9,4,13);for(const [dx,dy,r] of [[-4,-11,6],[3,-12,8],[0,-19,6]]){ctx.fillStyle=dy===-19?'#678a51':'#4a7248';ctx.beginPath();ctx.arc(x+dx,y+dy,r,0,7);ctx.fill()}}
        else{ctx.fillStyle=realm.index===1?'#d7e9e9':'#75513f';ctx.beginPath();ctx.moveTo(x-11,y);ctx.lineTo(x-4,y-12);ctx.lineTo(x+3,y-15);ctx.lineTo(x+10,y);ctx.fill()}
      }
      for(const t of A.towns.filter(visible)){const realm=A.kingdoms[t.k];
        roof(t.x-88,t.y-18,realm.roof);roof(t.x+90,t.y-23,realm.roof);
        vvCharacter(t.x,t.y,['Mago','Knight','Atirador'][t.j],t.j===1?'Homem':'Mulher',null,false);
        print(ctx,t.name,t.x,t.y-88,16);print(ctx,t.npc+' · Nv '+t.level,t.x,t.y+26);
      }
      A.sites.filter(visible).forEach(drawSite);
      for(const realm of A.kingdoms.filter(visible)){
        ctx.fillStyle='#79756b';ctx.fillRect(realm.x-47,realm.y-44,94,49);
        for(const dx of [-40,40]){ctx.fillRect(realm.x+dx-12,realm.y-65,24,65);flag(realm.x+dx,realm.y-65,realm.roof)}
        print(ctx,realm.castle,realm.x,realm.y+24);
      }
      for(const b of A.bridges.filter(visible)){flag(b.x,b.y,'#c79b56');print(ctx,'Zona de Guerra',b.x,b.y+22)}
      print(ctx,'⚓ Barca para Velha Vila',harbor.x,harbor.y+100);
    }else{print(ctx,'↥ Voltar',room.entry.x,room.entry.y-12);flag(room.goal.x,room.goal.y,k.roof);print(ctx,room.site.peak?'Marco do cume':'✦ Investigar',room.goal.x,room.goal.y+17)}
    for(const d of drops.filter(vvCSameMap))if(visible(d))ellipse(d.x,d.y,8,6,'#edc26f');
    for(const m of mobs.filter(vvCSameMap))if(visible(m))vvMob(m);
    vvDrawOtherPlayers(map);vvCharacter(p.x,p.y,p.family,p.gender,p.weapon,route.length>0,false,p.shield,true);
    ctx.restore();
    const nearest=map===A.sea&&A.towns.filter(t=>t.k===A.island(p.x,p.y)?.index).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    print(ctx,nearest?nearest.region+' · '+vvCMapLabel():vvCMapLabel(),360,26,14);
  };
  function atlas(){
    const box=vvCModal('Atlas dos Três Reinos'),canvas=document.createElement('canvas');
    canvas.width=620;canvas.height=460;canvas.style.cssText='width:100%;height:auto;display:block';box.append(canvas);
    const g=canvas.getContext('2d'),scale=.085;
    g.fillStyle='#315965';g.fillRect(0,0,620,460);
    const X=x=>4+x*scale,Y=y=>-35+y*scale;
    for(const b of A.bridges){g.lineWidth=6;g.strokeStyle='#ad9167';g.beginPath();g.moveTo(X(b.a.x),Y(b.a.y));g.lineTo(X(b.b.x),Y(b.b.y));g.stroke()}
    for(const k of A.kingdoms){
      g.fillStyle=k.land;g.beginPath();
      for(let n=0;n<=100;n++){const a=n*Math.PI/50,r=A.coast(k,a);const x=X(k.x+Math.cos(a)*r),y=Y(k.y+Math.sin(a)*r);if(n)g.lineTo(x,y);else g.moveTo(x,y)}
      g.fill();print(g,k.name,X(k.x),Y(k.y)-4,19);
    }
    for(const t of A.towns){g.fillStyle='#eed19b';g.fillRect(X(t.x)-2,Y(t.y)-2,5,5);print(g,t.name,X(t.x),Y(t.y)+14,11)}
    for(const b of A.bridges)print(g,'⚑',X(b.x),Y(b.y),17);
    const loc=vvCMap()===A.sea?p:A.inside.get(vvCMap())?.site;
    if(loc){g.beginPath();g.fillStyle='#ffea70';g.arc(X(loc.x),Y(loc.y),5,0,2*Math.PI);g.fill()}
    vvCText(box,'Em Velha Vila, embarque na barca ao sul da casa. Nos reinos, toque no nome de um morador ou na entrada de uma trilha.');
    for(const k of A.kingdoms){vvCText(box,k.name+' · '+k.biome+' · '+k.peak);for(const t of A.towns.filter(t=>t.k===k.index))vvCText(box,t.region+' — '+t.name+' · Nv '+t.level+' · '+k.quests[t.j])}
  }
  const atlasButton=document.createElement('button');atlasButton.textContent='Atlas';atlasButton.title='Atlas dos Três Reinos';atlasButton.onclick=atlas;vvCQuick.append(atlasButton);
  vvCEnsureMap(vvCMap());
})();
