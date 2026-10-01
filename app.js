import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const host = document.getElementById('viewer');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error');
const resetBtn = document.getElementById('resetView');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f9fb);

const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000);
camera.position.set(5, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.screenSpacePanning = true;
controls.minDistance = 0.1;
controls.maxDistance = 500;

scene.add(new THREE.HemisphereLight(0xffffff, 0x59636f, 2.2));

const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(5, 8, 10);
key.castShadow = true;
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 1.4);
fill.position.set(-8, 2, -4);
scene.add(fill);

let model = null;
let initialView = null;

function resize() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function fitCameraToObject(object, offset = 1.5) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * offset;
  if (!Number.isFinite(cameraZ) || cameraZ === 0) cameraZ = 5;

  camera.position.set(center.x + cameraZ * 0.55, center.y + cameraZ * 0.38, center.z + cameraZ);
  camera.near = Math.max(cameraZ / 1000, 0.001);
  camera.far = cameraZ * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();

  initialView = {
    position: camera.position.clone(),
    target: controls.target.clone(),
    near: camera.near,
    far: camera.far
  };
}

function resetView() {
  if (!initialView) return;
  camera.position.copy(initialView.position);
  camera.near = initialView.near;
  camera.far = initialView.far;
  camera.updateProjectionMatrix();
  controls.target.copy(initialView.target);
  controls.update();
}

resetBtn.addEventListener('click', resetView);
window.addEventListener('resize', resize);
resize();

const mtlLoader = new MTLLoader();
mtlLoader.setPath('models/');
mtlLoader.load(
  'cylinder-net.mtl',
  (materials) => {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('models/');
    objLoader.load(
      'cylinder-net.obj',
      (object) => {
        model = object;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.needsUpdate = true;
            }
          }
        });

        scene.add(model);
        fitCameraToObject(model);
        loading.hidden = true;
      },
      undefined,
      (err) => showError('לא הצלחתי לטעון את קובץ ה-OBJ.', err)
    );
  },
  undefined,
  (err) => showError('לא הצלחתי לטעון את קובץ ה-MTL.', err)
);

function showError(message, err) {
  console.error(err);
  loading.hidden = true;
  errorBox.hidden = false;
  errorBox.textContent = `${message} ודא שהקבצים נמצאים בתיקיית models ושהאתר נפתח דרך שרת או GitHub Pages.`;
}

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
