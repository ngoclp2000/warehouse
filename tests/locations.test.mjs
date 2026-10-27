import test from 'node:test';
import assert from 'node:assert/strict';
import {activeLocations,locationLabel,enrichLocationBalances,stockPlacement,rackTotals} from '../src/locations.js';
import {buildLocatedRackStock} from '../src/stockVisualization.js';
import {rackLevels,placementError} from '../src/geometry.js';
const rack={id:'r',code:'Rack 1',shelf_count:6,bins_per_shelf:2,width:3,depth:1,height:2},products=[{id:'p',sku:'P',unit:'cái'}];
const locations=[{id:'old',rack_id:'r',tier:0,bin:0},{id:'a',rack_id:'r',tier:1,bin:1},{id:'b',rack_id:'r',tier:6,bin:2},{id:'inactive',rack_id:'r',tier:7,bin:1},{id:'other',rack_id:'other',tier:1,bin:1}];
test('active locations preserve legacy bucket but exclude removed tiers and other racks',()=>{
 assert.deepEqual(activeLocations(locations,rack).map(l=>l.id),['a','b']);
 assert.deepEqual(activeLocations(locations,rack,{unassigned:true}).map(l=>l.id),['old','a','b']);
 assert.equal(locationLabel(locations[2],rack),'Rack 1-T06-O02');
 assert.match(locationLabel(locations[0],rack),/Chưa phân ô/);
});
test('spatial stock preserves totals but never places unassigned stock on a shelf',()=>{
 const balances=enrichLocationBalances([{product_id:'p',rack_id:'r',location_id:'old',qty:7},{product_id:'p',rack_id:'r',location_id:'a',qty:10},{product_id:'p',rack_id:'r',location_id:'b',qty:20}],locations,[rack]);
 const stock=buildLocatedRackStock('r',balances,products);
 assert.equal(stock.total,37);assert.equal(stock.unassignedTotal,7);
 assert.equal(stock.groups.reduce((s,g)=>s+g.quantity,0),30);
 assert.equal(stock.groups.filter(g=>g.locationId==='b').reduce((s,g)=>s+g.quantity,0),20);
 assert.ok(stock.groups.every(g=>g.tier>0&&g.rackQuantity===37));
 assert.equal(rackTotals(balances)[0].qty,37);
});
test('large quantities stay in the exact bin and tier without crossing its geometry',()=>{
 const tiers=rackLevels(2,6);
 for(const count of [1,10,180])for(let i=0;i<count;i++){
  const p=stockPlacement(rack,tiers,{tier:6,bin:2},i,count),tier=tiers[5];
  assert.ok(p.x-p.w/2>=0);assert.ok(p.x+p.w/2<=1.5);
  assert.ok(p.y-p.h/2>=tier.y+tier.thickness/2-1e-9);assert.ok(p.y+p.h/2<=2);
  assert.ok(Math.abs(p.z)+p.d/2<=.5);
 }
});
test('invalid bin counts are rejected before saving rack geometry',()=>{
 for(const bins of [0,1.2,21])assert.match(placementError({...rack,x:0,z:0,bins_per_shelf:bins},{width:24,depth:14},[]),/Số ô/);
});
