import * as THREE from 'three';

const EARTH_ROTATION_RAD_PER_SECOND = 7.2921159e-5;
const TRACE_MIN_DISTANCE_SQUARED = 0.0004;
const DEFAULTS = {
  length: 9,
  mass: 4,
  latitude: 35,
  gravity: 9.81,
  damping: 0.004,
  initialAngle: 18,
  timeScale: 35,
  showTrace: true,
};

const LIMITS = {
  length: [0.5, 40],
  mass: [0.1, 100],
  latitude: [-90, 90],
  gravity: [1, 25],
  damping: [0, 0.08],
  initialAngle: [1, 75],
  timeScale: [0.1, 120],
};

function clamp(value, min, max) {
  const number = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
}

export function normalizeParams(overrides = {}) {
  const input = { ...DEFAULTS, ...overrides };
  return {
    length: clamp(input.length, ...LIMITS.length),
    mass: clamp(input.mass, ...LIMITS.mass),
    latitude: clamp(input.latitude, ...LIMITS.latitude),
    gravity: clamp(input.gravity, ...LIMITS.gravity),
    damping: clamp(input.damping, ...LIMITS.damping),
    initialAngle: clamp(input.initialAngle, ...LIMITS.initialAngle),
    timeScale: clamp(input.timeScale, ...LIMITS.timeScale),
    showTrace: Boolean(input.showTrace),
  };
}

export function derivedValues(params = {}) {
  const safe = normalizeParams(params);
  const period = 2 * Math.PI * Math.sqrt(safe.length / safe.gravity);
  const latitudeRad = THREE.MathUtils.degToRad(safe.latitude);
  const precessionRadPerSecond = EARTH_ROTATION_RAD_PER_SECOND * Math.sin(latitudeRad);
  const precessionDegPerHour = THREE.MathUtils.radToDeg(precessionRadPerSecond) * 3600;
  return { period, precessionRadPerSecond, precessionDegPerHour };
}

export function createSimulation(initialParams = {}) {
  let params = normalizeParams(initialParams);
  const position = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const acceleration = new THREE.Vector3();
  const gravityVector = new THREE.Vector3();
  const earthRotation = new THREE.Vector3();
  const coriolis = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const tangentialGravity = new THREE.Vector3();
  const trace = [];
  let elapsed = 0;

  function reset(nextParams = params) {
    params = normalizeParams(nextParams);
    const angle = THREE.MathUtils.degToRad(params.initialAngle);
    position.set(Math.sin(angle) * params.length, -Math.cos(angle) * params.length, 0);
    velocity.set(0, 0, 0);
    trace.length = 0;
    elapsed = 0;
  }

  function setReleasePosition(nextPosition) {
    const candidate = new THREE.Vector3(nextPosition.x, nextPosition.y, nextPosition.z);
    if (candidate.lengthSq() === 0) return;

    position.copy(candidate).setLength(params.length);
    velocity.set(0, 0, 0);
    trace.length = 0;
    elapsed = 0;
  }

  function step(dt) {
    const safeDt = Math.max(0, Math.min(dt, 1 / 30));
    const latitudeRad = THREE.MathUtils.degToRad(params.latitude);
    gravityVector.set(0, -params.gravity, 0);
    earthRotation.set(0, EARTH_ROTATION_RAD_PER_SECOND * Math.sin(latitudeRad), EARTH_ROTATION_RAD_PER_SECOND * Math.cos(latitudeRad));
    radial.copy(position).normalize();

    tangentialGravity.copy(radial).multiplyScalar(gravityVector.dot(radial));
    tangentialGravity.subVectors(gravityVector, tangentialGravity);
    coriolis.crossVectors(earthRotation, velocity).multiplyScalar(-2);
    acceleration.copy(tangentialGravity).add(coriolis).addScaledVector(velocity, -params.damping);
    velocity.addScaledVector(acceleration, safeDt);

    position.addScaledVector(velocity, safeDt);
    position.setLength(params.length);

    radial.copy(position).normalize();
    velocity.addScaledVector(radial, -velocity.dot(radial));

    elapsed += safeDt;
    if (trace.length === 0 || trace[trace.length - 1].distanceToSquared(position) > TRACE_MIN_DISTANCE_SQUARED) {
      trace.push(position.clone());
      if (trace.length > 1200) trace.shift();
    }
  }

  function getState() {
    return {
      params: { ...params },
      position: position.clone(),
      velocity: velocity.clone(),
      trace: trace.map((point) => point.clone()),
      elapsed,
      derived: derivedValues(params),
    };
  }

  reset(params);
  return { reset, setReleasePosition, step, getState };
}
