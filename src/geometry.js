export function rackBounds(r){return {w:[90,270].includes(Number(r.rotation))?Number(r.depth):Number(r.width),d:[90,270].includes(Number(r.rotation))?Number(r.width):Number(r.depth)}}
export function collision(r,racks){const a=rackBounds(r);return racks.some(t=>{if(t.id===r.id)return false;const b=rackBounds(t);return Math.abs(t.x-r.x)<(a.w+b.w)/2+.15&&Math.abs(t.z-r.z)<(a.d+b.d)/2+.15})}
export function snap(value,step=.5){return Math.round(value/step)*step}
export function inBounds(r,warehouse){const {w,d}=rackBounds(r);return Math.abs(Number(r.x))+w/2<=Number(warehouse.width)/2+1e-7&&Math.abs(Number(r.z))+d/2<=Number(warehouse.depth)/2+1e-7}
export function placementError(r,warehouse,racks){const bins=Number(r.bins_per_shelf??1);if(!Number.isInteger(bins)||bins<1||bins>20)return 'Số ô mỗi tầng phải là số nguyên từ 1 đến 20.';const levels=Number(r.shelf_count??3);if(!Number.isInteger(levels)||levels<1||levels>20)return 'Số tầng kệ phải là số nguyên từ 1 đến 20.';if(!['x','z','width','depth','height'].every(k=>Number.isFinite(Number(r[k]))))return 'Kích thước không hợp lệ.';if(r.width<.5||r.depth<.5||r.width>20||r.depth>20||r.height<1||r.height>12)return 'Kệ rộng / sâu từ 0,5–20 m, cao từ 1–12 m.';if(!inBounds(r,warehouse))return 'Kệ nằm ngoài mặt bằng kho.';if(collision(r,racks))return 'Kệ chồng lên vị trí khác. Cần cách tối thiểu 15 cm.';return ''}
export function nextRackCode(zone,racks){const used=new Set(racks.map(r=>r.code.toUpperCase()));let i=1;while(used.has(`${zone}-${String(i).padStart(2,'0')}`))i++;return `${zone}-${String(i).padStart(2,'0')}`}
export function rectangleRack(anchor,point,template,exactAnchor=false){const x1=exactAnchor?anchor.x:snap(anchor.x),z1=exactAnchor?anchor.z:snap(anchor.z),x2=snap(point.x),z2=snap(point.z);const width=Math.abs(x2-x1),depth=Math.abs(z2-z1),turned=[90,270].includes(Number(template.rotation));return {...template,x:(x1+x2)/2,z:(z1+z2)/2,width:turned?depth:width,depth:turned?width:depth}}
export function snappedRack(r,point,warehouse){const {w,d}=rackBounds(r);return {...r,x:Math.max(-warehouse.width/2+w/2,Math.min(warehouse.width/2-w/2,snap(point.x))),z:Math.max(-warehouse.depth/2+d/2,Math.min(warehouse.depth/2-d/2,snap(point.z)))}}

// N equally spaced storage tiers within the total rack height; deck thickness
// stays inside each tier. Nominal pitch = total height / number of tiers.
export function rackLevels(height,count=3){
 const h=Number(height),n=Number(count);
 if(!Number.isFinite(h)||h<=0||!Number.isInteger(n)||n<1||n>20)throw Error('Invalid rack tiers');
 const pitch=h/n,thickness=Math.min(.09,pitch*.1);
 return Array.from({length:n},(_,index)=>({y:index*pitch+thickness/2,thickness,pitch,clearance:pitch-thickness}));
}
