import * as THREE from 'three';
export function addStockMeshes(parent,rack,tiers,stock){
 const groups=stock.groups;if(!groups.length)return;
 const w=Number(rack.width),d=Number(rack.depth),cols=Math.max(1,Math.min(10,Math.floor(w/.32))),rows=Math.max(1,Math.min(6,Math.floor(d/.32))),perTier=cols*rows,layers=Math.ceil(groups.length/(tiers.length*perTier));
 const cw=Math.max(.1,w-.16)/cols,cd=Math.max(.1,d-.16)/rows;
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88}),groups.length);
 const tape=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xf1dfbc,roughness:.85}),groups.length);
 const m=new THREE.Object3D(),placements=[];
 groups.forEach((item,i)=>{const tier=tiers[Math.floor(i/perTier)%tiers.length],slot=i%perTier,layer=Math.floor(i/(perTier*tiers.length)),pitch=tier.clearance*.8/layers,bh=Math.min(.34,pitch*.85),bw=cw*.82,bd=cd*.82;
  const x=-Math.max(.1,w-.16)/2+(slot%cols+.5)*cw,z=Math.max(.1,d-.16)/2-(Math.floor(slot/cols)+.5)*cd,y=tier.y+tier.thickness/2+layer*pitch+bh/2;
  placements.push({x,y:y+bh/2+.008,z,w:bw*.82,d:bd*.65});m.position.set(x,y,z);m.scale.set(bw,bh,bd);m.updateMatrix();mesh.setMatrixAt(i,m.matrix);mesh.setColorAt(i,new THREE.Color(item.color));
  m.position.set(x,y+bh/2+.002,z);m.scale.set(bw*.16,.004,bd);m.updateMatrix();tape.setMatrixAt(i,m.matrix);
 });
 for(const obj of [mesh,tape]){obj.instanceMatrix.needsUpdate=true;obj.userData.stockGroups=groups;obj.castShadow=true;obj.receiveShadow=true;obj.computeBoundingSphere();parent.add(obj)}
 mesh.instanceColor.needsUpdate=true;
 const texts=groups.map(g=>g.overflow?`${g.items.length} mã`:`×${g.quantity.toLocaleString('vi-VN')}`),unique=[...new Set(texts)],atlasCols=Math.ceil(Math.sqrt(unique.length)),atlasRows=Math.ceil(unique.length/atlasCols),tileW=192,tileH=80;
 const canvas=document.createElement('canvas');canvas.width=atlasCols*tileW;canvas.height=atlasRows*tileH;const ctx=canvas.getContext('2d');
 unique.forEach((text,i)=>{const x=(i%atlasCols)*tileW,y=Math.floor(i/atlasCols)*tileH;ctx.fillStyle='#fffaf0';ctx.fillRect(x+2,y+2,tileW-4,tileH-4);ctx.fillStyle='#263b32';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 34px sans-serif';if(ctx.measureText(text).width>tileW-14)ctx.font='bold 21px sans-serif';ctx.fillText(text,x+tileW/2,y+tileH/2,tileW-14)});
 const atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.minFilter=THREE.LinearFilter;atlas.generateMipmaps=false;
 const geo=new THREE.PlaneGeometry(1,1),rects=new Float32Array(groups.length*4);
 const labels=new THREE.InstancedMesh(geo,new THREE.ShaderMaterial({uniforms:{atlas:{value:atlas}},vertexShader:'attribute vec4 labelRect; varying vec2 labelUV; void main(){labelUV=labelRect.xy+uv*labelRect.zw;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D atlas; varying vec2 labelUV; void main(){gl_FragColor=texture2D(atlas,labelUV);}',side:THREE.DoubleSide}),groups.length);
 placements.forEach((p,i)=>{const index=unique.indexOf(texts[i]);rects.set([(index%atlasCols)/atlasCols,1-(Math.floor(index/atlasCols)+1)/atlasRows,1/atlasCols,1/atlasRows],i*4);m.position.set(p.x,p.y,p.z);m.rotation.x=-Math.PI/2;m.scale.set(p.w,p.d,1);m.updateMatrix();labels.setMatrixAt(i,m.matrix)});
 geo.setAttribute('labelRect',new THREE.InstancedBufferAttribute(rects,4));labels.instanceMatrix.needsUpdate=true;labels.userData.stockGroups=groups;labels.userData.dispose=()=>atlas.dispose();labels.computeBoundingSphere();parent.add(labels);
}
