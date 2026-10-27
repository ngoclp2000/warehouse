import React from 'react';
import {Alert,NumberInput,Select,SegmentedControl,Text,TextInput} from '@mantine/core';
import {activeLocations,locationLabel} from './locations';
export default function MovementFields({form,setForm,products,racks,locations,balances}){
 function change(patch){setForm(f=>({...f,...patch,request_id:crypto.randomUUID()}))}
 const quantity=id=>balances.find(b=>b.product_id===form.product_id&&b.location_id===id)?.qty||0;
 const source=racks.find(r=>r.id===form.from_rack_id),destination=racks.find(r=>r.id===form.to_rack_id);
 const sourceLocations=activeLocations(locations,source,{unassigned:true}).filter(l=>quantity(l.id)>0);
 const targetLocations=activeLocations(locations,destination).filter(l=>l.id!==form.from_location_id);
 const available=quantity(form.from_location_id);
 return <>
  <SegmentedControl fullWidth value={form.kind} onChange={kind=>change({kind,from_location_id:null,to_location_id:null})} data={[{value:'in',label:'Nhập kho'},{value:'out',label:'Xuất kho'},{value:'transfer',label:'Chuyển vị trí'}]}/>
  <Select label="Hàng hóa" searchable required value={form.product_id} onChange={product_id=>change({product_id,from_location_id:null})} data={products.map(p=>({value:p.id,label:`${p.sku} — ${p.name}`}))}/>
  {form.kind!=='in'&&<>
   <Select label="Kệ nguồn" required searchable value={form.from_rack_id} onChange={from_rack_id=>change({from_rack_id,from_location_id:null})} data={racks.map(r=>({value:r.id,label:r.code}))}/>
   <Select label="Tầng / ô nguồn" placeholder="Chọn vị trí có hàng" required searchable value={form.from_location_id} onChange={from_location_id=>change({from_location_id,to_location_id:form.to_location_id===from_location_id?null:form.to_location_id})} data={sourceLocations.map(l=>({value:l.id,label:`${locationLabel(l,source)} · Tồn ${quantity(l.id).toLocaleString('vi-VN')}`}))}/>
   {form.from_location_id&&<Text size="xs" c="dimmed">Có thể xuất tại vị trí: {available.toLocaleString('vi-VN')} {products.find(p=>p.id===form.product_id)?.unit}</Text>}
  </>}
  {form.kind!=='out'&&<>
   <Select label="Kệ đích" required searchable value={form.to_rack_id} onChange={to_rack_id=>change({to_rack_id,to_location_id:null})} data={racks.map(r=>({value:r.id,label:r.code}))}/>
   <Select label="Tầng / ô đích" placeholder="Chọn vị trí thực tế" required searchable value={form.to_location_id} onChange={to_location_id=>change({to_location_id})} data={targetLocations.map(l=>({value:l.id,label:locationLabel(l,destination)}))}/>
  </>}
  <NumberInput label="Số lượng" required value={form.qty} onChange={qty=>change({qty})} min={1} max={form.kind==='in'?2147483647:Math.max(1,available)} allowDecimal={false}/>
  <TextInput label="Ghi chú / số phiếu" value={form.note} onChange={e=>change({note:e.target.value})} maxLength={500}/>
  <Alert variant="light" color="forest">Tầng 01 là tầng thấp nhất; ô đánh số từ trái sang phải khi nhìn vào mặt trước kệ. Tồn cũ “Chưa phân ô” có thể chuyển vào tầng/ô ngay trong cùng kệ. Phiếu được ghi nhận sau khi bấm xác nhận.</Alert>
 </>;
}
