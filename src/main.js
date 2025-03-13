import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// SCENE, CAM, RENDER etc
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("gameContainer").appendChild(renderer.domElement);

//Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Basic light stuff
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 20, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Audio
const listener = new THREE.AudioListener();
camera.add(listener);
const shotSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load("assets/shot.mp3", function (buffer) {
  shotSound.setBuffer(buffer);
  shotSound.setVolume(0.5);
});

// Bridge panels
const panelCount = 10;
const panelWidth = 1;
const panelDepth = 1;
const panelThickness = 0.2;
const panelGeometry = new THREE.BoxGeometry(
  panelWidth,
  panelThickness,
  panelDepth
);
// top at y=0 is easier
panelGeometry.translate(0, -panelThickness / 2, 0);

const panels = [];

// Rails next to panels
const railWidth = 0.1;
const railDepth = 32; // total length = 32
const railGeometry = new THREE.BoxGeometry(
  railWidth,
  panelThickness,
  railDepth
);
const railMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
railGeometry.translate(0, -panelThickness / 2, 0);

// start and end platforms
const platformSize = 3;
const platformGeom = new THREE.BoxGeometry(
  platformSize + 0.2,
  panelThickness,
  platformSize
); //added 0.2 so aligns with 0.1 width rails
platformGeom.translate(0, -panelThickness / 2, 0);
const platformMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

const startPlatform = new THREE.Mesh(platformGeom, platformMat);
startPlatform.position.set(0, 0, 1); // changed to 1 so matches length in between
startPlatform.receiveShadow = true;
scene.add(startPlatform);

const endPlatform = new THREE.Mesh(platformGeom, platformMat);
let endPos = new THREE.Vector3(0, 0, -panelCount * 3 - 4);
endPlatform.position.copy(endPos);
endPlatform.receiveShadow = true;
scene.add(endPlatform);

///////////////////////////////// DOLL

let isRedLight = false;
let dollRotationComplete = false;
let dollTargetRotation = Math.PI;
let lightSwitchTimer = 0;
let nextLightSwitch = Math.random() * 5 + 3;

// Load doll
const loader = new OBJLoader();
const loader2 = new GLTFLoader();
let doll;
loader.load("assets/doll.obj", function (object) {
  doll = object;
  doll.position.copy(endPos);
  doll.scale.set(10, 10, 10);
  doll.rotation.y = dollTargetRotation;

  // DOLL EYE LIGHTS
  const eyeLight = new THREE.PointLight(0xff0000, 0, 3);
  eyeLight.position.set(0, 2, 0);
  doll.add(eyeLight);

  scene.add(doll);
});
let player;
loader2.load(
  "../assets/guard.gltf",
  (gltf) => {
    player = gltf.scene;
    player.scale.set(0.15, 0.15, 0.15);
    player.position.set(0, 0, 0);
    player.castShadow = true;
    // Create a new bounding box from the model
    const box = new THREE.Box3().setFromObject(player);
    const bboxMin = box.min.y; // lowest Y value of the model
    // Adjust player's position so the base sits at y = 0
    player.position.set(0, -bboxMin, 0);
    // update the model's world matrix
    player.updateWorldMatrix(true, true);
    // Get the size of the bounding box
    const size = box.getSize(new THREE.Vector3());
    // The height of the model is the Y component of the size vector
    console.log("Model Height:", size.y);
    scene.add(player);
  },
  undefined,
  (error) => {
    console.error("Error loading the model:", error);
  }
);

// PROJECTILES
let bullets = [];
const minFireWait = 1;
const bulletSpeed = 1.5;
let lastShotTime = -minFireWait;
function shootProjectile() {
  console.log("shoot!!");
  if (shotSound.isPlaying) shotSound.stop();
  shotSound.play();
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  let spawnPos = doll.position.clone();
  spawnPos.y += 5;
  bullet.position.copy(spawnPos);

  const predictionTime = 0.001;
  let targetPos = player.position.clone();
  // targetPos.y += playerHeight * 0.5;
  const futurePosition = targetPos.add(
    playerVelocity.clone().multiplyScalar(predictionTime)
  );
  bullet.userData.velocity = new THREE.Vector3()
    .subVectors(futurePosition, spawnPos)
    .normalize()
    .multiplyScalar(bulletSpeed);
  scene.add(bullet);
  bullets.push(bullet);
}

let moving = false;
///////////////////////////////// DOLL

function add2Lights(x, y, z) {
  //add 2 lights going backwards from the current position
  for (let i = 0; i < 2; i++) {
    // Point Light for Panels
    const pointLight = new THREE.PointLight(0xffff00, 1, 3); // yellow color, intensity, distance
    pointLight.castShadow = false;
    pointLight.position.set(x, y, z + (3.0 / 2.0) * i); // change z for each light to space out

    // Add a sphere (light bulb) to represent the bulb
    const bulbGeometry = new THREE.SphereGeometry(0.04, 16, 16); // 0.04 radius
    const bulbMaterial = new THREE.MeshStandardMaterial({
      emissive: 0xffff00, // Glow color
      emissiveIntensity: 1, // Glow intensity
      roughness: 0.5,
      metalness: 0.2,
    });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.set(x, y, z + (3.0 / 2.0) * i);
    scene.add(bulb);
    scene.add(pointLight);
  }
}

// Make a bunch of panels
for (let i = 1; i <= panelCount; i++) {
  const zPos = -i * 3;
  const xOffset = 1.0;
  // randomly decide if left or right is safe
  const safeOnLeft = Math.random() < 0.5;

  // init left panel
  const leftPanel = new THREE.Mesh(panelGeometry, null);
  leftPanel.position.set(-xOffset, 0, zPos);
  leftPanel.castShadow = true;
  leftPanel.receiveShadow = true;
  leftPanel.userData.breakable = !safeOnLeft;
  leftPanel.userData.index = i;
  scene.add(leftPanel);
  panels.push(leftPanel);
  const llrailxOffset = -1 - panelWidth / 2 - railWidth / 2;
  add2Lights(llrailxOffset - 0.1, -0.1, zPos - panelDepth / 2); //x,y,z at the top of panel

  // init right panel
  const rightPanel = new THREE.Mesh(panelGeometry, null);
  rightPanel.position.set(xOffset, 0, zPos);
  rightPanel.castShadow = true;
  rightPanel.receiveShadow = true;
  rightPanel.userData.breakable = safeOnLeft;
  rightPanel.userData.index = i;
  scene.add(rightPanel);
  panels.push(rightPanel);
  const rrrailxOffset = 1 + panelWidth / 2 + railWidth / 2;
  add2Lights(rrrailxOffset + 0.1, -0.1, zPos - panelDepth / 2); //x,y,z at the top of panel
}

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88ccee,
  metalness: 0,
  roughness: 0.1,
  transmission: 1.0,
  thickness: panelThickness,
  ior: 1.5,
  envMapIntensity: 1.0,
  transparent: true,
  opacity: 1.0,
  side: THREE.DoubleSide,
});
panels.forEach((panel) => {
  panel.material = glassMaterial;
});
// Make the 4 rails
const llrailxOffset = -1 - panelWidth / 2 - railWidth / 2;
const lrrailxOffset = -1 + panelWidth / 2 + railWidth / 2;
const rlrailxOffset = 1 - panelWidth / 2 - railWidth / 2;
const rrrailxOffset = 1 + panelWidth / 2 + railWidth / 2;
const llRail = new THREE.Mesh(railGeometry, railMat);
const lrRail = new THREE.Mesh(railGeometry, railMat);
const rlRail = new THREE.Mesh(railGeometry, railMat);
const rrRail = new THREE.Mesh(railGeometry, railMat);
llRail.position.set(llrailxOffset, 0, -16.5); //-16.5 = z position of middle of rail
lrRail.position.set(lrrailxOffset, 0, -16.5);
rlRail.position.set(rlrailxOffset, 0, -16.5);
rrRail.position.set(rrrailxOffset, 0, -16.5);
scene.add(llRail);
scene.add(lrRail);
scene.add(rlRail);
scene.add(rrRail);

// Make the player
//const playerHeight = 1;
//const playerGeom = new THREE.BoxGeometry(0.5, playerHeight, 0.5);
//const playerMat = new THREE.MeshStandardMaterial({ color: 0xff5555 });
//const player = new THREE.Mesh(playerGeom, playerMat);
//player.position.set(0, playerHeight * 3, 0);
//player.castShadow = true;
//scene.add(player);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = true;
const moveSpeed = 5;
const gravity = 9.8;
let velocityY = 0;
let previousPosition = new THREE.Vector3();
let playerVelocity = new THREE.Vector3();

// Controls
document.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = true;
      break;
    case "ArrowDown":
    case "KeyS":
      moveBackward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      moveLeft = true;
      break;
    case "ArrowRight":
    case "KeyD":
      moveRight = true;
      break;
    case "Space":
      // jump - add vel
      if (canJump) {
        velocityY = 5;
        console.log("Jump!");
        canJump = false;
      }
      break;
  }
});

document.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = false;
      break;
    case "ArrowDown":
    case "KeyS":
      moveBackward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      moveLeft = false;
      break;
    case "ArrowRight":
    case "KeyD":
      moveRight = false;
      break;
  }
});

const playerHeight = 0.1;
// PHYSICS
const raycaster = new THREE.Raycaster();
raycaster.far = playerHeight;
const fallingPanels = [];
let score = 0;
let currentStepReached = 0;

// break panel
function breakPanel(panel) {
  const idx = panels.indexOf(panel);
  if (idx !== -1) panels.splice(idx, 1);
  panel.userData.broken = true;
  fallingPanels.push({ mesh: panel, velocityY: 0 });
}

function resetToStart() {
  player.position.set(0, playerHeight / 2, 0);
  velocityY = 0;
  canJump = true;
}

// Animation loop control
const clock = new THREE.Clock();
let stopAnimation = false;

function animate() {
  if (stopAnimation) return;
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // movement
  const moveDistance = moveSpeed * delta;
  if (moveForward) player.position.z -= moveDistance;
  if (moveBackward) player.position.z += moveDistance;
  if (moveLeft) player.position.x -= moveDistance;
  if (moveRight) player.position.x += moveDistance;

  // connect the cam to the player (uncomment to stick camera unto player and not use orbit controls)
  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 5;
  camera.position.y = player.position.y + 3;
  camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
  // Gravity
  velocityY -= gravity * delta;
  player.position.y += velocityY * delta;

  // SURFACE DETECTION PHYSICS
  raycaster.set(player.position.clone(), new THREE.Vector3(0, -1, 0));
  const intersects = raycaster.intersectObjects([
    ...panels,
    startPlatform,
    endPlatform,
  ]);
  canJump = false;
  if (intersects.length > 0) {
    const hit = intersects[0];

    // check if "contacting" surface
    if (velocityY <= 0 && hit.distance < playerHeight / 2 + 0.2) {
      const surface = hit.object;

      // snap to surface
      player.position.y = surface.position.y + playerHeight / 2;
      velocityY = 0;
      canJump = true;

      // trigger break if applicable
      if (surface.userData.breakable && !surface.userData.broken) {
        breakPanel(surface);
      }
      // idk if we will want to track score for multiplayer but here it is
      else if (
        surface.userData.index &&
        surface.userData.index > currentStepReached &&
        !surface.userData.breakable
      ) {
        currentStepReached = surface.userData.index;
        score++;
        console.log(`Score: ${score}`);
      }
    }
  }

  // PHYSICS FOR FALLING PANELS
  for (let i = 0; i < fallingPanels.length; i++) {
    const fp = fallingPanels[i];
    fp.velocityY -= gravity * delta;
    fp.mesh.position.y += fp.velocityY * delta;
    fp.mesh.rotation.x += 0.01;
    fp.mesh.rotation.z += 0.02;

    // kill far panels
    if (fp.mesh.position.y < -20) {
      scene.remove(fp.mesh);
      fallingPanels.splice(i, 1);
      i--;
    }
  }

  // reset on death
  if (player.position.y < -5) {
    resetToStart();
  }

  ///////////////////// DOLL LOGIC

  lightSwitchTimer += delta;

  // RED LIGHT / GREEN LIGHT

  // player moving?
  // calc velocity
  playerVelocity
    .subVectors(player.position, previousPosition)
    .divideScalar(delta);
  previousPosition.copy(player.position);
  moving = playerVelocity.length() > 0.1;

  // doll rotate
  dollTargetRotation = isRedLight ? 0 : Math.PI;
  const rotationSpeed = 2 * delta;
  doll.rotation.y += (dollTargetRotation - doll.rotation.y) * rotationSpeed;
  if (Math.abs(doll.rotation.y - dollTargetRotation) < 0.05) {
    //snap
    doll.rotation.y = dollTargetRotation;
  }

  // can shoot
  if (Math.abs(0 - dollTargetRotation) < 0.05) {
    dollRotationComplete = true;
  } else {
    dollRotationComplete = false;
  }

  // switch light
  if (lightSwitchTimer > nextLightSwitch) {
    isRedLight = !isRedLight;
    nextLightSwitch = Math.random() * 5 + 3; // Reset next random switch time
    lightSwitchTimer = 0;
    // eyeLight.intensity = isRedLight ? 3 : 0;
  }
  console.log(
    `moving ${moving}, isRedLight ${isRedLight}, rotComplete ${dollRotationComplete}`
  );

  // CHECK PLAYER MOVEMENT DURING RED LIGHT
  const playerPastStart = player.position.z < startPlatform.position.z - 1;
  if (isRedLight && moving && dollRotationComplete && playerPastStart) {
    // shootProjectile();
    // fire rate logic
    const currentTime = clock.getElapsedTime();
    if (currentTime - lastShotTime >= minFireWait) {
      shootProjectile();
      console.log("shoot");
      lastShotTime = currentTime;
    } else {
      console.log(
        `time not satisfied. ${currentTime}, ${lastShotTime}, ${minFireWait}`
      );
    }
  }

  // UPDATE BULLETS
  for (let i = 0; i < bullets.length; i++) {
    bullets[i].position.add(bullets[i].userData.velocity);
    if (bullets[i].position.distanceTo(player.position) < 1) {
      console.log("Player Hit! Resetting...");
      player.position.set(0, 1, 0);
      scene.remove(bullets[i]);
      bullets.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

animate();

//model height = 1.744
