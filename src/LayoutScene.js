import * as THREE from 'three';
export function createLayoutScene({scene,objects,warehouse,box,label}){
 const walls=[],doors=[],byId=new Map(),root=new THREE.Group();scene.add(root);
 for(const o of objects){
  const g=new THREE.Group();g.position.set(Number(o.x),0,Number(o.z));g.rotation.y=-Number(o.rotation)*Math.PI/180;root.add(g);g.userData.layout=o.id;g.userData.base=o;byId.set(o.id,g);
  const w=Number(o.width),d=Number(o.depth),h=Number(o.height);
  if(o.kind==='wall'){box(g,w,h,d,0xbfcbb7,0,h/2,0);walls.push(g)}
  else if(o.kind==='door'){
   // A separate door opening, frame and outward-opening leaf.
   box(g,.07,h,d,0x526c60,-w/2,h/2,0);box(g,.07,h,d,0x526c60,w/2,h/2,0);box(g,w,.07,d,0x526c60,0,h,0);
   const hinge=new THREE.Group();hinge.position.x=-w/2;g.add(hinge);box(hinge,w,h-.08,.06,0x78a497,w/2,(h-.08)/2,0);doors.push(hinge);label(g,o.name,0,h+.3,0);
  }else if(o.kind==='table'){
   box(g,w,.09,d,0xc49b70,0,h-.045,0);for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.08,d/2-.08])box(g,.07,h-.09,.07,0x69796d,x,(h-.09)/2,z);label(g,o.name,0,h+.3,0);
  }else if(o.kind==='machine'){
   box(g,w,h*.8,d,0x7c91a8,0,h*.4,0);box(g,w*.65,h*.2,d*.7,0x526b82,0,h*.9,0);box(g,w*.35,h*.18,.03,0xb8d9da,0,h*.65,d/2+.02);label(g,o.name,0,h+.3,0);
  }else if(o.kind==='bin'){
   const body=new THREE.Mesh(new THREE.CylinderGeometry(.43,.35,.86,24),new THREE.MeshStandardMaterial({color:0x657e89,roughness:.85}));body.scale.set(w,h,d);body.position.y=h*.43;body.castShadow=true;g.add(body);
   box(g,w,.08*h,d,0x3b515c,0,h*.9,0);box(g,w*.35,.05*h,d*.22,0x263b45,0,h*.965,0);label(g,o.name,0,h+.3,0);
  }else {box(g,w,.025,d,0xc1d9c2,0,.015,0);label(g,o.name,0,.12,0)}
 }
 return {root,byId,update(camera,{visible,doorOpen,selected}){for(const g of walls){const p=g.position;const boundary=Math.abs(p.x)>Number(warehouse.width)/2-.4||Math.abs(p.z)>Number(warehouse.depth)/2-.4;const above=camera.position.y>Math.hypot(camera.position.x,camera.position.z)*2;g.visible=g.userData.layout===selected||visible&&(!boundary||above||p.x*camera.position.x+p.z*camera.position.z<0)}for(const hinge of doors)hinge.rotation.y=doorOpen?-Math.PI/2:0;}};
}
