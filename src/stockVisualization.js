// Quantity symbols, not physical packaging: each bucket retains an exact count.
export function stockColor(id){let hash=2166136261;for(const c of String(id)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}return `hsl(${(hash>>>0)%360}, 52%, 55%)`}
export function buildRackStock(rackId,balances,products,maxBoxes=180){
 const productMap=new Map(products.map(p=>[p.id,p])),counts=new Map();
 for(const b of balances){const qty=Number(b.qty);if(b.rack_id!==rackId||!Number.isSafeInteger(qty)||qty<=0)continue;counts.set(b.product_id,(counts.get(b.product_id)||0)+qty)}
 const items=[...counts].map(([productId,quantity])=>{const p=productMap.get(productId);return {productId,quantity,sku:p?.sku||'Chưa rõ mã',name:p?.name||'Hàng hóa',unit:p?.unit||'đơn vị',color:stockColor(productId)}}).sort((a,b)=>a.sku.localeCompare(b.sku)||a.productId.localeCompare(b.productId));
 const total=items.reduce((sum,p)=>sum+p.quantity,0),units=new Map();for(const p of items)units.set(p.unit,(units.get(p.unit)||0)+p.quantity);
 const unitSummary=[...units].map(([unit,qty])=>`${qty.toLocaleString('vi-VN')} ${unit}`).join(' · ');
 if(!items.length)return {items,groups:[],total,unitSummary:'Trống',grouped:false};
 const limit=Math.max(2,Math.floor(maxBoxes)),visible=items.length>limit?items.slice(0,limit-1):items,overflow=items.slice(visible.length);
 const slots=visible.map(()=>1);let remaining=Math.min(limit-(overflow.length?1:0),visible.reduce((s,p)=>s+p.quantity,0))-visible.length;
 while(remaining>0){let best=-1,ratio=0;for(let i=0;i<visible.length;i++){if(slots[i]<visible[i].quantity&&visible[i].quantity/slots[i]>ratio){ratio=visible[i].quantity/slots[i];best=i}}if(best<0)break;slots[best]++;remaining--}
 const groups=[];visible.forEach((p,i)=>{const base=Math.floor(p.quantity/slots[i]),remainder=p.quantity%slots[i];for(let n=0;n<slots[i];n++)groups.push({...p,quantity:base+(n<remainder?1:0),rackQuantity:p.quantity})});
 if(overflow.length)groups.push({productId:null,quantity:overflow.reduce((s,p)=>s+p.quantity,0),items:overflow,sku:`${overflow.length} mã khác`,name:'Nhóm hàng',unit:'đơn vị',color:'#7b8794',overflow:true});
 return {items,groups,total,unitSummary,grouped:groups.some(g=>g.quantity>1||g.overflow)};
}
