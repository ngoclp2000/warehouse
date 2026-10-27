import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {createQrDetector,decodeQrPixels,cameraError} from '../src/qrCamera.js';
test('fallback decodes QR pixels when the browser has no BarcodeDetector',async()=>{
 assert.equal(await createQrDetector({}),null);
 const text='https://khospace.vercel.app/?item=11111111-1111-4111-8111-111111111111';
 const qr=QRCode.create(text,{errorCorrectionLevel:'M'}),scale=6,border=4,width=(qr.modules.size+border*2)*scale;
 const data=new Uint8ClampedArray(width*width*4);data.fill(255);
 for(let y=0;y<width;y++)for(let x=0;x<width;x++){const mx=Math.floor(x/scale)-border,my=Math.floor(y/scale)-border;if(mx>=0&&my>=0&&mx<qr.modules.size&&my<qr.modules.size&&qr.modules.get(my,mx)){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=0}}
 assert.equal(await decodeQrPixels({data,width,height:width}),text);
});
test('unsupported QR native formats fall back instead of blocking camera',async()=>{
 class Detector{static async getSupportedFormats(){return ['ean_13']}}
 assert.equal(await createQrDetector({BarcodeDetector:Detector}),null);
 class Broken{constructor(){throw Error('not implemented')}}
 assert.equal(await createQrDetector({BarcodeDetector:Broken}),null);
});
test('camera permission and busy errors get distinct actionable messages',()=>{
 assert.match(cameraError({name:'NotAllowedError'}),/cấp quyền/);
 assert.match(cameraError({name:'NotReadableError'}),/đang bận/);
});
