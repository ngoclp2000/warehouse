import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRackStock,stockColor} from '../src/stockVisualization.js';
const products=[{id:'a',sku:'A',name:'Alpha',unit:'cái'},{id:'b',sku:'B',name:'Beta',unit:'chai'}];
test('empty/zero rack contains no boxes and other racks do not leak into view',()=>{
 const s=buildRackStock('r',[{rack_id:'r',product_id:'a',qty:0},{rack_id:'other',product_id:'b',qty:20}],products);
 assert.equal(s.total,0);assert.deepEqual(s.groups,[]);assert.equal(s.unitSummary,'Trống');
});
test('small quantities draw one box per unit without multiplying stock by shelf count',()=>{
 const s=buildRackStock('r',[{rack_id:'r',product_id:'a',qty:4},{rack_id:'r',product_id:'b',qty:7}],products);
 assert.equal(s.groups.length,11);assert.ok(s.groups.every(g=>g.quantity===1));assert.equal(s.unitSummary,'4 cái · 7 chai');
});
test('large quantities are bounded but every product retains its exact total and unit',()=>{
 const s=buildRackStock('r',[{rack_id:'r',product_id:'a',qty:5},{rack_id:'r',product_id:'b',qty:1000000}],products);
 assert.ok(s.groups.length<=180);assert.equal(s.total,1000005);
 for(const p of s.items)assert.equal(s.groups.filter(g=>g.productId===p.productId).reduce((n,g)=>n+g.quantity,0),p.quantity);
 assert.ok(s.grouped);assert.equal(stockColor('a'),s.items[0].color);
});
test('hundreds of SKUs use a labelled overflow group without losing counts',()=>{
 const list=Array.from({length:250},(_,i)=>({id:`p${i}`,sku:`P${i}`,unit:'hộp'}));
 const s=buildRackStock('r',list.map((p,i)=>({rack_id:'r',product_id:p.id,qty:i+1})),list);
 assert.equal(s.groups.length,180);assert.equal(s.groups.reduce((n,g)=>n+g.quantity,0),250*251/2);
 assert.ok(s.groups.at(-1).overflow);assert.equal(s.groups.at(-1).items.length,71);
});
test('quantity changes rebuild exact buckets and skip removed stock',()=>{
 const s=buildRackStock('r',[{rack_id:'r',product_id:'a',qty:0},{rack_id:'r',product_id:'b',qty:12}],products);
 assert.equal(s.items.length,1);assert.equal(s.items[0].productId,'b');assert.equal(s.total,12);
});
