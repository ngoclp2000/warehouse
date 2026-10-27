import React,{useEffect,useRef,useState} from 'react';
import {Button,Group,Text} from '@mantine/core';
import {Camera,ImagePlus,Square} from 'lucide-react';
import {cameraError,createQrDetector,decodeQrPixels} from './qrCamera';
export default function CameraScanner({onResult,onError}){
 const video=useRef(),fileInput=useRef(),stream=useRef(null),session=useRef(0),frame=useRef(null),callbacks=useRef({});
 callbacks.current={onResult,onError};
 const [opening,setOpening]=useState(false),[running,setRunning]=useState(false),[reading,setReading]=useState(false);
 function stop(update=true){session.current++;if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current){video.current.pause();video.current.srcObject=null}if(update){setOpening(false);setRunning(false);setReading(false)}}
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hidden);return()=>{document.removeEventListener('visibilitychange',hidden);stop(false)}},[]);
 async function start(){
  stop();callbacks.current.onError('');
  if(!window.isSecureContext){callbacks.current.onError('Camera cần kết nối HTTPS. Hãy mở https://khospace.vercel.app bằng Safari hoặc Chrome.');return}
  if(!navigator.mediaDevices?.getUserMedia){callbacks.current.onError('Trình duyệt này không cung cấp camera. Mở liên kết trực tiếp bằng Safari hoặc Chrome, hoặc chụp / chọn ảnh QR.');return}
  const ticket=session.current;setOpening(true);
  try{
   // Request from the user's button click; QR API availability must not block permission.
   let media;try{media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}})}catch(e){if(e.name!=='OverconstrainedError')throw e;media=await navigator.mediaDevices.getUserMedia({audio:false,video:true})}
   if(ticket!==session.current||!video.current){media.getTracks().forEach(t=>t.stop());return}
   stream.current=media;video.current.srcObject=media;video.current.muted=true;video.current.setAttribute('playsinline','');await video.current.play();
   if(ticket!==session.current)return;
   setOpening(false);setRunning(true);
   let detector=await createQrDetector();
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let last=0;
   const tick=async now=>{
    if(ticket!==session.current||!stream.current||!video.current)return;
    if(now-last>=180&&video.current.readyState>=2&&video.current.videoWidth){
     last=now;let value=null;
     if(detector){try{value=(await detector.detect(video.current))[0]?.rawValue||null}catch{detector=null}}
     if(!detector&&ticket===session.current&&video.current){
      const v=video.current,scale=Math.min(1,960/v.videoWidth);canvas.width=Math.max(1,Math.round(v.videoWidth*scale));canvas.height=Math.max(1,Math.round(v.videoHeight*scale));
      try{ctx.drawImage(v,0,0,canvas.width,canvas.height);value=await decodeQrPixels(ctx.getImageData(0,0,canvas.width,canvas.height))}catch{if(ticket===session.current){stop();callbacks.current.onError('Không đọc được hình camera. Thử chụp / chọn ảnh QR hoặc nhập mã hàng.')}return}
     }
     if(ticket!==session.current)return;
     if(value){stop();callbacks.current.onResult(value);return}
    }
    if(ticket===session.current)frame.current=requestAnimationFrame(tick);
   };
   if(ticket===session.current)frame.current=requestAnimationFrame(tick);
  }catch(e){if(ticket===session.current){stop();callbacks.current.onError(cameraError(e))}}
 }
 async function readPhoto(e){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;stop();const ticket=session.current;setReading(true);callbacks.current.onError('');const url=URL.createObjectURL(file);
  try{const image=new Image();image.src=url;await image.decode();if(ticket!==session.current)return;const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);const value=await decodeQrPixels(ctx.getImageData(0,0,canvas.width,canvas.height));if(ticket!==session.current)return;if(value)callbacks.current.onResult(value);else callbacks.current.onError('Không tìm thấy mã QR trong ảnh. Chọn ảnh rõ, đủ bốn góc mã QR hoặc nhập mã hàng.');}
  catch{if(ticket===session.current)callbacks.current.onError('Không đọc được ảnh. Thử ảnh JPEG/PNG hoặc nhập mã hàng.')}
  finally{URL.revokeObjectURL(url);if(ticket===session.current)setReading(false)}
 }
 return <><video ref={video} autoPlay playsInline muted className="scan-video" aria-label="Hình ảnh camera quét QR"/><Group grow><Button variant="light" leftSection={running?<Square size={16}/>:<Camera size={17}/>} loading={opening} disabled={reading} onClick={running?()=>stop():start}>{running?'Dừng camera':'Mở camera'}</Button><Button variant="default" leftSection={<ImagePlus size={17}/>} loading={reading} disabled={opening} onClick={()=>fileInput.current?.click()}>Chụp / chọn ảnh QR</Button></Group><input ref={fileInput} type="file" accept="image/*" capture="environment" aria-label="Ảnh QR" hidden onChange={readPhoto}/>{running&&<Text size="xs" c="dimmed">Đưa mã QR vào giữa khung hình, giữ điện thoại ổn định.</Text>}</>;
}
