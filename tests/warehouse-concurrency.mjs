import {readFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {supabase as db} from '../src/supabase.js';
const credentials=JSON.parse(await readFile('../.ambient-qa.json','utf8'));await unlink('../.ambient-qa.json');
assert.equal(credentials.email,'khospace-ambient-qa-20261027@example.invalid');
const check=r=>{if(r.error)throw r.error;return r.data};
try{
 check(await db.auth.signInWithPassword(credentials));let w=check(await db.from('warehouses').select('*').eq('name','Kho kiểm thử tự động').single());assert.equal(w.name,'Kho kiểm thử tự động');const rack=check(await db.from('racks').select('*').eq('warehouse_id',w.id).eq('code','B-01').single());
 const [resize,move]=await Promise.all([db.rpc('resize_warehouse',{p_warehouse:w.id,p_name:w.name,p_width:16,p_depth:22,p_expected:w.updated_at}),db.from('racks').update({x:9}).eq('id',rack.id).eq('updated_at',rack.updated_at).select()]);
 assert.equal([resize,move].filter(r=>!r.error).length,1,'Resize and incompatible rack move cannot both commit');
 w=check(await db.from('warehouses').select('*').eq('id',w.id).single());const racks=check(await db.from('racks').select('*').eq('warehouse_id',w.id));for(const r of racks){const width=[90,270].includes(r.rotation)?Number(r.depth):Number(r.width);assert.ok(Math.abs(Number(r.x))+width/2<=Number(w.width)/2,'No rack outside warehouse after competing operations')}
 check(await db.rpc('resize_warehouse',{p_warehouse:w.id,p_name:w.name,p_width:28,p_depth:22,p_expected:w.updated_at}));check(await db.from('racks').update({x:6}).eq('id',rack.id));
 console.log('PASS: concurrent warehouse shrink and rack move serialize correctly; no out-of-bounds geometry. QA layout restored.');
 await db.auth.signOut({scope:'local'});
}catch(error){console.error(error.message);process.exitCode=1}
