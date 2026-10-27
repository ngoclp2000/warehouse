import {readFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const cfg=JSON.parse(await readFile('../.qa-credentials.json','utf8'));
await unlink('../.qa-credentials.json');
assert.equal(cfg.email,'khospace-ui-qa-20261027@example.invalid','This script only accepts the disposable QA account');
const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
const check=({data,error})=>{if(error)throw error;return data};
try{
 const auth=check(await db.auth.signInWithPassword({email:cfg.email,password:cfg.password}));
 const warehouses=check(await db.from('warehouses').select('*'));
 assert.equal(warehouses.length,1);const w=warehouses[0];assert.equal(w.name,'Kho kiểm thử QA');
 const products=check(await db.from('products').select('*').eq('warehouse_id',w.id));assert.equal(products.length,1);
 const racks=check(await db.from('racks').select('*').eq('warehouse_id',w.id));const p=products[0],r=racks[0];
 const payload={p_warehouse:w.id,p_product:p.id,p_kind:'out',p_qty:20,p_from:r.id,p_to:null,p_note:'Concurrent QA',p_request:crypto.randomUUID()};
 const results=await Promise.all([db.rpc('record_movement',payload),db.rpc('record_movement',{...payload,p_request:crypto.randomUUID()})]);
 assert.equal(results.filter(x=>!x.error).length,1,'Only one competing withdrawal may succeed');
 assert.equal(results.filter(x=>x.error?.message.includes('vượt quá')).length,1);
 const balances=check(await db.from('stock_balances').select('*').eq('product_id',p.id));assert.equal(balances[0].qty,4);
 const anon=createClient(cfg.url,cfg.key,{auth:{persistSession:false}});
 const anonymous=await anon.from('products').select('*');assert.ok(anonymous.error,'Anonymous clients must not read inventory');
 console.log('PASS: Supabase password login; REST reads; two concurrent withdrawals; balance remains 4; unauthenticated REST read blocked.');
 // Refill the QA-only warehouse and prepare a representative multi-rack view for visual checks.
 check(await db.rpc('record_movement',{...payload,p_kind:'in',p_qty:236,p_from:null,p_to:r.id,p_request:crypto.randomUUID(),p_note:'QA refill'}));
 const cats=check(await db.from('categories').insert(['Hàng tiêu dùng','Điện tử','Vật tư'].map(name=>({warehouse_id:w.id,name}))).select());
 check(await db.from('racks').update({z:-5,x:-8}).eq('id',r.id));
 const newRacks=[];for(const [row,zone] of ['A','B','C'].entries())for(let i=0;i<4;i++){if(zone==='A'&&i===0)continue;newRacks.push({warehouse_id:w.id,code:`${zone}-0${i+1}`,zone,x:-8+i*5,z:-5+row*5})}
 const rr=check(await db.from('racks').insert(newRacks).select());
 const samples=[['QA-002','Nước giặt 3,6 kg','chai',128,'Hàng tiêu dùng','A-01'],['QA-003','Khăn giấy hộp 180 tờ','hộp',360,'Hàng tiêu dùng','A-02'],['QA-004','Tai nghe Bluetooth','cái',85,'Điện tử','B-01'],['QA-005','Cáp USB Type-C','sợi',18,'Điện tử','B-02'],['QA-006','Băng keo đóng thùng','cuộn',180,'Vật tư','C-01'],['QA-007','Găng tay bảo hộ','đôi',96,'Vật tư','C-02'],['QA-008','Nước rửa chén 750 ml','chai',12,'Hàng tiêu dùng','A-03']];
 for(const [sku,name,unit,qty,category,rack] of samples){const prod=check(await db.from('products').insert({warehouse_id:w.id,sku,name,unit,min_qty:25,category_id:cats.find(c=>c.name===category).id}).select().single());check(await db.rpc('record_movement',{p_warehouse:w.id,p_product:prod.id,p_kind:'in',p_qty:qty,p_from:null,p_to:[...rr,r].find(x=>x.code===rack).id,p_note:'Temporary QA data',p_request:crypto.randomUUID()}))}
 console.log('PASS: categories, products and 12 racks written through authenticated REST. Temporary QA rows will be removed after browser checks.');
 await db.auth.signOut();
}catch(e){console.error(e.message);process.exitCode=1}
