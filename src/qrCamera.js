export function cameraError(error){
 switch(error?.name){
 case 'NotAllowedError':case 'PermissionDeniedError':return 'Camera chưa được cấp quyền. Hãy cho phép camera trong cài đặt của trình duyệt cho trang này rồi thử lại. Nếu mở bên trong ứng dụng khác, hãy mở liên kết bằng Safari hoặc Chrome.';
 case 'NotFoundError':case 'DevicesNotFoundError':return 'Không tìm thấy camera. Bạn có thể chụp / chọn ảnh QR hoặc nhập mã hàng.';
 case 'NotReadableError':case 'TrackStartError':return 'Camera đang bận hoặc không truy cập được. Đóng ứng dụng khác đang dùng camera rồi thử lại.';
 case 'SecurityError':return 'Trình duyệt đang chặn camera. Mở trực tiếp trang HTTPS bằng Safari hoặc Chrome và cấp quyền camera.';
 case 'OverconstrainedError':return 'Camera không đáp ứng cấu hình. Bạn có thể chụp / chọn ảnh QR hoặc nhập mã hàng.';
 default:return 'Chưa mở được camera. Kiểm tra quyền camera hoặc dùng Chụp / chọn ảnh QR.';
 }
}
export async function decodeQrPixels(image){
 const {default:jsQR}=await import('jsqr');
 return jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'})?.data||null;
}
export async function createQrDetector(scope=globalThis){
 if(typeof scope.BarcodeDetector!=='function')return null;
 try{
  if(scope.BarcodeDetector.getSupportedFormats){const formats=await scope.BarcodeDetector.getSupportedFormats();if(!formats.includes('qr_code'))return null}
  return new scope.BarcodeDetector({formats:['qr_code']});
 }catch{return null}
}
