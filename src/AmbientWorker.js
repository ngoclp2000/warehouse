import * as THREE from 'three';
import {canStand,nearestFree,findPath,movePerson} from './navigation.js';
function part(parent,geometry,color,x,y,z){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function limb(parent,x,y,color,length){const group=new THREE.Group();group.position.set(x,y,0);parent.add(group);part(group,new THREE.BoxGeometry(.16,length,.18),color,0,-length/2,0);return group}
export function createAmbientWorker({scene,latest}){
 const actor=new THREE.Group();scene.add(actor);actor.visible=false;actor.name='ambient-worker';
 part(actor,new THREE.BoxGeometry(.49,.57,.3),0xe2a53b,0,1.1,0);
 part(actor,new THREE.BoxGeometry(.34,.12,.32),0xf0eacb,0,1.06,.01);
 part(actor,new THREE.SphereGeometry(.22,16,12),0xdbad83,0,1.64,0);
 part(actor,new THREE.SphereGeometry(.245,16,12,0,Math.PI*2,0,Math.PI/2),0xf0c54d,0,1.71,0);
 part(actor,new THREE.CylinderGeometry(.28,.28,.04,20),0xe8b63b,0,1.71,0);
 const leftArm=limb(actor,-.34,1.36,0xe2a53b,.53),rightArm=limb(actor,.34,1.36,0xe2a53b,.53),leftLeg=limb(actor,-.14,.79,0x364b61,.7),rightLeg=limb(actor,.14,.79,0x364b61,.7);
 part(leftLeg,new THREE.BoxGeometry(.19,.12,.3),0x263239,0,-.7,.06);part(rightLeg,new THREE.BoxGeometry(.19,.12,.3),0x263239,0,-.7,.06);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.4,32),new THREE.MeshBasicMaterial({color:0x528f6f,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;actor.add(ring);
 let position=null,route=[],phase=0,lastTime=0,waitUntil=0,targetDirection=0,swing=0,signature='',previousRacks=null,previousWidth=null,previousDepth=null;
 function spawn(s){const w=Number(s.warehouse.width),d=Number(s.warehouse.depth);for(const p of [{x:0,z:d/2-1},{x:0,z:0},{x:-w/2+1,z:d/2-1},{x:w/2-1,z:d/2-1},{x:0,z:-d/2+1}]){const free=nearestFree(p,s.warehouse,s.racks,5);if(free)return free}return null}
 function chooseRoute(s){for(let i=0;i<4;i++){const range=8,point={x:position.x+(Math.random()-.5)*range*2,z:position.z+(Math.random()-.5)*range*2};const path=findPath(position,point,s.warehouse,s.racks,2500);if(path&&path.length>3){route=path;return true}}return false}
 function update(now){const dt=Math.min(.06,Math.max(0,now-lastTime));lastTime=now;const s=latest.current;if(s.hidden)return;if(s.reducedMotion){if(!position||!canStand(position,s.warehouse,s.racks)){position=spawn(s);if(position){actor.position.set(position.x,0,position.z);actor.visible=true}}return}if(s.paused)return;if(previousRacks!==s.racks||previousWidth!==s.warehouse.width||previousDepth!==s.warehouse.depth){previousRacks=s.racks;previousWidth=s.warehouse.width;previousDepth=s.warehouse.depth;const shape=s.warehouse.width+'x'+s.warehouse.depth+'|'+s.racks.map(r=>[r.id,r.x,r.z,r.width,r.depth,r.rotation].join(':')).join('|');if(shape!==signature){signature=shape;route=[];waitUntil=now+.3}}if(!position&&now<waitUntil)return;
 if(!position||!canStand(position,s.warehouse,s.racks)){position=position&&nearestFree(position,s.warehouse,s.racks,5)||spawn(s);route=[];waitUntil=now+.5;if(!position){actor.visible=false;waitUntil=now+5;return}actor.position.set(position.x,0,position.z);actor.visible=true}
 if(!route.length&&now>=waitUntil){if(!chooseRoute(s))waitUntil=now+4}
 let moving=false;if(route.length){const waypoint=route[0],distance=Math.hypot(waypoint.x-position.x,waypoint.z-position.z);if(distance<.06)route.shift();else{const speed=Math.min(distance,1.35*dt),vx=(waypoint.x-position.x)/distance*speed,vz=(waypoint.z-position.z)/distance*speed,next=movePerson(position,vx,vz,s.warehouse,s.racks);moving=Math.hypot(next.x-position.x,next.z-position.z)>.0001;if(moving){targetDirection=Math.atan2(next.x-position.x,next.z-position.z);position=next}else route=[]}if(!route.length)waitUntil=now+.8+Math.random()*1.4}
 actor.position.set(position.x,0,position.z);const angle=THREE.MathUtils.euclideanModulo(targetDirection-actor.rotation.y+Math.PI,Math.PI*2)-Math.PI;actor.rotation.y+=angle*Math.min(1,dt*8);phase+=moving?dt*7:0;swing=THREE.MathUtils.lerp(swing,moving?Math.sin(phase)*.45:0,Math.min(1,dt*18));leftLeg.rotation.x=swing;rightLeg.rotation.x=-swing;leftArm.rotation.x=-swing*.7;rightArm.rotation.x=swing*.7;actor.position.y=moving?Math.abs(Math.sin(phase))*.025:0;
 }
 return {update,dispose:()=>{scene.remove(actor);actor.traverse(n=>{n.geometry?.dispose();n.material?.dispose()})}};
}
