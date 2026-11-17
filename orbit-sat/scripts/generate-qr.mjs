import {writeFileSync} from 'node:fs';
const module=await import(process.env.ORBIT_QR_PACKAGE||'qrcode');
const QRCode=module.default??module;
const target='https://orbit.bronzekite16385.chatgpt.site';
const svg=await QRCode.toString(target,{type:'svg',width:280,margin:4,errorCorrectionLevel:'M',color:{dark:'#111827',light:'#ffffff'}});
writeFileSync(new URL('../dist/qr-code.svg',import.meta.url),svg);
console.log('Generated an offline QR asset for '+target);
