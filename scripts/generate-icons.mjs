/* Dependency-free PNG icon generator for PhysioPath.
   Draws a brand-gradient rounded square with a white medical cross.
   Outputs icons/icon-192.png, icons/icon-512.png (+ maskable). */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url)) + "/../icons";
mkdirSync(dir, { recursive: true });

// crc32
const CRC = (() => { const t = new Uint32Array(256);
  for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c; } return t; })();
function crc32(buf){ let c=0xFFFFFFFF; for(let i=0;i<buf.length;i++) c=CRC[(c^buf[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function chunk(type, data){
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,"ascii");
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crc]);
}
function png(w,h,rgba){
  const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const raw=Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){ raw[y*(w*4+1)]=0; rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4); }
  return Buffer.concat([sig, chunk("IHDR",ihdr), chunk("IDAT",deflateSync(raw,{level:9})), chunk("IEND",Buffer.alloc(0))]);
}
// linear interpolate two hex colors
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
function draw(size, {pad=true}={}){
  const buf=Buffer.alloc(size*size*4);
  const c1=hex("#3ea6ff"), c2=hex("#5ce1a6");
  const r=size*0.22;                       // corner radius
  const inset = pad ? size*0.10 : 0;       // maskable safe area
  const armT=size*0.12, armL=size*0.34;    // cross thickness / length from center
  const cx=size/2, cy=size/2;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    // rounded-square background (with inset for maskable padding)
    const inside = x>=inset && y>=inset && x<size-inset && y<size-inset &&
      roundedIn(x,y,inset,size-inset,inset,size-inset,r*(1-2*inset/size));
    if(!inside){ buf[i]=15;buf[i+1]=23;buf[i+2]=32;buf[i+3]=pad?0:255; continue; }
    const t=(x+y)/(2*size);
    let rr=c1[0]+(c2[0]-c1[0])*t, gg=c1[1]+(c2[1]-c1[1])*t, bb=c1[2]+(c2[2]-c1[2])*t;
    // white cross
    const inCross = (Math.abs(x-cx)<armT && Math.abs(y-cy)<armL) || (Math.abs(y-cy)<armT && Math.abs(x-cx)<armL);
    if(inCross){ rr=245; gg=250; bb=255; }
    buf[i]=rr; buf[i+1]=gg; buf[i+2]=bb; buf[i+3]=255;
  }
  return png(size,size,buf);
}
function roundedIn(x,y,x0,x1,y0,y1,r){
  if(x>=x0+r&&x<=x1-r) return true; if(y>=y0+r&&y<=y1-r) return true;
  const cxs=[x0+r,x1-r], cys=[y0+r,y1-r];
  for(const cx of cxs) for(const cy of cys) if((x-cx)**2+(y-cy)**2<=r*r) return true;
  return false;
}
writeFileSync(dir+"/icon-180.png", draw(180,{pad:false}));   // apple-touch-icon
writeFileSync(dir+"/icon-192.png", draw(192,{pad:false}));
writeFileSync(dir+"/icon-512.png", draw(512,{pad:false}));
writeFileSync(dir+"/icon-maskable-512.png", draw(512,{pad:true}));
console.log("icons written to", dir);
