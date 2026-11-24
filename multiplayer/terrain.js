const house={x:230,y:55,w:250,h:230};
function terrainHash(ix,iy,k=0){let n=Math.sin(ix*127.1+iy*311.7+k*79.3)*43758.5453123;return n-Math.floor(n)}
const TREE_GRID=255,TREE_RADIUS=25;
function treeAt(ix,iy){
 if(terrainHash(ix,iy,0)<.19)return null;
 const x=ix*TREE_GRID+60+terrainHash(ix,iy,1)*112;
 const y=iy*TREE_GRID+55+terrainHash(ix,iy,2)*115;
 if(x>house.x-95&&x<house.x+house.w+95&&y>house.y-96&&y<house.y+house.h+110)return null;
 // Estradas livres e uma faixa segura até a porta.
 if(Math.abs(y-196)<64||Math.abs(x-355)<68)return null;
 return {x,y};
}
function nearbyTrees(x,y,pad=50){const result=[];let ax=Math.floor((x-pad-205)/TREE_GRID),bx=Math.floor((x+pad+205)/TREE_GRID),ay=Math.floor((y-pad-200)/TREE_GRID),by=Math.floor((y+pad+200)/TREE_GRID);for(let iy=ay;iy<=by;iy++)for(let ix=ax;ix<=bx;ix++){let t=treeAt(ix,iy);if(t&&Math.abs(t.x-x)<pad+TREE_RADIUS&&Math.abs(t.y-y)<pad+TREE_RADIUS)result.push(t)}return result}
function vvTreeShape(x,y){
 const pine=Math.abs(Math.floor(x/30))%3===0;
 const nearHome=Math.hypot(x-355,y-250)<620;
 const grove=terrainHash(Math.floor(x/680),Math.floor(y/680),92);
 const variation=terrainHash(x,y,21);
 const scale=nearHome?4.7+.3*variation:2.5+1.55*grove+.95*variation;
 const w=scale*(pine?77:97),h=scale*(pine?107:94);
 return {pine,w,h,cx:x+w*(pine?.025:-.035),cy:y+16-h*.075,rx:w*(pine?.15:.235),ry:h*.08};
}

export function surfaceSolid(x,y,r=10){
 if(x+r>house.x-8&&x-r<house.x+house.w+8&&y+r>house.y+10&&y-r<house.y+house.h)return true;
 return nearbyTrees(x,y,r+145).some(t=>{
 const b=vvTreeShape(t.x,t.y);
 return ((x-b.cx)/(b.rx+r))**2+((y-b.cy)/(b.ry+r))**2<=1;
 });
}
