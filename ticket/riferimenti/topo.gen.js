// Genera ticket/riferimenti/topo.svg (linee topografiche del ticket 06): node topo.gen.js
// Linee topografiche: isolinee (marching squares) di un campo liscio fatto di sinusoidi. Output SVG statico.
const W=720,H=1080,C=10,nx=W/C,ny=H/C;
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const waves=[];for(let i=0;i<7;i++){const a=rnd()*Math.PI*2,f=(0.0025+rnd()*0.004);waves.push({kx:Math.cos(a)*f,ky:Math.sin(a)*f,p:rnd()*7,amp:1/(1+i*.35)});}
const F=(x,y)=>waves.reduce((s,w)=>s+w.amp*Math.sin(x*w.kx+y*w.ky+w.p),0)+0.6*Math.exp(-((x-500)**2+(y-260)**2)/2e4)+0.5*Math.exp(-((x-180)**2+(y-760)**2)/3e4);
const g=[];for(let j=0;j<=ny;j++){g[j]=[];for(let i=0;i<=nx;i++)g[j][i]=F(i*C,j*C);}
let min=1e9,max=-1e9;g.flat().forEach(v=>{min=Math.min(min,v);max=Math.max(max,v)});
const levels=[];for(let k=1;k<18;k++)levels.push(min+(max-min)*k/18);
const paths=[];
for(const L of levels){
  const segs=[];
  const ip=(x1,y1,v1,x2,y2,v2)=>{const t=(L-v1)/(v2-v1);return [x1+(x2-x1)*t,y1+(y2-y1)*t]};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const a=g[j][i],b=g[j][i+1],c=g[j+1][i+1],d=g[j+1][i];const x=i*C,y=j*C;
    const e=[];const T=ip(x,y,a,x+C,y,b),R=ip(x+C,y,b,x+C,y+C,c),B=ip(x,y+C,d,x+C,y+C,c),Lf=ip(x,y,a,x,y+C,d);
    if((a>L)!==(b>L))e.push(T);if((b>L)!==(c>L))e.push(R);if((d>L)!==(c>L))e.push(B);if((a>L)!==(d>L))e.push(Lf);
    if(e.length===2)segs.push(e);else if(e.length===4){segs.push([e[0],e[1]]);segs.push([e[2],e[3]]);}
  }
  // unisce i segmenti in polilinee
  const key=p=>p[0].toFixed(2)+','+p[1].toFixed(2);const map=new Map();
  segs.forEach((s,i)=>{for(const p of s){const k=key(p);(map.get(k)||map.set(k,[]).get(k)).push(i);}});
  const used=new Set();
  for(let i=0;i<segs.length;i++){if(used.has(i))continue;used.add(i);let line=[segs[i][0],segs[i][1]];
    for(const dir of [1,0]){let grow=true;while(grow){grow=false;const end=dir?line[line.length-1]:line[0];
      for(const k of map.get(key(end))||[]){if(used.has(k))continue;used.add(k);const s=segs[k];const nxt=key(s[0])===key(end)?s[1]:s[0];dir?line.push(nxt):line.unshift(nxt);grow=true;break;}}}
    const pts=line.filter((_,k)=>k%3===0||k===line.length-1);
    if(pts.length<4)continue;
    paths.push('M'+pts.map(p=>p[0].toFixed(0)+' '+p[1].toFixed(0)).join('L'));
  }
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none" stroke="#8ad8e2" stroke-width="1" stroke-linejoin="round"><path d="${paths.join('')}"/></svg>`;
require('fs').writeFileSync('topo.svg',svg);console.log(svg.length);
