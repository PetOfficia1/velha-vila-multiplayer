// World coordinates use the same 40-pixel squares as the original client.
export const archipelago = (() => {
  const tile=40, sea='arquipelago', port={x:355,y:440};
  const kingdoms=[
    {name:'Verdália',biome:'Mata',x:1800,y:1700,land:'#688753',light:'#88a366',roof:'#a05438',peak:'Serra do Cervo',castle:'Castelo da Esmeralda',
     towns:['Porto da Folha','Vila das Colmeias','Alto do Cedro'],npcs:['Iara, a barqueira','Bento, o apicultor','Nara, a mateira'],regions:['Mangue das Garças','Bosque de Âmbar','Serra dos Cedros'],
     quests:['A nascente escondida','O mel da pedra','O sino da neblina'],items:['água da nascente','favo de âmbar','sino do cedro'],enemy:'Sentinela de Musgo'},
    {name:'Nivária',biome:'Gelo',x:5400,y:1700,land:'#9fbcc1',light:'#c4d9d9',roof:'#526e91',peak:'Pico da Aurora',castle:'Castelo da Safira',
     towns:['Cais da Geada','Pedra Branca','Vigia Boreal'],npcs:['Edda, a pescadora','Ivo, o lapidário','Suri, a astrônoma'],regions:['Enseada do Degelo','Minas de Sal Azul','Cordilheira Boreal'],
     quests:['O anzol de prata','A lente de sal','Luz acima das nuvens'],items:['anzol de prata','cristal de sal azul','fragmento de aurora'],enemy:'Lobo da Geada'},
    {name:'Ignária',biome:'Fogo',x:3600,y:4700,land:'#a46e50',light:'#bf8961',roof:'#703843',peak:'Monte do Fole',castle:'Castelo do Rubi',
     towns:['Porto das Cinzas','Vila da Forja','Mirante da Brasa'],npcs:['Zeca, o balseiro','Maíra, a ferreira','Ravi, o vigia'],regions:['Praia da Cinza','Campos de Escória','Encosta Rubra'],
     quests:['O remo queimado','O veio de obsidiana','A chama do vigia'],items:['remo de ferro','lâmina de obsidiana','brasa perene'],enemy:'Guardião de Escória'}
  ];
  const towns=[],sites=[],bridges=[],creatures=[],inside=new Map();
  function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
  const rng=random(947302);
  function segment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.min(1,Math.max(0,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
  function room(site) {
    const grid=new Set(),rand=random(1900+sites.length*557);
    const points=[{x:3,y:9}];
    for(let i=1;i<=4;i++)points.push({x:i*6+3,y:4+Math.floor(rand()*12)});
    function open(x,y,r){for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)grid.add((x+a)+','+(y+b))}
    points.forEach((q,i)=>{open(q.x,q.y,2);if(!i)return;let {x,y}=points[i-1];while(x!==q.x){open(x,y,1);x+=Math.sign(q.x-x)}while(y!==q.y){open(x,y,1);y+=Math.sign(q.y-y)}open(x,y,1)});
    const pos=q=>({x:q.x*tile+20,y:q.y*tile+20});
    return {grid,entry:pos(points[0]),goal:pos(points.at(-1)),guard:pos(points[2]),site};
  }
  kingdoms.forEach((k,i)=>{
    k.index=i;k.start={x:k.x-540,y:k.y+180};
    const offsets=[[-500,160],[430,340],[130,-590]];
    offsets.forEach(([dx,dy],j)=>{
      const t={x:k.x+dx,y:k.y+dy,k:i,j,name:k.towns[j],npc:k.npcs[j],region:k.regions[j],level:[1,12,30][j]+2*i,id:'vila-'+i+'-'+j,sites:[]};towns.push(t);
      for(let n=0;n<(j===2?3:2);n++){
        const peak=n===2;
        const site={id:'trilha-'+i+'-'+j+'-'+n,k:i,j,peak,
         x:t.x+(n===0?-155:n===1?210:40)+Math.round(rng()*40),y:t.y+(n===0?180:n===1?120:-260)+Math.round(rng()*40),
         name:peak?k.peak:['Gruta','Galeria'][n]+' de '+t.name};
        sites.push(site);t.sites.push(site);
        const r=room(site);inside.set(site.id,r);
        creatures.push({type:k.enemy,map:site.id,...r.guard,max:45+9*t.level,dmg:4+t.level,xp:6+3*t.level,armor:2+j*3,color:k.roof});
      }
      t.goal=t.sites[j===2?2:j];
    });
  });
  for(let i=0;i<3;i++){const a=kingdoms[i],b=kingdoms[(i+1)%3];bridges.push({a,b,x:(a.x+b.x)/2,y:(a.y+b.y)/2})}
  const sq=(x,y)=>Math.floor(x/tile)+','+Math.floor(y/tile);
  kingdoms.forEach(k=>{k.coastPhase=rng()*Math.PI*2});
  function coast(k,a){return 1110+54*Math.sin(5*a+k.coastPhase)+36*Math.cos(7*a-k.coastPhase)}
  function island(x,y){return kingdoms.find(k=>{const dx=x-k.x,dy=y-k.y,a=Math.atan2(dy,dx);return Math.hypot(dx,dy)<coast(k,a)})}
  function ground(x,y){if(island(x,y))return 'land';for(const b of bridges){if(Math.hypot(x-b.x,y-b.y)<128)return 'fort';if(segment({x,y},b.a,b.b)<64)return 'bridge'}return 'sea'}
  function solid(map,x,y,r=9){
    const points=[[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]];
    if(map===sea)return points.some(([a,b])=>ground(a,b)==='sea') || towns.some(t=>Math.abs(x-(t.x-88))<39+r && Math.abs(y-(t.y-18))<24+r || Math.abs(x-(t.x+90))<39+r && Math.abs(y-(t.y-23))<24+r);
    const room=inside.get(map);return room?points.some(([a,b])=>!room.grid.has(sq(a,b))):false;
  }
  return {sea,port,kingdoms,towns,sites,bridges,inside,creatures,coast,island,ground,solid,owns:map=>map===sea||inside.has(map)};
})();
