"""Prepare an existing Velha Vila development export for this server."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

parser = argparse.ArgumentParser()
parser.add_argument('index', type=Path)
parser.add_argument('endpoint')
parser.add_argument('output', type=Path)
args = parser.parse_args()
url = urlparse(args.endpoint)
if url.scheme not in ('ws', 'wss') or not url.hostname or url.path != '/ws':
    parser.error('Expected a ws:// or wss:// endpoint ending in /ws')
page = args.index.read_text()
def replace(old, new):
    global page
    if page.count(old) != 1:
        raise ValueError('Unexpected game version at ' + old[:50])
    page = page.replace(old, new)
replace("new WebSocket(proto+'//'+location.host+'/api/ws')", 'new WebSocket('+json.dumps(args.endpoint)+')')
replace("...vvPlayerState(),type:'join'", "...vvPlayerState(),sharedMobs:true,type:'join'")
replace("if(message.type==='welcome'){", "receiveCreatureEvent(message);\n  if(message.type==='welcome'){")
replace('const ws=vvSocket;vvSocket=null;', 'leaveSharedWorld();const ws=vvSocket;vvSocket=null;')
replace("vvSocket=null;vvSelfId=null;vvRemotePlayers.clear();vvNetStatus", "leaveSharedWorld();vvSocket=null;vvSelfId=null;vvRemotePlayers.clear();vvNetStatus")
replace("for(const m of (indoors?[]:mobs.filter(vvCSameMap))){\n  let d", "for(const m of (indoors||sharedSession?[]:mobs.filter(vvCSameMap))){\n  let d")
replace("m.hp=Math.max(0,m.hp-amount);", """if(sharedSession){
    if(!m.shared || vvSocket?.readyState!==WebSocket.OPEN) return false;
    vvSocket.send(JSON.stringify({type:'mob_hit',id:m.id,generation:m.generation,amount}));
    return true;
  }
  m.hp=Math.max(0,m.hp-amount);""")
replace('const rawXp=m.xp*', 'const rawXp=(m.sharedXp??m.xp)*')
replace("+' derrotado! +'+m.xp+", "+' derrotado! +'+(m.sharedXp??m.xp)+")
replace('if(!m.isBoss&&!m.instanceMap)', 'if(m.shared){ui(true);return}\n if(!m.isBoss&&!m.instanceMap)')
replace('function spawnVV13(def){', 'function spawnVV13(def){if(typeof sharedSession!=="undefined" && sharedSession)return false;')
replace("function spawn(type='Slime'){", "function spawn(type='Slime'){if(typeof sharedSession!=='undefined' && sharedSession)return;")
# Initialize before the first local spawns. The handlers only run once connected.
replace('function spawn(type=', Path(__file__).with_name('client.js').read_text()+'\nfunction spawn(type=')
replace('<script src="corrigida.js"></script>', """<script src="corrigida.js"></script><script>
const localEnsureMap=vvCEnsureMap;
vvCEnsureMap=function(map){if(!sharedSession)localEnsureMap(map)};
</script>""")
args.output.write_text(page)
