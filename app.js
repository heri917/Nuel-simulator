import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.module.js";

const canvas = document.querySelector("#game");
const speedEl = document.querySelector("#speed");
const statusEl = document.querySelector("#status");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ea4aa);
scene.fog = new THREE.Fog(0x8ea4aa, 90, 360);

const camera = new THREE.PerspectiveCamera(
  58,
  innerWidth / innerHeight,
  0.1,
  700
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;

scene.add(new THREE.HemisphereLight(0xd9eaff, 0x34442e, 2.4));

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(80, 130, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const M = {
  ground: new THREE.MeshStandardMaterial({
    color: 0x41483d,
    roughness: 1
  }),
  road: new THREE.MeshStandardMaterial({
    color: 0x62625c,
    roughness: 1
  }),
  gravel: new THREE.MeshStandardMaterial({
    color: 0x85837a,
    roughness: 1
  }),
  white: new THREE.MeshStandardMaterial({
    color: 0xe8e8e4,
    roughness: 0.65
  }),
  black: new THREE.MeshStandardMaterial({
    color: 0x111315,
    roughness: 0.7
  }),
  blue: new THREE.MeshStandardMaterial({
    color: 0x174f82,
    roughness: 0.55
  }),
  yellow: new THREE.MeshStandardMaterial({
    color: 0xf2c400,
    roughness: 0.55
  }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x172932,
    roughness: 0.2,
    metalness: 0.15
  }),
  metal: new THREE.MeshStandardMaterial({
    color: 0x777b79,
    roughness: 0.35,
    metalness: 0.55
  }),
  tree: new THREE.MeshStandardMaterial({
    color: 0x1d4022,
    roughness: 1
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: 0x493321,
    roughness: 1
  })
};

/* =========================
   GROUND
========================= */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(800, 800),
  M.ground
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* =========================
   HAUL ROAD
========================= */

const road = [];

for (let i = 0; i < 260; i++) {
  const z = 190 - i * 1.55;

  const x =
    Math.sin(i * 0.065) * 25 +
    Math.sin(i * 0.018) * 28;

  const y =
    1 +
    Math.sin(i * 0.035) * 4 +
    Math.sin(i * 0.012) * 7;

  road.push(new THREE.Vector3(x, y, z));
}

const ROAD_WIDTH = 11;

for (let i = 0; i < road.length - 1; i++) {
  const a = road[i];
  const b = road[i + 1];

  const dir = new THREE.Vector3()
    .subVectors(b, a)
    .normalize();

  const side = new THREE.Vector3(
    -dir.z,
    0,
    dir.x
  ).normalize();

  const v = [
    a.clone().addScaledVector(side, ROAD_WIDTH / 2),
    a.clone().addScaledVector(side, -ROAD_WIDTH / 2),
    b.clone().addScaledVector(side, -ROAD_WIDTH / 2),
    b.clone().addScaledVector(side, ROAD_WIDTH / 2)
  ];

  const g = new THREE.BufferGeometry();

  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      v.flatMap(p => [p.x, p.y, p.z]),
      3
    )
  );

  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();

  const mesh = new THREE.Mesh(g, M.road);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/* =========================
   GRAVEL
========================= */

for (let i = 0; i < 900; i++) {
  const p = road[
    Math.floor(Math.random() * road.length)
  ];

  const stone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(
      0.04 + Math.random() * 0.12,
      0
    ),
    M.gravel
  );

  stone.position.set(
    p.x + (Math.random() - 0.5) * 10,
    p.y + 0.05,
    p.z + (Math.random() - 0.5) * 10
  );

  scene.add(stone);
}

/* =========================
   TREES
========================= */

function makeTree(x, y, z, scale) {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.28, 2.8, 7),
    M.trunk
  );

  trunk.position.y = 1.4;
  trunk.castShadow = true;
  g.add(trunk);

  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(
        2.2 - i * 0.35,
        3.2,
        8
      ),
      M.tree
    );

    crown.position.y = 3 + i * 1.15;
    crown.castShadow = true;
    g.add(crown);
  }

  g.position.set(x, y, z);
  g.scale.setScalar(scale);

  scene.add(g);
}

for (let i = 0; i < 420; i++) {
  const p =
    road[Math.floor(Math.random() * road.length)];

  const side =
    Math.random() < 0.5 ? -1 : 1;

  makeTree(
    p.x +
      side *
        (10 + Math.random() * 32),
    p.y,
    p.z + (Math.random() - 0.5) * 22,
    0.7 + Math.random() * 1.1
  );
}

/* =========================
   HILLS
========================= */

for (let i = 0; i < 75; i++) {
  const p =
    road[Math.floor(Math.random() * road.length)];

  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(
      13 + Math.random() * 18,
      20 + Math.random() * 35,
      8
    ),
    M.tree
  );

  const side =
    Math.random() < 0.5 ? -1 : 1;

  hill.position.set(
    p.x + side * (25 + Math.random() * 35),
    7,
    p.z + (Math.random() - 0.5) * 30
  );

  hill.scale.y = 1.2;
  hill.receiveShadow = true;
  hill.castShadow = true;

  scene.add(hill);
}

/* =========================
   TRUCK
   VOLVO FMX 440
   8x4
========================= */

const truck = new THREE.Group();
scene.add(truck);

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat
  );

  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;

  truck.add(m);
  return m;
}

/* chassis */

box(3.25, 0.42, 8.4, M.black, 0, 2.0, 0);

/* front bumper */

box(3.45, 0.45, 0.75, M.black, 0, 2.05, 2.9);

/* cab lower */

box(3.3, 0.65, 3.2, M.black, 0, 2.45, 2.65);

/* cab */

box(3.1, 2.65, 3.05, M.white, 0, 3.75, 2.45);

/* windshield */

box(2.55, 1.2, 0.08, M.glass, 0, 4.25, 0.91);

/* front grille */

box(2.15, 0.95, 0.1, M.black, 0, 3.15, 0.9);

/* grille bars */

for (let i = -2; i <= 2; i++) {
  box(
    0.08,
    0.75,
    0.05,
    M.metal,
    i * 0.38,
    3.15,
    0.83
  );
}

/* headlights */

box(0.5, 0.32, 0.08, M.yellow, -1.05, 2.85, 0.84);
box(0.5, 0.32, 0.08, M.yellow, 1.05, 2.85, 0.84);

/* blue / yellow livery */

box(3.15, 0.25, 1.9, M.blue, 0, 3.05, 2.65);
box(3.17, 0.13, 1.9, M.yellow, 0, 3.31, 2.65);

/* mirrors */

box(0.35, 0.7, 0.7, M.black, -1.82, 4.15, 1.7);
box(0.35, 0.7, 0.7, M.black, 1.82, 4.15, 1.7);

/* steps */

box(0.48, 0.24, 0.9, M.black, -1.7, 2.55, 1.55);
box(0.48, 0.24, 0.9, M.black, 1.7, 2.55, 1.55);

/* fuel tank */

const tank = new THREE.Mesh(
  new THREE.CylinderGeometry(0.56, 0.56, 2.4, 16),
  M.metal
);

tank.rotation.z = Math.PI / 2;
tank.position.set(-1.82, 1.8, -0.9);
tank.castShadow = true;
truck.add(tank);

/* =========================
   DUMP BODY
========================= */

const dump = new THREE.Group();

dump.position.set(0, 3.75, -1.8);
truck.add(dump);

const dumpBody = new THREE.Mesh(
  new THREE.BoxGeometry(3.05, 2.25, 5.05),
  M.white
);

dumpBody.position.y = 0.55;
dumpBody.castShadow = true;
dump.add(dumpBody);

/* dump floor */

const dumpFloor = new THREE.Mesh(
  new THREE.BoxGeometry(3.2, 0.18, 5.2),
  M.black
);

dumpFloor.position.y = -0.6;
dump.add(dumpFloor);

/* upper rim */

const rim = new THREE.Mesh(
  new THREE.BoxGeometry(3.25, 0.18, 5.2),
  M.black
);

rim.position.y = 1.75;
dump.add(rim);

/* dump side reinforcement */

for (let z = -2; z <= 2; z += 1) {
  box(
    0.14,
    1.8,
    0.12,
    M.black,
    -1.56,
    4.05,
    z - 1.8
  );

  box(
    0.14,
    1.8,
    0.12,
    M.black,
    1.56,
    4.05,
    z - 1.8
  );
}

/* rear hazard stripes */

for (let i = -1; i <= 1; i++) {
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 1.1, 0.08),
    M.yellow
  );

  stripe.position.set(
    i * 0.7,
    3.9,
    -4.45
  );

  stripe.rotation.z = -0.45;
  truck.add(stripe);
}

/* hydraulic cylinder */

const hydraulic = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, 2.5, 10),
  M.metal
);

hydraulic.position.set(0, 3.05, -1.1);
hydraulic.rotation.z = 0.3;
truck.add(hydraulic);

/* =========================
   WHEELS
   AXLE 1 = 2
   AXLE 2 = 2
   AXLE 3 = 4
   AXLE 4 = 4
   TOTAL = 12 TYRES
========================= */

const tyres = [];

function tyre(x, z, offset = 0) {
  const t = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.67,
      0.67,
      0.42,
      20
    ),
    M.black
  );

  t.rotation.z = Math.PI / 2;

  t.position.set(
    x + offset,
    1.25,
    z
  );

  t.castShadow = true;
  truck.add(t);
  tyres.push(t);
}

/* AXLE 1 */

tyre(-1.72, 2.15);
tyre(1.72, 2.15);

/* AXLE 2 */

tyre(-1.72, 0.65);
tyre(1.72, 0.65);

/* AXLE 3 DUAL */

tyre(-1.72, -1.05, -0.24);
tyre(-1.72, -1.05, 0.24);
tyre(1.72, -1.05, -0.24);
tyre(1.72, -1.05, 0.24);

/* AXLE 4 DUAL */

tyre(-1.72, -2.65, -0.24);
tyre(-1.72, -2.65, 0.24);
tyre(1.72, -2.65, -0.24);
tyre(1.72, -2.65, 0.24);

/* =========================
   TRUCK START
========================= */

let roadIndex = road.length - 5;

truck.position.copy(road[roadIndex]);

function alignTruck() {
  const p = road[Math.floor(roadIndex)];
  const n = road[Math.floor(roadIndex) - 1];

  const dx = n.x - p.x;
  const dz = n.z - p.z;

  truck.rotation.y = Math.atan2(dx, dz);
}

alignTruck();

/* =========================
   CONTROLS
========================= */

let gas = false;
let brake = false;
let steer = 0;
let dumping = false;

function button(id, down, up) {
  const el = document.querySelector("#" + id);

  if (!el) return;

  el.addEventListener("pointerdown", e => {
    e.preventDefault();
    down();
  });

  el.addEventListener("pointerup", e => {
    e.preventDefault();
    up();
  });

  el.addEventListener("pointercancel", up);
}

button(
  "gas",
  () => gas = true,
  () => gas = false
);

button(
  "brake",
  () => brake = true,
  () => brake = false
);

button(
  "left",
  () => steer = -1,
  () => steer = 0
);

button(
  "right",
  () => steer = 1,
  () => steer = 0
);

const dumpButton =
  document.querySelector("#dump");

if (dumpButton) {
  dumpButton.addEventListener(
    "pointerdown",
    e => {
      e.preventDefault();
      dumping = !dumping;
    }
  );
}

const resetButton =
  document.querySelector("#reset");

if (resetButton) {
  resetButton.addEventListener(
    "pointerdown",
    e => {
      e.preventDefault();

      roadIndex = road.length - 5;
      speed = 0;
      dumping = false;

      truck.position.copy(
        road[Math.floor(roadIndex)]
      );

      alignTruck();
    }
  );
}

/* =========================
   PHYSICS
========================= */

let speed = 0;

function updateTruck(dt) {
  if (gas) {
    speed += 7.5 * dt;
  } else {
    speed -= 2.0 * dt;
  }

  if (brake) {
    speed -= 14 * dt;
  }

  speed = THREE.MathUtils.clamp(
    speed,
    0,
    15
  );

  if (speed > 0.05) {
    roadIndex -=
      speed * dt * 0.72;
  }

  roadIndex = THREE.MathUtils.clamp(
    roadIndex,
    2,
    road.length - 2
  );

  const p =
    road[Math.floor(roadIndex)];

  truck.position.lerp(p, 0.2);

  alignTruck();

  truck.rotation.y +=
    steer * dt * 0.22;

  const targetDump =
    dumping ? -0.58 : 0;

  dump.rotation.x =
    THREE.MathUtils.lerp(
      dump.rotation.x,
      targetDump,
      dt * 3
    );

  tyres.forEach(t => {
    t.rotation.x -= speed * dt * 2;
  });

  if (speedEl) {
    speedEl.textContent =
      Math.round(speed * 3.6) + " km/j";
  }

  if (statusEl) {
    statusEl.textContent =
      dumping
        ? "Bak sedang dumping..."
        : "DT030-0204 • Volvo FMX 440";
  }
}

/* =========================
   CAMERA 360°
========================= */

let yaw = Math.PI;
let pitch = 0.38;
let distance = 14;

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener(
  "pointerdown",
  e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
);

canvas.addEventListener(
  "pointermove",
  e => {
    if (!dragging) return;

    const dx =
      e.clientX - lastX;

    const dy =
      e.clientY - lastY;

    yaw -= dx * 0.007;
    pitch -= dy * 0.004;

    pitch = THREE.MathUtils.clamp(
      pitch,
      0.12,
      1.0
    );

    lastX = e.clientX;
    lastY = e.clientY;
  }
);

canvas.addEventListener(
  "pointerup",
  () => dragging = false
);

canvas.addEventListener(
  "pointercancel",
  () => dragging = false
);

function updateCamera(dt) {
  const target =
    truck.position.clone();

  target.y += 2.1;

  const offset = new THREE.Vector3(
    Math.sin(yaw) *
      Math.cos(pitch) *
      distance,

    Math.sin(pitch) *
      distance,

    Math.cos(yaw) *
      Math.cos(pitch) *
      distance
  );

  const desired =
    target.clone().add(offset);

  camera.position.lerp(
    desired,
    1 - Math.pow(0.002, dt)
  );

  camera.lookAt(target);
}

/* =========================
   RESIZE
========================= */

addEventListener(
  "resize",
  () => {
    camera.aspect =
      innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);

/* =========================
   LOOP
========================= */

const clock =
  new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt =
    Math.min(
      clock.getDelta(),
      0.05
    );

  updateTruck(dt);
  updateCamera(dt);

  renderer.render(
    scene,
    camera
  );
}

animate();
