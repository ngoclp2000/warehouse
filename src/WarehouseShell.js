import * as THREE from 'three';

// A dimension-driven perimeter. Front entrance follows the supplied floor plan.
export function createWarehouseShell({scene,width,depth,box,label}) {
 const root=new THREE.Group(),walls=[];
 scene.add(root);
 const height=3.2,thickness=.18,doorWidth=Math.min(2.4,width*.2),doorHeight=2.6;
 const doorX=width/6,front=depth/2;
 function wall(side,w,h,d,x,y,z){
  const mesh=box(root,w,h,d,0xd5dbd0,x,y,z);
  mesh.userData.side=side;walls.push(mesh);return mesh;
 }
 wall('back',width+thickness,height,thickness,0,height/2,-depth/2);
 wall('left',thickness,height,depth,-width/2,height/2,0);
 wall('right',thickness,height,depth,width/2,height/2,0);
 const leftLength=width/2+doorX-doorWidth/2,rightLength=width/2-doorX-doorWidth/2;
 wall('front',leftLength,height,thickness,-width/2+leftLength/2,height/2,front);
 wall('front',rightLength,height,thickness,width/2-rightLength/2,height/2,front);
 wall('front',doorWidth,height-doorHeight,thickness,doorX,doorHeight+(height-doorHeight)/2,front);
 // Door swings outward, preserving the usable aisle inside the warehouse.
 const door=new THREE.Group();door.position.set(doorX-doorWidth/2,0,front);root.add(door);
 box(door,doorWidth,doorHeight,.08,0x718f87,doorWidth/2,doorHeight/2,0);
 box(door,.08,.12,.14,0xd8bd77,doorWidth-.18,1.15,.08);
 box(root,doorWidth,.025,.5,0xd6bd7e,doorX,.015,front);
 label(root,`CỬA ${doorWidth.toFixed(1)} m`,doorX,.35,front+.7);
 let open=true;
 return {
  update(camera,{visible=true,doorOpen=true}={}){
   root.visible=visible;if(!visible)return;
   open=doorOpen;door.rotation.y=open?-Math.PI/2:0;
   // Hide only the perimeter facing the camera. Top view displays all walls.
   const dx=camera.position.x,dz=camera.position.z;
   const overhead=camera.position.y>Math.hypot(dx,dz)*2;
   for(const mesh of walls){const s=mesh.userData.side;
    mesh.visible=overhead||!((s==='front'&&dz>0)||(s==='back'&&dz<0)||(s==='right'&&dx>0)||(s==='left'&&dx<0));
   }
   door.visible=overhead||dz<=0||open;
  }
 };
}
