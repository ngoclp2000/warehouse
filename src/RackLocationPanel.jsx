import React from 'react';
import {Alert,Button,Select,Stack,Text} from '@mantine/core';
import {activeLocations,locationLabel} from './locations';
export default function RackLocationPanel({rack,locations,balances,products,selected,onSelect,onTransfer,writable}){
 if(!rack)return null;
 const rows=balances.filter(b=>b.rack_id===rack.id&&b.qty>0),unassigned=rows.filter(b=>!b.tier),shown=selected?rows.filter(b=>b.location_id===selected):rows;
 return <Stack gap="xs" mt="md">
  <Text size="sm" fw={600}>Vị trí lưu trữ</Text>
  <Select label="Tầng / ô trên 3D" placeholder="Tất cả vị trí" clearable searchable value={selected} onChange={onSelect} data={activeLocations(locations,rack,{unassigned:true}).map(l=>({value:l.id,label:locationLabel(l,rack)}))}/>
  {unassigned.length>0&&<Alert color="orange" p="xs"><Text size="xs">Có {unassigned.length} mã hàng chưa phân ô. Chọn Chuyển vị trí để ghi nhận tầng/ô thực tế.</Text>{writable&&<Button variant="light" size="compact-xs" mt={6} onClick={()=>onTransfer(unassigned[0])}>Phân ô hàng cũ</Button>}</Alert>}
  <Stack gap={6} style={{maxHeight:220,overflowY:'auto'}}>{shown.map(b=><div key={`${b.product_id}:${b.location_id}`}><Text size="xs" fw={600}>{b.locationLabel}</Text><Text size="xs">{products.find(p=>p.id===b.product_id)?.sku} · {b.qty.toLocaleString('vi-VN')} {products.find(p=>p.id===b.product_id)?.unit}</Text>{writable&&<Button size="compact-xs" variant="subtle" onClick={()=>onTransfer(b)}>Chuyển vị trí</Button>}</div>)}{!shown.length&&<Text size="xs" c="dimmed">Vị trí đang trống</Text>}</Stack>
  <Text size="xs" c="dimmed">Tầng 01 ở dưới cùng. Ô 01 ở bên trái mặt trước kệ, theo hướng xoay của kệ. Kích thước kiện hàng là minh họa.</Text>
 </Stack>;
}
