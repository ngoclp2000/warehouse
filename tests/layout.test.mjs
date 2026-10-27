import test from 'node:test';
import assert from 'node:assert/strict';
import {drawLayoutWall,layoutError,newLayoutObject,transformedLayoutObject} from '../src/layoutGeometry.js';
test('wall endpoints preserve its centre, length and arbitrary angle',()=>{
 const wall=drawLayoutWall({x:-3,z:1},{x:0,z:5},newLayoutObject('wall'));
 assert.equal(wall.width,5);assert.equal(wall.x,-1.5);assert.equal(wall.z,3);
 assert.ok(Math.abs(wall.rotation-53.130102)<.00001);
 assert.equal(layoutError(wall,{width:24,depth:14}),'');
});
test('3D gizmo changes map to stored dimensions and normalised rotation',()=>{
 const o=transformedLayoutObject(newLayoutObject('machine'),{x:2,z:-3},{x:2,y:1.5,z:.5},Math.PI/2);
 assert.equal(o.width,3.2);assert.equal(o.height,2.4);assert.equal(o.depth,.7);assert.equal(o.rotation,270);
});
test('rotated bounds reject a protruding corner and invalid gizmo scales',()=>{
 const w={width:24,depth:14},o={...newLayoutObject('machine'),x:11,rotation:45,width:3};
 assert.ok(layoutError(o,w));assert.ok(layoutError({...o,x:0,height:-1},w));
 assert.ok(layoutError({...o,x:0,width:''},w));
});
