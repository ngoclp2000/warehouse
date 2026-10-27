// Tier 1 is the lowest deck. Bin 1 starts at the rack's local left edge.
export function locationLabel(location,rack){
 const code=rack?.code||'Kệ';
 if(!location||!Number(location.tier))return `${code} · Chưa phân ô`;
 return `${code}-T${String(location.tier).padStart(2,'0')}-O${String(location.bin).padStart(2,'0')}`;
}
export function activeLocations(locations,rack,{unassigned=false}={}){
 if(!rack)return [];
 return locations.filter(l=>l.rack_id===rack.id&&(l.tier>0||unassigned)&&l.tier<=Number(rack.shelf_count??3)&&l.bin<=Number(rack.bins_per_shelf??1)).sort((a,b)=>a.tier-b.tier||a.bin-b.bin);
}
export function enrichLocationBalances(balances,locations,racks){
 const lm=new Map(locations.map(l=>[l.id,l])),rm=new Map(racks.map(r=>[r.id,r]));
 return balances.map(b=>{const l=lm.get(b.location_id);return {...b,tier:l?.tier??0,bin:l?.bin??0,locationLabel:locationLabel(l,rm.get(b.rack_id))}});
}
export function rackTotals(balances){
 const result=new Map();for(const b of balances){const key=`${b.product_id}:${b.rack_id}`;const current=result.get(key);if(current)current.qty+=Number(b.qty);else result.set(key,{product_id:b.product_id,rack_id:b.rack_id,qty:Number(b.qty)})}return [...result.values()];
}
export function stockPlacement(rack,tiers,item,index,count){
 const rawBins=Number(rack.bins_per_shelf??1),binCount=Number.isInteger(rawBins)&&rawBins>=1&&rawBins<=20?rawBins:1,bin=Math.min(binCount,Math.max(1,Number(item.bin)||1)),tierIndex=Math.min(tiers.length-1,Math.max(0,Number(item.tier||1)-1));
 const width=Math.max(.1,Number(rack.width)-.16),depth=Math.max(.1,Number(rack.depth)-.16),binWidth=width/binCount;
 const cols=Math.max(1,Math.min(10,Math.floor(binWidth/.32))),rows=Math.max(1,Math.min(6,Math.floor(depth/.32))),perLayer=cols*rows,layers=Math.max(1,Math.ceil(count/perLayer)),tier=tiers[tierIndex];
 const slot=index%perLayer,layer=Math.floor(index/perLayer),pitch=tier.clearance*.8/layers,bh=Math.min(.34,pitch*.85);
 return {x:-width/2+(bin-1)*binWidth+(slot%cols+.5)*binWidth/cols,z:depth/2-(Math.floor(slot/cols)+.5)*depth/rows,y:tier.y+tier.thickness/2+layer*pitch+bh/2,w:binWidth/cols*.82,d:depth/rows*.82,h:bh};
}
