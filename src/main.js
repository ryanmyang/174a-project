import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const playerWidth = 0.5;
const panelCount = 10;
let endPos = new THREE.Vector3(0, 0, -panelCount * 3 - 4);
let checkpointUnlocked = false;
const checkpointPos = new THREE.Vector3(0, 0, -((panelCount / 2) * 3));
let checkpointPlatformVisual, checkpointPlatformCollision;

// SCENE, CAM, RENDER etc
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
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
dirLight.shadow.mapSize.width = 256;
dirLight.shadow.mapSize.height = 256;
scene.add(dirLight);

////// SPOTLIGHTS
const spotLight = new THREE.SpotLight(0xffffff, 75, 20, Math.PI / 12, 0.5, 1);
spotLight.position.set(-10, 15, -25);
spotLight.target.position.set(0, 0, -25);
scene.add(spotLight);
scene.add(spotLight.target); // Ensure target is part of the scene

/* spotlight helper
const spotLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(spotLightHelper); */

const spotLightDoll = new THREE.SpotLight(0xffffff, 50, 25, Math.PI / 12, 0.5, 1);
spotLightDoll.position.set(10,15,-20);
let dollLightTarget = endPos.clone();
dollLightTarget.y += 5;
spotLightDoll.target.position.copy(dollLightTarget);
scene.add(spotLightDoll);
scene.add(spotLightDoll.target);
//const spotLightDollHelper = new THREE.SpotLightHelper(spotLightDoll);
//scene.add(spotLightDollHelper);


const spotLight2 = new THREE.SpotLight(0xffffff, 50, 20, Math.PI / 12, 0.5, 1);
spotLight2.position.set(10, 15, -10);
spotLight2.target.position.set(0, 0, -10);
scene.add(spotLight2);
scene.add(spotLight2.target); // Ensure target is part of the scene

/* spotlight helper
const spotLight2Helper = new THREE.SpotLightHelper(spotLight2);
scene.add(spotLight2Helper); */


//// BLOOD SPRAY
const bloodSprays = [];
function spawnBloodSpray(spawnPos) {
  const count = 20;
  const positions = new Float32Array(count * 3);
  const velocities = []; 

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    positions[i3 + 0] = spawnPos.x;
    positions[i3 + 1] = spawnPos.y;
    positions[i3 + 2] = spawnPos.z;


    velocities[i] = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2 + 1,
      (Math.random() - 0.5) * 2 + 3
    );
  }


  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x9f0000,
    size: 0.1,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geometry, material);
  points.userData.velocities = velocities;
  points.userData.lifetimes = new Float32Array(count).fill(2.0);
  scene.add(points);
  bloodSprays.push(points);
}


//// END BLOOD SPRAY

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
const pinkMetalMaterial = new THREE.MeshStandardMaterial({
  //pink metallic for rails and platform
  color: 0xff6b81,
  metalness: 0.8,
  roughness: 0.2,
});
const panelCollisions = [];

// Rails next to panels
const railWidth = 0.1;
const railDepth = 32; // total length = 32
const railGeometry = new THREE.BoxGeometry(
  railWidth,
  panelThickness,
  railDepth
);
const railMat = pinkMetalMaterial;
railGeometry.translate(0, -panelThickness / 2, 0);

// start and end platforms
const platformSize = 3;
const platformGeom = new THREE.BoxGeometry(
  platformSize + 0.2,
  panelThickness,
  platformSize
); //added 0.2 so aligns with 0.1 width rails
platformGeom.translate(0, -panelThickness / 2, 0);
const platformMat = pinkMetalMaterial;

// START
const startPlatformVisual = new THREE.Mesh(platformGeom, platformMat);
startPlatformVisual.position.set(0, 0, 1);
startPlatformVisual.receiveShadow = true;
scene.add(startPlatformVisual);
const startCollisionGeom = new THREE.BoxGeometry(
  platformSize + playerWidth + 0.1,
  panelThickness,
  platformSize + playerWidth + 0.1
);
startCollisionGeom.translate(0, -panelThickness / 2, 0);
const startCollisionMat = new THREE.MeshBasicMaterial({ visible: false });
const startPlatformCollision = new THREE.Mesh(
  startCollisionGeom,
  startCollisionMat
);
startPlatformCollision.position.set(0, 0, 1);
scene.add(startPlatformCollision);

//END
const endPlatformVisual = new THREE.Mesh(platformGeom, platformMat);
endPlatformVisual.position.copy(endPos);
endPlatformVisual.receiveShadow = true;
scene.add(endPlatformVisual);


// CHECKPOINT
checkpointPlatformVisual = new THREE.Mesh(platformGeom.clone(), platformMat.clone());
checkpointPlatformVisual.position.copy(checkpointPos);
checkpointPlatformVisual.receiveShadow = true;
scene.add(checkpointPlatformVisual);

const checkpointCollisionGeom = new THREE.BoxGeometry(
  platformSize + playerWidth + 0.1,
  panelThickness,
  platformSize + playerWidth + 0.1
);
checkpointCollisionGeom.translate(0, -panelThickness / 2, 0);
const checkpointCollisionMat = new THREE.MeshBasicMaterial({ visible: false });
checkpointPlatformCollision = new THREE.Mesh(checkpointCollisionGeom, checkpointCollisionMat);
checkpointPlatformCollision.position.copy(checkpointPos);
scene.add(checkpointPlatformCollision);

////////////// ELLIPTICAL LIGHTS
const numStrips = 10;
const stripLength = 15;
const stripWidth = 0.2;
const majorAxis = 20;
const minorAxis = 10;

// Function creates vertical strip
function createStrip(length) {
  const geometry = new THREE.BoxGeometry(stripWidth, length, stripWidth);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    emissive: 0xffff00, //yellowish
    side: THREE.DoubleSide,
  });
  const strip = new THREE.Mesh(geometry, material);
  return strip;
}

const strips = [];
// creating vertical strips for the ellipse
for (let i = 0; i < numStrips; i++) {
  if (i == 0) continue; // removes the first one blocking the player
  const angle = (i / numStrips) * 2 * Math.PI; // getting the angle to calculate the coordinates
  const z = majorAxis * Math.cos(angle);
  const x = minorAxis * Math.sin(angle);

  const strip = createStrip(stripLength);
  strip.position.set(x, stripLength / 2 - 3, z - 17); // position properly to form ellipse

  scene.add(strip);
  strips.push(strip);
}
// Curtain texture
const textureLoader = new THREE.TextureLoader();
const curtainTexture = textureLoader.load("/assets/curtain.jpg");
// Checker texture
const plane1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);  // Clips x > 9
const plane2 = new THREE.Plane(new THREE.Vector3(1, 0, 0), 10);   // Clips x < -9
const checkerTexture = textureLoader.load("/assets/checker.jpg");
checkerTexture.wrapS = THREE.RepeatWrapping; // Repeat horizontally
checkerTexture.wrapT = THREE.RepeatWrapping; // Repeat vertically
checkerTexture.repeat.set(5, 5); // Adjust the number of repeats (X, Y)
// Curtain material with texture
const curtainMaterial = new THREE.MeshBasicMaterial({
  map: curtainTexture,
  side: THREE.DoubleSide
});
const checkerMaterial = new THREE.MeshBasicMaterial({
  map: checkerTexture,
  side: THREE.DoubleSide,
  clippingPlanes: [plane1, plane2]
});
renderer.localClippingEnabled = true;
const checkerPlane = new THREE.PlaneGeometry(38, 38);
const checkerMesh = new THREE.Mesh(checkerPlane, checkerMaterial);
checkerMesh.position.set(0, -3.05, -17);
checkerMesh.rotation.x = Math.PI/2;
scene.add(checkerMesh);

// creating horizontal ones connecting the vertical
for (let i = 0; i < strips.length - 1; i++) {
  const strip1 = strips[i];
  const strip2 = strips[i + 1];

  const top1 = new THREE.Vector3(
    strip1.position.x,
    strip1.position.y + stripLength / 2,
    strip1.position.z
  );
  const top2 = new THREE.Vector3(
    strip2.position.x,
    strip2.position.y + stripLength / 2,
    strip2.position.z
  );
  const distance = top1.distanceTo(top2); // calculates the distance between the top = length of the strip

  const horizontalStrip = createStrip(distance);
  //Curtain Mesh
  const curtainPlane = new THREE.PlaneGeometry(distance, 15);
  const curtainMesh = new THREE.Mesh(curtainPlane, curtainMaterial);
  
  const midpoint = new THREE.Vector3()
    .addVectors(top1, top2)
    .multiplyScalar(0.5); // get the midpoint to position the strip
  horizontalStrip.position.set(midpoint.x, midpoint.y, midpoint.z);
  curtainMesh.position.set(midpoint.x, 4.5, midpoint.z);

  const direction = new THREE.Vector3().subVectors(top2, top1); //Rotate the strip to face from strip1 to strip2
  const angle = Math.atan2(direction.x, direction.z);
  horizontalStrip.rotation.z = -angle;
  horizontalStrip.rotation.x = Math.PI / 2; // rotate so the ends touch each other
  curtainMesh.rotation.y = Math.PI/2 + angle;

  scene.add(horizontalStrip);
  scene.add(curtainMesh);
}
const endCollisionGeom = new THREE.BoxGeometry(
  platformSize + playerWidth + 0.1,
  panelThickness,
  platformSize + playerWidth + 0.1
);
endCollisionGeom.translate(0, -panelThickness / 2, 0);
const endCollisionMat = new THREE.MeshBasicMaterial({ visible: false });
const endPlatformCollision = new THREE.Mesh(endCollisionGeom, endCollisionMat);
endPlatformCollision.position.copy(endPos);
scene.add(endPlatformCollision);

///////////////////////////////// DOLL

let isRedLight = false;
let dollRotationComplete = false;
let dollTargetRotation = Math.PI;
let lightSwitchTimer = 0;
let nextLightSwitch = Math.random() * 5 + 3;

// Load doll
const loader2 = new GLTFLoader();

let doll;
const gltfLoader = new GLTFLoader();
gltfLoader.load('assets/doll.glb', (gltf) => {
  doll = gltf.scene;
  doll.position.copy(endPos);
  doll.position.y += 2;
  doll.scale.set(10, 10, 10);
  doll.rotation.y = dollTargetRotation;

  // Optional: Add any lights to the doll if desired
  const eyeLight = new THREE.PointLight(0xff0000, 0, 3);
  eyeLight.position.set(0, 2, 0);
  doll.add(eyeLight);

  scene.add(doll);
});

let player;
let playerMixer;
let idleAction;
let jumpAction;

loader2.load("../assets/main.glb", (gltf) => {
  player = gltf.scene;
  player.scale.set(1, 1, 1);
  // Adjust player's position so the base sits at y = 0
  const box = new THREE.Box3().setFromObject(player);
  const bboxMin = box.min.y; // lowest Y value of the model
  player.position.set(0, -bboxMin, 0);
  scene.add(player);
  playerMixer = new THREE.AnimationMixer(player);
  idleAction = playerMixer.clipAction(gltf.animations[0]);
  idleAction.setLoop(THREE.LoopRepeat, Infinity);
  idleAction.play();

  // Load jump animation after player is loaded
  loader2.load("../assets/jump.glb", (gltf) => {
    const jumping = gltf.animations[0]; // get jump animation
    jumpAction = playerMixer.clipAction(jumping);
    jumpAction.setLoop(THREE.LoopOnce, 1);
    jumpAction.clampWhenFinished = true;
    console.log("Jump animation loaded");
  });

  // Listen for when the jump animation finishes
  playerMixer.addEventListener("finished", (e) => {
    if (e.action === jumpAction) {
      console.log("Jump animation finished, switching to idle");
      jumpAction.crossFadeTo(idleAction, 0.2, false);
      idleAction.reset().play();
      jumpAction.reset();
    }
  });
});

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
    const bulbMaterial = new THREE.MeshBasicMaterial({
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

// PANELS
for (let i = 1; i <= panelCount; i++) {
  const zPos = -i * 3;
  if (zPos === checkpointPos.z) {
    continue; 
  }
  const xOffset = 1.0;
  const safeOnLeft = Math.random() < 0.5;

  // LEFT PANEL
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

  // LEFT COLLISION MESH (bigger, invisible)
  const leftCollisionGeom = new THREE.BoxGeometry(
    panelWidth + 0.5,
    panelThickness,
    panelDepth + 0.5
  );
  leftCollisionGeom.translate(0, -panelThickness / 2, 0);
  const collisionMat = new THREE.MeshBasicMaterial({ visible: false });
  const leftPanelCollision = new THREE.Mesh(leftCollisionGeom, collisionMat);
  leftPanelCollision.position.copy(leftPanel.position);
  leftPanelCollision.userData.breakable = leftPanel.userData.breakable;
  leftPanelCollision.userData.index = leftPanel.userData.index;
  leftPanel.userData.collisionMesh = leftPanelCollision;
  leftPanelCollision.userData.visibleMesh = leftPanel;
  scene.add(leftPanelCollision);
  panelCollisions.push(leftPanelCollision);

  // RIGHT PANEL (visible)
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

  // RIGHT COLLISION MESH
  const rightCollisionGeom = new THREE.BoxGeometry(
    panelWidth + 0.5,
    panelThickness,
    panelDepth + 0.5
  );
  rightCollisionGeom.translate(0, -panelThickness / 2, 0);
  const rightPanelCollision = new THREE.Mesh(
    rightCollisionGeom,
    collisionMat.clone()
  );
  rightPanelCollision.position.copy(rightPanel.position);
  rightPanelCollision.userData.breakable = rightPanel.userData.breakable;
  rightPanelCollision.userData.index = rightPanel.userData.index;
  rightPanel.userData.collisionMesh = rightPanelCollision;
  rightPanelCollision.userData.visibleMesh = rightPanel;
  scene.add(rightPanelCollision);
  panelCollisions.push(rightPanelCollision);
}

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88ccee,
  metalness: 0,
  roughness: 0.1,
  transmission: 0.9,
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
        if (playerMixer && idleAction && jumpAction) {
          console.log("Switching to jump animation");
          idleAction.crossFadeTo(jumpAction, 0.2, false);
          jumpAction.reset().play();
        }
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
function breakPanel(collisionMesh) {
  const visiblePanel = collisionMesh.userData.visibleMesh;

  // figuring out which way to rotate based on player landing on which corner
  const offset = new THREE.Vector3().subVectors(
    player.position,
    visiblePanel.position
  );
  const up = new THREE.Vector3(0, 1, 0);
  const tiltAxis = new THREE.Vector3().crossVectors(up, offset).normalize();
  visiblePanel.userData.tiltAxis = tiltAxis;
  visiblePanel.userData.angularVelocity = 1.5;
  visiblePanel.userData.isFalling = true;

  // remove
  scene.remove(collisionMesh);
  const collisionIndex = panelCollisions.indexOf(collisionMesh);
  if (collisionIndex !== -1) {
    panelCollisions.splice(collisionIndex, 1);
  }

  const idx = panels.indexOf(visiblePanel);
  if (idx !== -1) panels.splice(idx, 1);
  visiblePanel.userData.broken = true;
  fallingPanels.push({ mesh: visiblePanel, velocityY: 0 });
}

function resetPlayerPosition() {
  if (checkpointUnlocked) {
    // Respawn at checkpoint
    player.position.set(
      checkpointPos.x, 
      checkpointPos.y + playerHeight / 2, 
      checkpointPos.z
    );
  } else {
    // Default to start
    player.position.set(0, playerHeight / 2, 0);
  }
  velocityY = 0;
  canJump = true;
};


// Animation loop control
const clock = new THREE.Clock();
let stopAnimation = false;

function animate() {
  /*
  spotLightHelper.update();
  spotLight2Helper.update();
  */
  if (stopAnimation) return;
  const delta = clock.getDelta();
  if (playerMixer) playerMixer.update(delta);
  requestAnimationFrame(animate);

  // movement
  const moveDistance = moveSpeed * delta;
  if (moveForward) player.position.z -= moveDistance;
  if (moveBackward) player.position.z += moveDistance;
  if (moveLeft) player.position.x -= moveDistance;
  if (moveRight) player.position.x += moveDistance;

  // connect the cam to the player (uncomment to stick camera unto player and not use orbit controls)
  
  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 5;
  camera.position.y = player.position.y + 2.5;
  camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
  
  // Gravity
  velocityY -= gravity * delta;
  player.position.y += velocityY * delta;

  // SURFACE DETECTION PHYSICS
  raycaster.set(player.position.clone(), new THREE.Vector3(0, -1, 0));
  const intersects = raycaster.intersectObjects([
    ...panelCollisions,
    startPlatformCollision,
    checkpointPlatformCollision,
    endPlatformCollision,
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
      console.log("Can jump, on surface:", surface);


      if (surface === endPlatformCollision) {
        checkpointUnlocked = false;
        checkpointPlatformVisual.material.color.set(0xff6b81)
        resetPlayerPosition();
      }

      if (surface === checkpointPlatformCollision && !checkpointUnlocked) {
        checkpointUnlocked = true;
        checkpointPlatformVisual.material.color.set(0x00ff00);
        console.log("Checkpoint unlocked!");
      }

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
        console.log(Score: ${score});
      }
    }
  }

  // PHYSICS FOR FALLING PANELS
  for (let i = 0; i < fallingPanels.length; i++) {
    const obj = fallingPanels[i];
    const fp = obj.mesh;

    const axis = fp.userData.tiltAxis;
    const vel = fp.userData.angularVelocity;

    fp.rotateOnWorldAxis(axis, vel * delta);

    obj.velocityY -= gravity * delta;
    fp.position.y += obj.velocityY * delta;

    const damp = 0.1;
    fp.userData.angularVelocity -= damp * delta;
    if (fp.userData.angularVelocity < 0) {
      fp.userData.angularVelocity = 0;
    }
    // fp.velocityY -= gravity * delta;
    // fp.mesh.position.y += fp.velocityY * delta;
    // fp.mesh.rotation.x += 0.01;
    // fp.mesh.rotation.z += 0.02;

    // kill far panels
    if (fp.position.y < -20) {
      scene.remove(fp);
      fallingPanels.splice(i, 1);
      i--;
    }
  }

  // reset on death
  if (player.position.y < -5) {
    resetPlayerPosition();
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
  if (Math.abs(0 - doll.rotation.y) < 0.25) {
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
    moving ${moving}, isRedLight ${isRedLight}, rotComplete ${dollRotationComplete}
  );

  // CHECK PLAYER MOVEMENT DURING RED LIGHT
  const playerPastStart =
    player.position.z < startPlatformVisual.position.z - 1;
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
        time not satisfied. ${currentTime}, ${lastShotTime}, ${minFireWait}
      );
    }
  }

  // UPDATE BULLETS
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].position.add(bullets[i].userData.velocity);
    if (bullets[i].position.distanceTo(player.position) < 1) {
        spawnBloodSpray(player.position);
        resetPlayerPosition();
        scene.remove(bullets[i]);
        bullets.splice(i, 1);
    } else if (bullets[i].position.y < -5 || bullets[i].position.length() > 100) {
        scene.remove(bullets[i]);
        bullets.splice(i, 1);
    }
  }


  //// BLOOD SPRAYS
  for (let i = 0; i < bloodSprays.length; i++) {
    const points = bloodSprays[i];
    const posArray = points.geometry.attributes.position.array;
    const velocities = points.userData.velocities;
    const lifetimes = points.userData.lifetimes;

    for (let p = 0; p < velocities.length; p++) {
      const i3 = p * 3;
      lifetimes[p] -= delta;

      if (lifetimes[p] <= 0) {
        posArray[i3 + 1] = -9999;
        velocities[p].set(0, 0, 0);
        continue;
      }
      velocities[p].y -= 9.8 * 0.5 * delta;
      posArray[i3 + 0] += velocities[p].x * delta;
      posArray[i3 + 1] += velocities[p].y * delta;
      posArray[i3 + 2] += velocities[p].z * delta;
    }
    points.geometry.attributes.position.needsUpdate = true;
  }


  renderer.render(scene, camera);
}

animate();

//model height = 1.744