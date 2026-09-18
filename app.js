import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.module.js";

const canvas=document.querySelector("#game"), host=document.querySelector("#viewport");
const speedEl=document.querySelector("#speed"),tripEl=document.querySelector("#trip"),statusEl=document.querySelector("#status");
let scene,camera,renderer,truck,body,clock;
let throttle=false,brake=false,steer=0,speed=0,distance=0,trip=0,disposed=false;
const wheels=[],trees=[];

const M={
 white:new THREE.MeshStandardMaterial({color:0xe7e6df,roughness:.7}),
 dark:new THREE.MeshStandardMaterial({color:0x202326,roughness:.85}),
 black:new THREE.MeshStandardMaterial({color:0x141617,roughness:1}),
 blue:new THREE.MeshStandardMaterial({color:0x2367a8,roughness:.7}),
 yellow:new THREE.MeshStandardMaterial({color:0xd7a51c,roughness:.7}),
 glass:new THREE.MeshStandardMaterial({color:0x263239,roughness:.25,metalness:.1}),
 metal:new THREE.MeshStandardMaterial({color:0x777975,metalness:.65,roughness:.35}),
 gravel:new THREE.MeshStandardMaterial({color:0x6f706b,roughness:1}),
 ground:new THREE.MeshStandardMaterial({color:0x5f6f54,roughness:1}),
 hill:new THREE.MeshStandardMaterial({color:0x4f6149,roughness:1}),
 bark:new THREE.MeshStandardMaterial({color:0x4e3c2c,roughness:1}),
 leaf:new THREE.MeshStandardMaterial({color:0x2e5035,roughness:1})
};
const box=(x,y,z,m)=>new THREE.Mesh(new THREE.BoxGeometry(x,y,z),m);
const cyl=(r,h,m,seg=16)=>new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m);

function addDetail(parent,obj,p){obj.position.set(...p);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj}

function makeTruck(){
 truck=new THREE.Group();
 const chassis=addDetail(truck,box(3.25,.5,6.4,M.dark),[0,1.15,0]);
 // front cab
 const cab=addDetail(truck,box(3.1,2.35,2.25,M.white),[0,2.55,2.05]);
 addDetail(cab,box(2.72,.75,.08,M.glass),[0,.25,-1.16]);
 addDetail(cab,box(.08,.82,1.45,M.glass),[-1.52,.25,-.15]);
 addDetail(cab,box(.08,.82,1.45,M.glass),[1.52,.25,-.15]);
 // grille and bumper
 addDetail(cab,box(2.25,.62,.12,M.dark),[0,-.45,-1.19]);
 addDetail(truck,box(3.3,.3,.55,M.metal),[0,1.25,3.18]);
 addDetail(truck,box(3.15,.18,5.7,M.blue),[0,1.55,-.1]);
 addDetail(truck,box(3.16,.1,5.72,M.yellow),[0,1.68,-.1]);
 // dump body, tilted slightly above chassis
 body=new THREE.Group(); body.position.set(0,2.15,-.85);
 const bin=box(3.02,1.8,3.75,M.white);bin.position.y=.15;bin.castShadow=true;body.add(bin);
 const bedFloor=box(3.1,.18,3.9,M.dark);bedFloor.position.y=-.78;body.add(bedFloor);
 const tail=box(3.0,1.7,.18,M.white);tail.position.set(0,.15,-1.95);body.add(tail);
 const side1=box(.16,1.55,3.65,M.white);side1.position.set(-1.52,.2,0);body.add(side1);
 const side2=box(.16,1.55,3.65,M.white);side2.position.set(1.52,.2,0);body.add(side2);
 body.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});truck.add(body);
 // mirrors, steps, lights
 [-1,1].forEach(s=>{
   addDetail(truck,box(.16,.28,.7,M.dark),[s*1.72,2.55,2.5]);
   addDetail(truck,box(.32,.18,.42,M.yellow),[s*1.58,1.72,3.38]);
   addDetail(truck,box(.42,.22,.18,M.white),[s*1.18,2.12,3.2]);
 });
 // 4 axles / 8 wheels
 const wheelX=[-1.57,1.57], wheelZ=[-2.35,-.75,.85,2.05];
 wheelX.forEach(x=>wheelZ.forEach(z=>{
   const w=cyl(.67,.48,M.black,20);w.rotation.z=Math.PI/2;w.position.set(x,.72,z);w.castShadow=true;truck.add(w);wheels.push(w);
   const hub=cyl(.23,.5,M.metal,16);hub.rotation.z=Math.PI/2;hub.position.set(x,.72,z);truck.add(hub);
 }));
 // exhaust / tank / steps
 addDetail(truck,cyl(.12,1.5,M.metal,12),[1.38,1.85,-1.6]);
 addDetail(truck,box(.55,.7,1.9,M.metal),[-1.75,1.0,.1]);
 addDetail(truck,box(.6,.22,.65,M.dark),[1.58,1.2,2.0]);
 truck.position.set(0,.1,13);
 scene.add(truck);
}

function makeWorld(){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,320),M.ground);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const road=new THREE.Mesh(new THREE.PlaneGeometry(10,290,12,100),M.gravel);road.rotation.x=-Math.PI/2;road.position.y=.035;road.receiveShadow=true;scene.add(road);
 // gravel stones
 for(let i=0;i<900;i++){let s=.035+Math.random()*.08;let rock=cyl(s,s*.7,M.metal,6);rock.position.set((Math.random()-.5)*9.4,.09,-140+Math.random()*280);scene.add(rock)}
 // hills
 for(let i=0;i<14;i++){let h=new THREE.Mesh(new THREE.ConeGeometry(18+Math.random()*16,24+Math.random()*25,8),M.hill);h.position.set((i%2?-1:1)*(18+Math.random()*28),-2,-35-i*18);h.scale.x=1.6;h.receiveShadow=true;scene.add(h)}
 // disposal
 const d=box(22,.5,18,M.dark);d.position.set(0,.25,-118);d.receiveShadow=true;scene.add(d);
 // trees
 for(let i=0;i<130;i++){const g=new THREE.Group();const tr=cyl(.18,.9+Math.random(),M.bark,7);tr.position.y=.7;const crown=new THREE.Mesh(new THREE.ConeGeometry(1.5,4,7),M.leaf);crown.position.y=3;g.add(tr,crown);const side=i%2?-1:1;g.position.set(side*(7+Math.random()*28),0,-145+Math.random()*275);g.scale.setScalar(.55+Math.random()*1);g.userData.baseZ=g.position.z;trees.push(g);scene.add(g)}
 // drainage berms
 for(const side of [-1,1]){const berm=box(.55,.45,285,M.dark);berm.position.set(side*5.55,.18,0);scene.add(berm)}
}

function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x91a9b1);scene.fog=new THREE.Fog(0x91a9b1,65,190);
 camera=new THREE.PerspectiveCamera(62,1,.1,350);
 camera.position.set(0,6.4,18);camera.lookAt(0,1,0);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene.add(new THREE.HemisphereLight(0xdce6e5,0x46533e,2));
 const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-35,55,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 makeWorld();makeTruck();clock=new THREE.Clock();resize();requestAnimationFrame(loop);
}
function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
function reset(){speed=0;distance=0;disposed=false;truck.position.set(0,.1,13);truck.position.x=0;truck.rotation.set(0,0,0);body.rotation.set(0,0,0);document.querySelector("#dump").disabled=true;statusEl.textContent="Ikuti jalan kerikil menuju disposal."}
function updateTruck(dt){
 let target=throttle?(brake?0:15):(brake?-8:0);speed+=(target-speed)*Math.min(1,dt*2.7);
 if(!throttle&&!brake&&Math.abs(speed)<.05)speed=0;
 distance+=speed*dt;truck.position.z=13-distance;truck.position.x+=(steer*3.1-truck.position.x)*dt*2.5;truck.rotation.y=steer*.06;
 wheels.forEach(w=>w.rotation.x-=speed*dt*1.8);
 const atDisposal=distance>112;
 if(atDisposal&&!disposed){document.querySelector("#dump").disabled=false;statusEl.textContent=speed>1?"Kurangi kecepatan sampai berhenti di disposal.":"Berhenti di disposal lalu tekan DUMP."}
 if(body.rotation.x!==0 && Math.abs(speed)<.1)body.rotation.x=0;
}
function loop(){
 requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.04);updateTruck(dt);
 // follow camera
 camera.position.x+=(truck.position.x*.42-camera.position.x)*dt*2;
 camera.position.z+=(truck.position.z+13-camera.position.z)*dt*2;
 camera.position.y=truck.position.y+5.8;camera.lookAt(truck.position.x,1.2,truck.position.z-8);
 speedEl.textContent=Math.round(Math.max(0,speed*5));tripEl.textContent=trip;
 renderer.render(scene,camera);
}
function hold(id,set){const b=document.querySelector(id);const d=e=>{e.preventDefault();set(true)},u=()=>set(false);b.addEventListener("pointerdown",d);["pointerup","pointercancel","pointerleave"].forEach(v=>b.addEventListener(v,u))}
hold("#gas",v=>throttle=v);hold("#brake",v=>brake=v);hold("#left",v=>steer=v?-1:0);hold("#right",v=>steer=v?1:0);
document.querySelector("#reset").addEventListener("click",reset);
document.querySelector("#dump").addEventListener("click",()=>{
 if(document.querySelector("#dump").disabled||speed>1)return;
 body.rotation.x=-0.55;setTimeout(()=>body.rotation.x=0,1300);
 trip++;disposed=true;distance=0;truck.position.z=13;document.querySelector("#dump").disabled=true;
 statusEl.textContent="✓ Dumping selesai. Kembali ke loading point untuk rit berikutnya.";
});
window.addEventListener("resize",resize);
init();setTimeout(()=>{const l=document.querySelector("#loading");l.style.opacity=0;setTimeout(()=>l.remove(),350)},650);
