import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {canStand,nearestFree,findPath,movePerson} from '../src/navigation.js';
import {createAmbientWorker} from '../src/AmbientWorker.js';
const warehouse={width:24,depth:18};const racks=[{id:'r1',x:0,z:0,width:3.2,depth:1.6,rotation:0},{id:'r2',x:4,z:3,width:3,depth:1.5,rotation:90}];
test('pedestrian collision respects rotated racks and walls',()=>{assert.equal(canStand({x:0,z:0},warehouse,racks),false);assert.equal(canStand({x:4,z:4},warehouse,racks),false);assert.equal(canStand({x:12,z:0},warehouse,racks),false);assert.equal(canStand({x:-3,z:0},warehouse,racks),true)});
test('path routes around rack without diagonal corner cutting',()=>{const path=findPath({x:-4,z:0},{x:4,z:0},warehouse,[racks[0]]);assert.ok(path&&path.length>10);for(const p of path)assert.equal(canStand(p,warehouse,[racks[0]]),true);assert.ok(path.some(p=>Math.abs(p.z)>=1.5))});
test('disconnected floor does not teleport through a barrier',()=>{const wall=[{id:'barrier',x:0,z:0,width:1,depth:18,rotation:0}];assert.equal(findPath({x:-5,z:0},{x:5,z:0},warehouse,wall),null)});
test('nearest free and movement reject an occupied point',()=>{const free=nearestFree({x:0,z:0},warehouse,racks);assert.ok(free&&canStand(free,warehouse,racks));const from={x:-2,z:0};const next=movePerson(from,.2,0,warehouse,racks);assert.equal(next.x,from.x)});
test('decorative worker moves automatically and never mutates selected rack',()=>{const scene=new THREE.Scene(),latest={current:{warehouse,racks,paused:false,reducedMotion:false,hidden:false}},worker=createAmbientWorker({scene,latest}),actor=scene.getObjectByName('ambient-worker');let first=null,moved=false;for(let i=0;i<2400;i++){worker.update(i/60);if(actor.visible){const p={x:actor.position.x,z:actor.position.z};assert.equal(canStand(p,warehouse,racks),true);if(!first)first=p;else if(Math.hypot(p.x-first.x,p.z-first.z)>1)moved=true}}assert.ok(moved);worker.dispose();assert.equal(scene.children.length,0)});
test('paused decorative worker stays in place',()=>{const scene=new THREE.Scene(),latest={current:{warehouse,racks,paused:false,reducedMotion:false,hidden:false}},worker=createAmbientWorker({scene,latest});for(let i=0;i<100;i++)worker.update(i/60);const actor=scene.getObjectByName('ambient-worker'),before=actor.position.clone();latest.current.paused=true;for(let i=100;i<200;i++)worker.update(i/60);assert.ok(actor.position.equals(before));worker.dispose()});
test('diagonal drawn walls block walking along their actual rotated footprint',()=>{
 const wall={x:0,z:0,width:8,depth:.18,rotation:45};
 assert.equal(canStand({x:2,z:2},warehouse,[wall]),false);
 assert.equal(canStand({x:2,z:-2},warehouse,[wall]),true);
});
