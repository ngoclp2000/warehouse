export const objectNames={wall:'Tường',door:'Cửa',table:'Bàn thao tác',machine:'Máy',area:'Khu vực',bin:'Thùng rác'};
export const objectColors={wall:'#a7b4a2',door:'#76a99c',table:'#bd956a',machine:'#8498b8',area:'#dbe9dc',bin:'#6d8590'};
export const objectDefaults={wall:{width:3,depth:.18,height:3.2},door:{width:2.2,depth:.18,height:2.6},table:{width:3,depth:1,height:.85},machine:{width:1.6,depth:1.4,height:1.6},area:{width:4,depth:3,height:.02},bin:{width:.5,depth:.5,height:.75}};
export function newLayoutObject(kind){return {kind,name:objectNames[kind],...objectDefaults[kind],x:0,z:0,rotation:0}}
export function layoutError(o,w){
 if(!objectNames[o.kind])return 'Chọn loại đối tượng.';
 if(!o.name?.trim()||o.name.length>80)return 'Tên cần từ 1–80 ký tự.';
 if(!['x','z','width','depth','height','rotation'].every(k=>typeof o[k]!=='string'&&Number.isFinite(Number(o[k]))))return 'Thông số phải là số hợp lệ.';
 if(o.width<.1||o.depth<.1||o.width>200||o.depth>200||o.height<.02||o.height>12||o.rotation<0||o.rotation>=360)return 'Kích thước hoặc góc xoay không hợp lệ.';
 const a=o.rotation*Math.PI/180,wid=Math.abs(Math.cos(a))*o.width+Math.abs(Math.sin(a))*o.depth,dep=Math.abs(Math.sin(a))*o.width+Math.abs(Math.cos(a))*o.depth;
 return Math.abs(o.x)+wid/2>w.width/2+1e-6||Math.abs(o.z)+dep/2>w.depth/2+1e-6?'Đối tượng nằm ngoài kho.':'';
}
export function drawLayoutWall(a,b,template){const dx=b.x-a.x,dz=b.z-a.z;return {...template,x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:Math.hypot(dx,dz),rotation:(Math.atan2(dz,dx)*180/Math.PI+360)%360}}
export function transformedLayoutObject(base,position,scale,rotation){const round=n=>Math.round(n*1000)/1000;return {...base,x:round(position.x),z:round(position.z),width:round(Number(base.width)*scale.x),depth:round(Number(base.depth)*scale.z),height:round(Number(base.height)*scale.y),rotation:round((-rotation*180/Math.PI%360+360)%360)%360}}
