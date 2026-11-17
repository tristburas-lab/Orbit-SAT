// Optional independent QR decode. npm install --no-save jsqr
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const imported=await import(process.env.ORBIT_QR_DECODER||'jsqr'),decode=imported.default??imported;
const svg=readFileSync(new URL('../dist/qr-code.svg',import.meta.url),'utf8');
const modules=Number(svg.match(/viewBox="0 0 (\d+) /)[1]),scale=8,width=modules*scale;
const pixels=new Uint8ClampedArray(width*width*4).fill(255);
const data=svg.match(/<path stroke="#[^"]+" d="([^"]+)"/)[1];
const tokens=data.match(/[Mmh]|-?\d*\.?\d+/g);let i=0,x=0,y=0;
while(i<tokens.length){const command=tokens[i++];if(command==='M'){x=Number(tokens[i++]);y=Number(tokens[i++]);}else if(command==='m'){x+=Number(tokens[i++]);y+=Number(tokens[i++]);}else if(command==='h'){const length=Number(tokens[i++]);for(let row=Math.round((y-.5)*scale);row<Math.round((y+.5)*scale);row++)for(let column=Math.round(x*scale);column<Math.round((x+length)*scale);column++){const at=(row*width+column)*4;pixels[at]=17;pixels[at+1]=24;pixels[at+2]=39;}x+=length;}else throw Error('Unexpected SVG path command');}
const result=decode(pixels,width,width);assert.ok(result,'QR must decode from the actual shipped SVG');assert.equal(result.data,'https://orbit.bronzekite16385.chatgpt.site');console.log('PASS independently decoded the shipped QR to the live shortened Site address.');
