import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function tracePointsForState(state, pivot) {
  if (!state.params.showTrace || state.trace.length < 2) return [];
  return state.trace.map((point) => point.clone().add(pivot));
}

export function applyTraceGeometry(traceLine, traceGeometry, tracePoints) {
  traceLine.visible = tracePoints.length >= 2;
  traceLine.frustumCulled = false;
  traceGeometry.setFromPoints(traceLine.visible ? tracePoints : []);
  traceGeometry.setDrawRange(0, traceLine.visible ? tracePoints.length : 0);
  traceGeometry.computeBoundingSphere();
}

export function createPendulumScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071019);
  scene.fog = new THREE.Fog(0x071019, 30, 90);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(16, 10, 20);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, -2, 0);

  scene.add(new THREE.HemisphereLight(0x9fcfff, 0x1b2430, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(12, 18, 10);
  key.castShadow = true;
  scene.add(key);

  const floorY = -12;
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.08, 128),
    new THREE.MeshStandardMaterial({ color: 0x162638, roughness: 0.82, metalness: 0.05 })
  );
  floor.position.y = floorY;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(24, 24, 0x42627f, 0x23384d);
  grid.position.y = floorY + 0.06;
  scene.add(grid);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4fa3d8 }));
  ring.position.y = floorY + 0.08;
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x8aa8c4, roughness: 0.4, metalness: 0.55 });
  const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 24, 24);
  const leftPole = new THREE.Mesh(poleGeometry, supportMaterial);
  leftPole.position.set(-7, 0, 0);
  const rightPole = new THREE.Mesh(poleGeometry, supportMaterial);
  rightPole.position.set(7, 0, 0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.18, 0.18), supportMaterial);
  beam.position.y = 12;
  scene.add(leftPole, rightPole, beam);

  const pivot = new THREE.Vector3(0, 12, 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const dragPoint = new THREE.Vector3();
  const dragLocal = new THREE.Vector3();
  let dragging = false;
  let dragHandlers = {};
  let lastState = null;
  const pivotMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xcdefff, roughness: 0.25, metalness: 0.4 })
  );
  pivotMarker.position.copy(pivot);
  scene.add(pivotMarker);

  const stringPositions = new Float32Array(6);
  const stringGeometry = new THREE.BufferGeometry();
  stringGeometry.setAttribute('position', new THREE.BufferAttribute(stringPositions, 3));
  const stringLine = new THREE.Line(stringGeometry, new THREE.LineBasicMaterial({ color: 0xd6efff }));
  scene.add(stringLine);

  const bob = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0xffb454, roughness: 0.34, metalness: 0.35 })
  );
  bob.castShadow = true;
  scene.add(bob);

  const traceGeometry = new THREE.BufferGeometry();
  const traceLine = new THREE.Line(
    traceGeometry,
    new THREE.LineBasicMaterial({ color: 0x78e6ff, transparent: true, opacity: 0.9 })
  );
  traceLine.frustumCulled = false;
  scene.add(traceLine);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function update(state) {
    lastState = state;
    const bobPosition = state.position.clone().add(pivot);
    bob.position.copy(bobPosition);
    bob.scale.setScalar(0.34 + Math.cbrt(state.params.mass) * 0.14);

    stringPositions.set([pivot.x, pivot.y, pivot.z, bobPosition.x, bobPosition.y, bobPosition.z]);
    stringGeometry.attributes.position.needsUpdate = true;

    const tracePoints = tracePointsForState(state, pivot);
    applyTraceGeometry(traceLine, traceGeometry, tracePoints);
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function dragToPointer(event) {
    if (!lastState) return;
    updatePointer(event);
    dragPlane.constant = -bob.position.y;
    if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;

    dragLocal.copy(dragPoint).sub(pivot);
    if (dragLocal.y > -0.05) dragLocal.y = -0.05;
    dragHandlers.onDrag?.(dragLocal);
  }

  function onPointerDown(event) {
    if (!dragHandlers.canDrag?.() || !lastState) return;
    updatePointer(event);
    const [hit] = raycaster.intersectObject(bob, false);
    if (!hit) return;

    dragging = true;
    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
    dragHandlers.onDragStart?.();
    dragToPointer(event);
  }

  function onPointerMove(event) {
    renderer.domElement.style.cursor = dragHandlers.canDrag?.() ? 'grab' : '';
    if (!dragging) return;
    renderer.domElement.style.cursor = 'grabbing';
    dragToPointer(event);
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    controls.enabled = true;
    renderer.domElement.releasePointerCapture(event.pointerId);
    renderer.domElement.style.cursor = dragHandlers.canDrag?.() ? 'grab' : '';
    dragHandlers.onDragEnd?.();
  }

  function setDragHandlers(handlers) {
    dragHandlers = handlers;
  }

  resize();
  window.addEventListener('resize', resize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  return { update, render, resize, setDragHandlers };
}
