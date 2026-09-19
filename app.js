
(() => {
"use strict";

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const loading = $("loading"), fill=$("loaderFill"), tire=$("tire"), pct=$("loadPct");

let loadStart=performance.now();
function animateLoading(now){
  const p=clamp((now-loadStart)/10000,0,1);
  fill.style.width=(p*100)+"%";
  tire.style.left=(p*100)+"%";
  tire.style.transform=`rotate(${p*1450}deg)`;
  pct.textContent=Math.round(p*100)+"%";
  if(p<1) requestAnimationFrame(animateLoading);
  else setTimeout(()=>loading.classList.add("hide"),120);
}
requestAnimationFrame(animateLoading);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ca8a0);
scene.fog = new THREE.Fog(0x9ca8a0, 150, 850);

let viewW=Math.max(innerWidth,innerHeight), viewH=Math.min(innerWidth,innerHeight);
const camera = new THREE.PerspectiveCamera(58,viewW/viewH,.1,1400);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.setSize(viewW,viewH,false);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
$("game").appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfe4ff,0x33402d,2.0));
const sun=new THREE.DirectionalLight(0xfff0d0,3.2);
sun.position.set(-180,260,120); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-300;sun.shadow.camera.right=300;sun.shadow.camera.top=300;sun.shadow.camera.bottom=-300;
scene.add(sun);

const world=new THREE.Group(); scene.add(world);

function mat(color,rough=.75,metal=0){
 return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
}
const mRoad=mat(0x66645f,1), mShoulder=mat(0x514d47,1), mDark=mat(0x1c1e1e,.9), mWhite=mat(0xe7e4d9,.8),
      mBlack=mat(0x171a1b,.72,.25), mBlue=mat(0x0b5b95,.62,.05), mYellow=mat(0xf2c218,.65,.05),
      mSteel=mat(0x74777a,.42,.72), mGlass=new THREE.MeshStandardMaterial({color:0x24333a,roughness:.15,metalness:.1,transparent:true,opacity:.72}),
      mGreen=mat(0x273d26,1), mSoil=mat(0x3d352c,1), mRock=mat(0x68635a,1);

function box(w,h,d,material,x=0,y=0,z=0, parent=world){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z); mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cyl(r,h,material,x=0,y=0,z=0,rx=0,rz=0,parent=world){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),material);
 mesh.position.set(x,y,z);mesh.rotation.x=rx;mesh.rotation.z=rz;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

const ROAD_W=15;
const pts=[];
for(let i=0;i<42;i++){
 const z=i*30-610;
 const x=Math.sin(i*.42)*34 + Math.sin(i*.17)*58;
 const y=3.2 + Math.sin(i*.27)*1.5 + Math.sin(i*.11)*1.1 + (i>24?(i-24)*.18:0);
 pts.push(new THREE.Vector3(x,y,z));
}
const roadCurve=new THREE.CatmullRomCurve3(pts,false,"centripetal",.55);
const samples=260;
const roadVerts=[],roadIdx=[];
for(let i=0;i<samples;i++){
 const t=i/(samples-1), p=roadCurve.getPoint(t), tan=roadCurve.getTangent(t).normalize();
 const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
 const half=ROAD_W*.5;
 roadVerts.push(p.x+side.x*half,p.y,p.z+side.z*half,p.x-side.x*half,p.y,p.z-side.z*half);
}
for(let i=0;i<samples-1;i++){const a=i*2;roadIdx.push(a,a+1,a+2,a+1,a+3,a+2);}
const rg=new THREE.BufferGeometry();
rg.setAttribute("position",new THREE.Float32BufferAttribute(roadVerts,3));rg.setIndex(roadIdx);rg.computeVertexNormals();
const road=new THREE.Mesh(rg,mRoad);road.receiveShadow=true;world.add(road);

// Gravel shoulders and continuous earth berms ("banwol").
for(let s=-1;s<=1;s+=2){
 const verts=[],idx=[];
 for(let i=0;i<samples;i++){
  const t=i/(samples-1),p=roadCurve.getPoint(t),tan=roadCurve.getTangent(t).normalize();
  const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
  const inner=ROAD_W*.5+1.2, outer=ROAD_W*.5+5.5;
  const a=new THREE.Vector3(p.x+side.x*inner*s,p.y-.25,p.z+side.z*inner*s);
  const b=new THREE.Vector3(p.x+side.x*outer*s,p.y-1.2,p.z+side.z*outer*s);
  verts.push(a.x,a.y,a.z,b.x,b.y,b.z);
 }
 for(let i=0;i<samples-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
 const sh=new THREE.Mesh(g,mShoulder);sh.receiveShadow=true;world.add(sh);
 // Berm blocks
 for(let i=5;i<samples-4;i+=6){
   const t=i/(samples-1),p=roadCurve.getPoint(t),tan=roadCurve.getTangent(t).normalize();
   const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
   const b=box(4.8,1.15,5.5,mSoil,p.x+side.x*(ROAD_W*.5+4.2)*s,p.y+.15,p.z+side.z*(ROAD_W*.5+4.2)*s);
   b.rotation.y=Math.atan2(tan.x,tan.z);
 }
}

// Gravel stones / rut markers.
for(let i=0;i<700;i++){
 const t=Math.random()*.98+.01,p=roadCurve.getPoint(t),tan=roadCurve.getTangent(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
 const lateral=(Math.random()-.5)*(ROAD_W*.9);
 const stone=box(.18+Math.random()*.35,.08+Math.random()*.14,.18+Math.random()*.35,mRock,
   p.x+side.x*lateral,p.y+.05,p.z+side.z*lateral);
 stone.rotation.y=Math.random()*Math.PI; stone.rotation.x=Math.random()*.4;
}
// Tire rut stripes
const rutMat=mat(0x45423d,.98);
for(const off of [-3.4,3.4]){
 const rv=[],ri=[];
 for(let i=0;i<samples;i++){
  const t=i/(samples-1),p=roadCurve.getPoint(t),tan=roadCurve.getTangent(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
  rv.push(p.x+side.x*off,p.y+.025,p.z+side.z*off);
 }
 for(let i=0;i<samples-1;i++){ri.push(i,i+1);}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(rv,3));g.setIndex(ri);
 const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x302e2a,transparent:true,opacity:.55}));world.add(line);
}

// Terrain conforms to the haul road instead of leaving a floating road ribbon.
const terrainRoadSamples=[];
for(let i=0;i<140;i++){
  const t=i/139, rp=roadCurve.getPoint(t);
  terrainRoadSamples.push({x:rp.x,z:rp.z,y:rp.y});
}
function terrainBase(x,z){
  return 1.2 + Math.sin(x*.013)*1.8 + Math.cos(z*.017)*1.6 + Math.sin((x+z)*.008)*2.2;
}
function terrainHeight(x,z){
  let bestD=Infinity,bestY=0;
  for(const r of terrainRoadSamples){
    const dx=x-r.x,dz=z-r.z,d=dx*dx+dz*dz;
    if(d<bestD){bestD=d;bestY=r.y;}
  }
  const d=Math.sqrt(bestD), base=terrainBase(x,z);
  if(d<9){
    const edge=Math.max(0,Math.min(1,(d-5.5)/3.5));
    return bestY-.45-edge*1.2;
  }
  if(d<42){
    const blend=(d-9)/33;
    const shoulder=bestY-1.6-(d-9)*.035;
    return shoulder*(1-blend)+base*blend;
  }
  return base;
}
const terrainGeo=new THREE.PlaneGeometry(1400,1400,110,110);
const pos=terrainGeo.attributes.position;
for(let i=0;i<pos.count;i++){
 const x=pos.getX(i), z=pos.getY(i);
 pos.setZ(i,terrainHeight(x,z));
}
terrainGeo.rotateX(-Math.PI/2);terrainGeo.computeVertexNormals();
const terrain=new THREE.Mesh(terrainGeo,mGreen);terrain.receiveShadow=true;world.add(terrain);

// Trees
function makeTree(x,y,z,scale=1){
 const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);
 const trunk=cyl(.42,5,mat(0x3a2b20,1),0,2.5,0);g.add(trunk);
 for(let j=0;j<4;j++){
   const cone=new THREE.Mesh(new THREE.ConeGeometry(3.4-j*.45,5.8,8),mat(j%2?0x1f3b20:0x274a26,1));
   cone.position.y=5.0+j*2.0;cone.castShadow=true;g.add(cone);
 }
 world.add(g);
}
for(let i=0;i<170;i++){
 const t=Math.random(),p=roadCurve.getPoint(t),tan=roadCurve.getTangent(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
 const d=25+Math.random()*90, s=(Math.random()<.5?-1:1);
 const q=p.clone().add(side.multiplyScalar(d*s));
 makeTree(q.x,terrainHeight(q.x,q.z),q.z,.65+Math.random()*1.1);
}

// Hills / rock mounds
for(let i=0;i<80;i++){
 const a=Math.random()*Math.PI*2,d=150+Math.random()*430;
 const x=Math.cos(a)*d,z=Math.sin(a)*d;
 const r=15+Math.random()*45,h=12+Math.random()*40;
 const rock=new THREE.Mesh(new THREE.ConeGeometry(r,h,9),mSoil);
 rock.position.set(x,-2+h/2,z);rock.rotation.y=Math.random()*Math.PI;rock.castShadow=true;rock.receiveShadow=true;world.add(rock);
}

// Disposal pad near the end.
const disposal=roadCurve.getPoint(.94).clone();
const pad=box(55,1.2,55,mat(0x514b42,1),disposal.x,disposal.y-.6,disposal.z);
pad.rotation.y=Math.atan2(roadCurve.getTangent(.94).x,roadCurve.getTangent(.94).z);
for(let i=0;i<10;i++){
 const mound=box(8+Math.random()*7,3+Math.random()*5,10+Math.random()*8,mSoil,
   disposal.x+(Math.random()-.5)*35,disposal.y+2,disposal.z+(Math.random()-.5)*30);
 mound.rotation.y=Math.random()*Math.PI;
}

// Truck
const truck=new THREE.Group();world.add(truck);
const visual=new THREE.Group();truck.add(visual);

const cab=new THREE.Group();visual.add(cab);
box(5.7,4.8,5.1,mWhite,0,5.0,2.3,cab);
box(5.45,2.0,5.25,mBlack,0,3.65,2.2,cab);
box(5.1,1.8,4.9,mGlass,0,5.85,2.15,cab);
box(5.65,.32,5.3,mBlack,0,3.0,2.15,cab);
box(5.9,.42,5.45,mBlack,0,2.45,2.15,cab);
box(5.5,.28,5.35,mYellow,0,3.12,2.15,cab);
box(5.1,.25,5.05,mBlue,0,3.32,2.15,cab);
box(5.1,.18,5.1,mYellow,0,3.48,2.15,cab);
for(const sx of [-2.55,2.55]){
 box(.28,2.2,.35,mBlack,sx,5.0,2.0,cab);
 box(.35,1.0,.22,mBlack,sx,5.85,0.25,cab);
}
box(5.8,.55,5.45,mBlack,0,1.95,2.15,cab);
box(4.7,.45,1.2,mBlack,0,2.15,-.55,cab);
for(const x of [-2.0,2.0]){
 box(.22,.55,1.2,mWhite,x,3.75,-.48,cab);
 box(.65,.25,.22,mYellow,x,3.65,-1.05,cab);
}
for(const x of [-2.55,2.55]){
 cyl(.13,.65,mBlack,x,7.7,2.0,0,0,cab);
 cyl(.15,.8,mYellow,x,8.05,2.0,0,0,cab);
}
for(const x of [-2.9,2.9]){
 box(.18,1.0,.22,mBlack,x,5.15,1.0,cab);
 cyl(.13,.7,mBlack,x,5.25,.7,Math.PI/2,0,cab);
}

const chassis=box(5.3,.65,12.2,mBlack,0,2.25,-3.2,visual);

// Dump body with hinge animation
const dumpPivot=new THREE.Group();dumpPivot.position.set(0,3.0,-4.8);visual.add(dumpPivot);
const dump=box(5.7,4.7,8.8,mWhite,0,2.4,-.1,dumpPivot);
box(5.75,.22,8.95,mBlue,0,.55,-.15,dumpPivot);
box(5.78,.20,8.95,mYellow,0,.84,-.15,dumpPivot);
box(5.75,.24,8.95,mBlack,0,4.75,-.15,dumpPivot);
box(5.8,.25,.35,mBlack,0,4.7,4.0,dumpPivot);
box(5.8,.25,.35,mBlack,0,4.7,-4.1,dumpPivot);
const payload=box(5.0,1.1,7.7,mat(0x30291f,1),0,5.1,-.1,dumpPivot);
payload.visible=true;

// DT 204 + AlamTri livery: mounted directly on BOTH sides of the dump vessel.
// The vessel is the dumpPivot, so the graphics move/tilt with the body during dumping.
function makeUnitNumberTexture(){
 const c=document.createElement("canvas"); c.width=640; c.height=180;
 const g=c.getContext("2d"); g.clearRect(0,0,c.width,c.height);
 g.textAlign="center"; g.textBaseline="middle";
 g.font="900 118px Arial";
 g.lineWidth=16; g.strokeStyle="#111111";
 g.strokeText("DT 204",320,92);
 g.fillStyle="#f2c218"; g.fillText("DT 204",320,92);
 return new THREE.CanvasTexture(c);
}
const unitMat=new THREE.MeshBasicMaterial({map:makeUnitNumberTexture(),transparent:true,depthWrite:false});

const texLoader=new THREE.TextureLoader();
texLoader.load("./alamtri.webp",tex=>{
 tex.colorSpace=THREE.SRGBColorSpace;
 // Remove only the white background of the supplied logo so it sits cleanly on the white vessel.
 const c=document.createElement("canvas"); c.width=tex.image.width; c.height=tex.image.height;
 const ctx=c.getContext("2d"); ctx.drawImage(tex.image,0,0);
 const img=ctx.getImageData(0,0,c.width,c.height), d=img.data;
 for(let i=0;i<d.length;i+=4){
   if(d[i]>245 && d[i+1]>245 && d[i+2]>245) d[i+3]=0;
 }
 ctx.putImageData(img,0,0);
 const cleanTex=new THREE.CanvasTexture(c); cleanTex.colorSpace=THREE.SRGBColorSpace;
 for(const side of [-1,1]){
   // Logo toward the front half of the vessel.
   const pm=new THREE.MeshBasicMaterial({map:cleanTex,transparent:true,depthWrite:false});
   const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.8,1.15),pm);
   plane.position.set(side*2.91,2.65,-1.25);
   plane.rotation.y=side>0?-Math.PI/2:Math.PI/2;
   dumpPivot.add(plane);
   // Unit number toward the rear half, same vessel side.
   const um=new THREE.MeshBasicMaterial({map:unitMat.map,transparent:true,depthWrite:false});
   const num=new THREE.Mesh(new THREE.PlaneGeometry(2.45,.70),um);
   num.position.set(side*2.915,2.55,2.15);
   num.rotation.y=side>0?-Math.PI/2:Math.PI/2;
   dumpPivot.add(num);
 }
});

// Front grille details
for(let y=2.65;y<3.35;y+=.22) box(3.9,.08,.14,mSteel,0,y,-.46,cab);
for(const x of [-1.95,1.95]) box(.95,1.25,.18,mGlass,x,2.75,-.62,cab);

// Wheel construction
const wheelTire=mat(0x111212,1), wheelHub=mat(0x8a8c8d,.38,.75);
const wheelSets=[];
function makeWheel(x,y,z,steerable=false){
 const g=new THREE.Group();g.position.set(x,y,z);
 const tireMesh=new THREE.Mesh(new THREE.CylinderGeometry(.98,.98,.54,24),wheelTire);
 tireMesh.rotation.z=Math.PI/2;tireMesh.castShadow=true;tireMesh.receiveShadow=true;g.add(tireMesh);
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.58,20),wheelHub);
 hub.rotation.z=Math.PI/2;hub.castShadow=true;g.add(hub);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.07,8,20),wheelHub);
 ring.rotation.y=Math.PI/2;g.add(ring);
 if(steerable) g.userData.steer=true;
 visual.add(g);wheelSets.push(g);return g;
}
const axleZ=[.25,-2.0,-4.85,-7.55];
for(let i=0;i<4;i++){
 const z=axleZ[i];
 if(i<2){
   makeWheel(-2.55,1.35,z,true);makeWheel(2.55,1.35,z,true);
 }else{
   for(const x of [-2.62,-2.0,2.0,2.62]) makeWheel(x,1.35,z,false);
 }
}

// Mudguards
for(const z of axleZ) for(const x of [-2.72,2.72]){
 const f=new THREE.Mesh(new THREE.BoxGeometry(.35,1.2,2.15),mBlack);
 f.position.set(x,2.0,z);f.castShadow=true;visual.add(f);
}
// Hydraulic cylinders
const hydL=cyl(.16,3.7,mSteel,-1.55,3.7,-4.2,0,Math.PI/2,visual);
const hydR=cyl(.16,3.7,mSteel,1.55,3.7,-4.2,0,Math.PI/2,visual);

// Starting pose on road
const start=roadCurve.getPoint(.07);
truck.position.copy(start);
truck.position.y+=.3;
let startTan=roadCurve.getTangent(.07).normalize();
truck.rotation.y=Math.atan2(startTan.x,startTan.z);
let baseHeading=truck.rotation.y;

const state={speed:0,steer:0,gas:false,brake:false,reverse:false,dumping:false,gear:1,dumpT:0,roll:0,camYaw:0,camPitch:0.22,camDist:25};
let targetCamYaw=0,targetCamPitch=.48,targetCamDist=28;
let manualCameraUntil=0;
let cameraGestureAxis=null;

function bindHold(id,key){
 const el=$(id);
 const down=e=>{e.preventDefault();state[key]=true;el.classList.add("active");el.setPointerCapture?.(e.pointerId)};
 const up=e=>{e.preventDefault();state[key]=false;el.classList.remove("active")};
 ["pointerdown"].forEach(t=>el.addEventListener(t,down,{passive:false}));
 ["pointerup","pointercancel","pointerleave"].forEach(t=>el.addEventListener(t,up,{passive:false}));
 el.addEventListener("contextmenu",e=>e.preventDefault());
 el.addEventListener("selectstart",e=>e.preventDefault());
}
bindHold("gas","gas");bindHold("brake","brake");bindHold("left","left");bindHold("right","right");

$("dump").addEventListener("pointerdown",e=>{e.preventDefault(); if(!state.dumping) {state.dumping=true;state.dumpT=0;}});
$("reset").addEventListener("pointerdown",e=>{e.preventDefault();resetTruck()});
for(const id of ["dump","reset"]){
 $(id).addEventListener("contextmenu",e=>e.preventDefault());
 $(id).addEventListener("selectstart",e=>e.preventDefault());
}
["selectstart","contextmenu","dragstart"].forEach(ev=>document.addEventListener(ev,e=>{if(e.target.closest?.("#controls,#steer"))e.preventDefault();},{passive:false}));

// Keyboard for desktop testing
addEventListener("keydown",e=>{
 if(e.key==="ArrowUp"||e.key==="w")state.gas=true;
 if(e.key==="ArrowDown"||e.key==="s")state.brake=true;
 if(e.key==="ArrowLeft"||e.key==="a")state.left=true;
 if(e.key==="ArrowRight"||e.key==="d")state.right=true;
 if(e.key.toLowerCase()==="r")resetTruck();
 if(e.key.toLowerCase()==="e"&&!state.dumping){state.dumping=true;state.dumpT=0}
});
addEventListener("keyup",e=>{
 if(e.key==="ArrowUp"||e.key==="w")state.gas=false;
 if(e.key==="ArrowDown"||e.key==="s")state.brake=false;
 if(e.key==="ArrowLeft"||e.key==="a")state.left=false;
 if(e.key==="ArrowRight"||e.key==="d")state.right=false;
});

// Camera touch drag. Gesture locks to its dominant axis: horizontal = yaw, vertical = pitch.
const reverseBtn=$("reverse");
function toggleReverse(){
 if(Math.abs(state.speed)<0.8){
   state.reverse=!state.reverse;
   state.gear=state.reverse?0:1;
   reverseAlarmClock=0;
   reverseBtn.classList.toggle("active",state.reverse);
 }
}
reverseBtn.addEventListener("pointerdown",e=>{e.preventDefault();toggleReverse();ensureAudio();},{passive:false});

let camPointer=null,lastX=0,lastY=0,gestureStartX=0,gestureStartY=0;
renderer.domElement.addEventListener("pointerdown",e=>{
 if(e.target.closest?.("#controls,#steer"))return;
 camPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;gestureStartX=e.clientX;gestureStartY=e.clientY;cameraGestureAxis=null;
 renderer.domElement.setPointerCapture?.(e.pointerId);
 manualCameraUntil=performance.now()+9000;
});
renderer.domElement.addEventListener("pointermove",e=>{
 if(camPointer!==e.pointerId)return;
 const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
 if(cameraGestureAxis===null && Math.hypot(e.clientX-gestureStartX,e.clientY-gestureStartY)>4){
   cameraGestureAxis=Math.abs(e.clientX-gestureStartX)>=Math.abs(e.clientY-gestureStartY)?"yaw":"pitch";
 }
 if(cameraGestureAxis==="yaw") targetCamYaw+=dx*.006;
 if(cameraGestureAxis==="yaw") targetCamYaw=THREE.MathUtils.euclideanModulo(targetCamYaw+Math.PI,Math.PI*2)-Math.PI;
 if(cameraGestureAxis==="pitch") targetCamPitch=clamp(targetCamPitch-dy*.004,.08,.72);
});
renderer.domElement.addEventListener("pointerup",e=>{if(camPointer===e.pointerId){camPointer=null;cameraGestureAxis=null;renderer.domElement.releasePointerCapture?.(e.pointerId)}});
renderer.domElement.addEventListener("pointercancel",e=>{if(camPointer===e.pointerId){camPointer=null;cameraGestureAxis=null;renderer.domElement.releasePointerCapture?.(e.pointerId)}});
let lastTouchDist=0;
renderer.domElement.addEventListener("touchstart",e=>{
 if(e.touches.length===2){
   const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
   lastTouchDist=Math.hypot(dx,dy);
   e.preventDefault();
 }
},{passive:false});
renderer.domElement.addEventListener("touchmove",e=>{
 if(e.touches.length===2){
   const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
   const d=Math.hypot(dx,dy);
   if(lastTouchDist) targetCamDist=clamp(targetCamDist-(d-lastTouchDist)*.035,22,48);
   lastTouchDist=d;e.preventDefault();
 }
},{passive:false});
renderer.domElement.addEventListener("touchend",()=>{lastTouchDist=0},{passive:true});

function resetTruck(){
 const p=roadCurve.getPoint(.07);
 truck.position.copy(p);truck.position.y+=.3;
 const t=roadCurve.getTangent(.07).normalize();
 truck.rotation.y=Math.atan2(t.x,t.z);baseHeading=truck.rotation.y;
 state.speed=0;state.steer=0;state.roll=0;state.reverse=false;state.gear=1;state.dumping=false;state.dumpT=0;
 dumpPivot.rotation.x=0;
 targetCamYaw=0;targetCamPitch=.48;targetCamDist=28;manualCameraUntil=0;cameraGestureAxis=null;reverseBtn.classList.remove("active");
}

function roadInfo(pos){
 let best={d:Infinity,t:.07,p:roadCurve.getPoint(.07),tan:roadCurve.getTangent(.07)};
 for(let i=0;i<180;i++){
   const t=i/179,p=roadCurve.getPoint(t),d=p.distanceToSquared(pos);
   if(d<best.d)best={d,t,p,tan:roadCurve.getTangent(t).normalize()};
 }
 return best;
}

// Truck diesel audio: deep low-end idle/load, progressive RPM, gear-change transients, reverse alarm.
let audioCtx=null,dieselLow=null,dieselMid=null,dieselHigh=null,engineGain=null,engineFilter=null,compressor=null;
let gearOsc=null,gearGain=null,reverseOsc=null,reverseGain=null,audioRpm=700,currentGear=1,reverseAlarmClock=0;
function ensureAudio(){
 if(audioCtx){if(audioCtx.state==="suspended")audioCtx.resume();return;}
 audioCtx=new(window.AudioContext||window.webkitAudioContext)();
 compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=4.5;compressor.attack.value=.008;compressor.release.value=.18;
 engineFilter=audioCtx.createBiquadFilter();engineFilter.type="lowpass";engineFilter.frequency.value=280;engineFilter.Q.value=.72;
 engineGain=audioCtx.createGain();engineGain.gain.value=.0001;
 dieselLow=audioCtx.createOscillator();dieselLow.type="sawtooth";dieselLow.connect(engineFilter);dieselLow.start();
 dieselMid=audioCtx.createOscillator();dieselMid.type="triangle";const mg=audioCtx.createGain();mg.gain.value=.065;dieselMid.connect(mg).connect(engineFilter);dieselMid.start();
 dieselHigh=audioCtx.createOscillator();dieselHigh.type="sine";const hg=audioCtx.createGain();hg.gain.value=.0035;dieselHigh.connect(hg).connect(engineFilter);dieselHigh.start();
 engineFilter.connect(engineGain).connect(compressor).connect(audioCtx.destination);
 gearOsc=audioCtx.createOscillator();gearOsc.type="square";gearOsc.frequency.value=64;gearGain=audioCtx.createGain();gearGain.gain.value=.0001;gearOsc.connect(gearGain).connect(compressor);gearOsc.start();
 reverseOsc=audioCtx.createOscillator();reverseOsc.type="square";reverseOsc.frequency.value=930;reverseGain=audioCtx.createGain();reverseGain.gain.value=.0001;reverseOsc.connect(reverseGain).connect(compressor);reverseOsc.start();
}
function gearShift(oldG,newG){
 if(!audioCtx||oldG===newG)return;
 const now=audioCtx.currentTime;
 // Mechanical "clunk" plus a brief RPM dip, like a loaded manual/AMT truck.
 gearOsc.frequency.setTargetAtTime(newG>oldG?66:56,now,.008);
 gearGain.gain.cancelScheduledValues(now);
 gearGain.gain.setValueAtTime(.0001,now);
 gearGain.gain.exponentialRampToValueAtTime(.035,now+.015);
 gearGain.gain.exponentialRampToValueAtTime(.0001,now+.11);
 audioRpm=Math.max(700,audioRpm-(newG>oldG?135:85));
}
function updateGear(){
 const k=Math.abs(state.speed)*3.6;let g=state.reverse?0:1;
 if(!state.reverse){if(k>14)g=2;if(k>28)g=3;if(k>44)g=4;if(k>62)g=5;if(k>82)g=6;}
 if(g!==currentGear){gearShift(currentGear,g);currentGear=g;state.gear=g;}
}
function updateReverseAlarm(dt){
 if(!audioCtx||!reverseGain)return;
 if(!state.reverse||Math.abs(state.speed)<.08){reverseGain.gain.setTargetAtTime(.0001,audioCtx.currentTime,.025);return;}
 reverseAlarmClock+=dt;
 const phase=reverseAlarmClock%1.02;
 const on=phase<0.30; // tiiitt ..... tiiitt
 reverseGain.gain.setTargetAtTime(on?.032:.0001,audioCtx.currentTime,.010);
 reverseOsc.frequency.setTargetAtTime(930+Math.min(Math.abs(state.speed)*2.5,55),audioCtx.currentTime,.018);
}
function updateAudio(dt){
 if(!audioCtx)return;if(audioCtx.state==="suspended")audioCtx.resume();updateGear();
 const k=Math.abs(state.speed)*3.6;
 const gearLoad=state.reverse ? 1.0 : (1.12-Math.min(Math.max(state.gear-1,0),5)*.075);
 const target=state.reverse
   ? Math.min(1950,720+k*42+(state.gas?680:0))
   : Math.min(2200,700+k*(state.gear===1?42:29)*gearLoad+(state.gas?680:0));
 audioRpm+=(target-audioRpm)*(1-Math.exp(-4.8*dt));
 const now=audioCtx.currentTime;const pulse=Math.max(20,audioRpm/25);
 dieselLow.frequency.setTargetAtTime(pulse,now,.09);dieselMid.frequency.setTargetAtTime(pulse*1.4,now,.08);dieselHigh.frequency.setTargetAtTime(pulse*2.1,now,.08);
 engineFilter.frequency.setTargetAtTime(Math.min(760,255+(audioRpm-700)*.24+(state.gas?65:0)),now,.16);
 const load=Math.min(1,audioRpm/1900),level=.022+load*.016+(state.gas?.050:0)+Math.min(k/35,.35)*.016;engineGain.gain.setTargetAtTime(level,now,.13);
 updateReverseAlarm(dt);
}
["pointerdown","touchstart","keydown"].forEach(ev=>document.addEventListener(ev,ensureAudio,{once:true,passive:true}));

let prev=performance.now();
function update(dt){
 const gas=state.gas,brake=state.brake;
 let info=roadInfo(truck.position);
 const slope=Math.max(-.25,Math.min(.25,info.tan.y));
 const absSpeed=Math.abs(state.speed),direction=state.reverse?-1:1;
 let accel=gas?(state.reverse?2.4:4.9):0;
 if(brake)accel-=8.5;
 accel-=1.0+absSpeed*.12;
 accel-=slope*7.0*direction;
 if(state.reverse&&state.speed>0)accel=-8;
 if(!state.reverse&&state.speed<0)accel=8;
 state.speed+=accel*dt*direction;
 state.speed=state.reverse?clamp(state.speed,-10,0):clamp(state.speed,0,30);
 if(!gas&&Math.abs(state.speed)<.15)state.speed=0;
 const steerInput=state.left ? -1 : (state.right ? 1 : 0);
 state.steer=lerp(state.steer,steerInput,.18);
 const speedFactor=clamp(Math.abs(state.speed)/10,0,1);
 const turnRate=state.steer*.62*speedFactor;
 truck.rotation.y += turnRate*dt;
 // align chassis to road while preserving user steering.
 const ahead=truck.position.clone().add(new THREE.Vector3(Math.sin(truck.rotation.y),0,Math.cos(truck.rotation.y)).multiplyScalar(2.0));
 const follow=roadInfo(ahead);
 const lateral=follow.p.clone().sub(truck.position); lateral.y=0;
 const maxSide=ROAD_W*.40;
 if(lateral.length()>maxSide){
   const excess=Math.min(lateral.length()-maxSide,5);
   lateral.setLength(excess);
   truck.position.add(lateral.multiplyScalar(Math.min(1,dt*5.5)));
   state.speed*=Math.max(0,1-dt*3.8);
 }
 // forward movement
 truck.position.x += Math.sin(truck.rotation.y)*state.speed*dt;
 truck.position.z += Math.cos(truck.rotation.y)*state.speed*dt;
 const info2=roadInfo(truck.position);
 truck.position.y=info2.p.y+.25;

 // Steering wheel visuals: only axles 1 and 2 steer.
 for(const w of wheelSets){
   if(w.userData.steer) w.rotation.y=state.steer*.45;
   // spin around axle
   w.children[0].rotation.x -= state.speed*dt*1.6;
 }
 // body pitch/roll
 const turnRoll=-state.steer*Math.min(.18,Math.abs(state.speed)/55);
 state.roll=lerp(state.roll,turnRoll,.08);
 visual.rotation.z=state.roll;
 visual.rotation.x=lerp(visual.rotation.x,-slope*.16,.08);

 // Rollover physics: excessive speed + steering can overturn.
 const rollover=clamp((Math.abs(state.steer)*Math.abs(state.speed)-7)/8,0,1);
 if(rollover>.02) visual.rotation.z=lerp(visual.rotation.z,state.steer*.62*rollover,.035);
 if(Math.abs(visual.rotation.z)>.78){
   state.speed*=.985;
   visual.rotation.z=lerp(visual.rotation.z,state.steer*.95,.02);
 }

 // Dump animation
 if(state.dumping){
   state.dumpT+=dt;
   const phase=clamp(state.dumpT/4.2,0,1);
   const up=phase<.55?phase/.55:(1-phase)/.45;
   dumpPivot.rotation.x=-THREE.MathUtils.degToRad(42)*up;
   if(phase>=1)state.dumping=false;
 } else {
   dumpPivot.rotation.x=lerp(dumpPivot.rotation.x,0,.08);
 }

 // Camera follows truck heading unless user is manually looking around.
 const now=performance.now();
 if(now>manualCameraUntil && camPointer===null){
   targetCamYaw=0;
 }
 state.camYaw=lerp(state.camYaw,targetCamYaw,.16);
 state.camPitch=lerp(state.camPitch,targetCamPitch,.16);
 state.camDist=lerp(state.camDist,targetCamDist,.16);

 const heading=truck.rotation.y+state.camYaw;
 const horiz=Math.cos(state.camPitch)*state.camDist;
 const camY=truck.position.y+4.8+Math.sin(state.camPitch)*state.camDist;
 const desired=new THREE.Vector3(
   truck.position.x-Math.sin(heading)*horiz,
   camY,
   truck.position.z-Math.cos(heading)*horiz
 );
 camera.position.lerp(desired,.16);

 // The look target uses the same yaw as the orbit. Horizontal drag therefore
 // rotates the view around the truck instead of making it slide sideways.
 const viewForward=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));
 const look=truck.position.clone().add(viewForward.multiplyScalar(5.0));
 look.y+=1.8;
 camera.lookAt(look);

 $("speedN").textContent=Math.round(state.speed*3.6);
 const displayRpm=clamp(audioRpm,700,2200);
 $("rpmFill").style.width=clamp((displayRpm-700)/1500*100,0,100)+"%";
 updateAudio(dt);
}

function animate(){
 requestAnimationFrame(animate);
 const now=performance.now(),dt=Math.min((now-prev)/1000,.05);prev=now;
 update(dt);
 renderer.render(scene,camera);
}
animate();

addEventListener("resize",()=>{
 viewW=Math.max(innerWidth,innerHeight);
 viewH=Math.min(innerWidth,innerHeight);
 camera.aspect=viewW/viewH;
 camera.updateProjectionMatrix();
 renderer.setSize(viewW,viewH,false);
});
})();
