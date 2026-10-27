import test from 'node:test';import assert from 'node:assert/strict';import {searchProducts} from '../src/productSearch.js';
const rows=[{id:'1',sku:'BK-001',name:'Băng keo trong'},{id:'2',sku:'BK-002',name:'Băng keo trong'},{id:'3',sku:'BK-003',name:'Băng keo vàng'}];
test('voice phrase and accentless names return all duplicate names',()=>{assert.equal(searchProducts(rows,'Tìm băng keo trong').length,2);assert.equal(searchProducts(rows,'bang keo').length,3)});
test('spoken query does not pick an arbitrary product and SKU ranks first',()=>{assert.equal(searchProducts(rows,'BK001')[0].id,'1');assert.equal(searchProducts(rows,'Tìm băng keo còn ở kệ nào').length,3);assert.deepEqual(searchProducts(rows,'   '),[]);assert.deepEqual(searchProducts(rows,'khong co'),[])});
