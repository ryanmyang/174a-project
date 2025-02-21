import * as THREE from 'three';


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
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Basic light stuff
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 20, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Bridge panels
const panelCount = 10;
const panelWidth = 1;
const panelDepth = 1;
const panelThickness = 0.2;
const panelGeometry = new THREE.BoxGeometry(panelWidth, panelThickness, panelDepth);
// top at y=0 is easier
panelGeometry.translate(0, -panelThickness / 2, 0);

const panels = [];

// start and end platforms
const platformSize = 3;
const platformGeom = new THREE.BoxGeometry(platformSize, panelThickness, platformSize);
platformGeom.translate(0, -panelThickness / 2, 0);
const platformMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

const startPlatform = new THREE.Mesh(platformGeom, platformMat);
startPlatform.position.set(0, 0, 0);
startPlatform.receiveShadow = true;
scene.add(startPlatform);

const endPlatform = new THREE.Mesh(platformGeom, platformMat);
endPlatform.position.set(0, 0, -(panelCount + 1) * 3);
endPlatform.receiveShadow = true;
scene.add(endPlatform);

// Make a bunch of panels
for (let i = 1; i <= panelCount; i++) {
  const zPos = -i * 3;
  const xOffset = 1.2;
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

  // init right panel
  const rightPanel = new THREE.Mesh(panelGeometry, null);
  rightPanel.position.set(xOffset, 0, zPos);
  rightPanel.castShadow = true;
  rightPanel.receiveShadow = true;
  rightPanel.userData.breakable = safeOnLeft;
  rightPanel.userData.index = i;
  scene.add(rightPanel);
  panels.push(rightPanel);
}

// GLASS MATERIAL
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
  side: THREE.DoubleSide
});
panels.forEach(panel => {
  panel.material = glassMaterial;
});

// Make the player
const playerHeight = 1;
const playerGeom = new THREE.BoxGeometry(0.5, playerHeight, 0.5);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff5555 });
const player = new THREE.Mesh(playerGeom, playerMat);
player.position.set(0, playerHeight / 2, 0);
player.castShadow = true;
scene.add(player);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = true;
const moveSpeed = 5;
const gravity = 9.8;
let velocityY = 0;

// Controls
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      // jump - add vel
      if (canJump) {
        velocityY = 5;
        console.log('Jump!');
        canJump = false;
      }
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
});




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
  if (moveForward)  player.position.z -= moveDistance;
  if (moveBackward) player.position.z += moveDistance;
  if (moveLeft)     player.position.x -= moveDistance;
  if (moveRight)    player.position.x += moveDistance;

  // connect the cam to the player
  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 5;
  camera.position.y = player.position.y + 3;
  camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);

  // Gravity
  velocityY -= gravity * delta;
  player.position.y += velocityY * delta;


  // SURFACE DETECTION PHYSICS
  raycaster.set(player.position.clone(), new THREE.Vector3(0, -1, 0));
  const intersects = raycaster.intersectObjects([...panels, startPlatform, endPlatform]);
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

  renderer.render(scene, camera);
}


animate();