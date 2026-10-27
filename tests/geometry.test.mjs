import test from 'node:test';
import assert from 'node:assert/strict';
import {snap,rackBounds,inBounds,placementError,nextRackCode,rectangleRack,snappedRack,rackLevels} from '../src/geometry.js';
const warehouse={width:24,depth:18},base={id:'r1',code:'A-01',zone:'A',x:0,z:0,width:3.2,depth:1.6,height:3.4,rotation:0};
test('auto codes skip existing and preserve numbering beyond 99',()=>{assert.equal(nextRackCode('A',[{code:'A-01'},{code:'a-02'}]),'A-03');assert.equal(nextRackCode('B',[{code:'A-01'}]),'B-01')});
test('draw both directions and rotated footprint',()=>{const r=rectangleRack({x:3,z:2},{x:-2,z:-1},base);assert.equal(r.width,5);assert.equal(r.depth,3);assert.equal(r.x,.5);assert.equal(r.z,.5);const turned=rectangleRack({x:0,z:0},{x:4,z:2},{...base,rotation:90});assert.equal(turned.width,2);assert.equal(turned.depth,4);assert.deepEqual(rackBounds(turned),{w:4,d:2})});
test('resize preserves exact opposite corner',()=>{const r=rectangleRack({x:-1.6,z:-.8},{x:3,z:2},base,true);assert.equal(r.width,4.6);assert.equal(r.depth,2.8);assert.ok(Math.abs(r.x-r.width/2+1.6)<1e-9)});
test('snap and warehouse boundaries respect rotated racks',()=>{assert.equal(snap(1.24),1);assert.equal(snap(1.26),1.5);const r=snappedRack({...base,rotation:90},{x:100,z:100},warehouse);assert.equal(r.x,11.2);assert.equal(r.z,7.4);assert.equal(inBounds(r,warehouse),true);assert.equal(inBounds({...r,x:12},warehouse),false)});
test('reject overlap, out-of-bounds and tiny drawing; allow own resize',()=>{assert.match(placementError({...base,id:'new'},warehouse,[base]),/chồng/);assert.match(placementError({...base,x:20},warehouse,[]),/ngoài/);assert.match(placementError({...base,width:0},warehouse,[]),/0,5/);assert.equal(placementError(base,warehouse,[base]),'');assert.equal(placementError({...base,id:'new',x:5},warehouse,[base]),'')});

test('rack tiers divide total height equally and keep decks within the frame',()=>{
 for(const count of [1,3,5,20]){const tiers=rackLevels(4,count);assert.equal(tiers.length,count);
 for(const [i,t] of tiers.entries()){assert.equal(t.pitch,4/count);assert.ok(t.y-t.thickness/2>=-1e-10);assert.ok(t.y+t.thickness/2<=4);if(i)assert.ok(Math.abs(t.y-tiers[i-1].y-4/count)<1e-10)}}
 assert.throws(()=>rackLevels(4,0));assert.throws(()=>rackLevels(4,2.5));
});
test('rack placement rejects fractional or out-of-range tier counts',()=>{
 for(const shelf_count of [0,21,2.5])assert.ok(placementError({...base,shelf_count},warehouse,[]));
 assert.equal(placementError({...base,shelf_count:5},warehouse,[]),'');
});
