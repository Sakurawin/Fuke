import GUI from 'lil-gui';
import { createPendulumScene } from './scene.js';
import { createSimulation, normalizeParams } from './simulation.js';
import './style.css';

const canvas = document.querySelector('#scene');
const periodValue = document.querySelector('#period-value');
const precessionValue = document.querySelector('#precession-value');
const timeValue = document.querySelector('#time-value');

const params = normalizeParams();
const simulation = createSimulation(params);
const view = createPendulumScene(canvas);
const controls = {
  running: false,
  startPause() {
    controls.running = !controls.running;
    startPauseController.name(controls.running ? '暂停' : '开始');
  },
};

const gui = new GUI({ title: '常规参数' });
gui.add(params, 'length', 0.5, 40, 0.1).name('绳长 m').onFinishChange(reset);
gui.add(params, 'mass', 0.1, 100, 0.1).name('物重 kg');
gui.add(params, 'latitude', -90, 90, 0.1).name('纬度 deg').onFinishChange(reset);
gui.add(params, 'gravity', 1, 25, 0.01).name('重力 m/s²').onFinishChange(reset);
gui.add(params, 'damping', 0, 0.08, 0.001).name('阻尼').onFinishChange(reset);
gui.add(params, 'initialAngle', 1, 75, 0.1).name('初始角 deg').onFinishChange(reset);
gui.add(params, 'timeScale', 0.1, 120, 0.1).name('时间倍率');
gui.add(params, 'showTrace').name('显示轨迹');
const startPauseController = gui.add(controls, 'startPause').name('开始');
gui.add({ reset }, 'reset').name('重置模拟');

function reset() {
  accumulator = 0;
  controls.running = false;
  startPauseController.name('开始');
  Object.assign(params, normalizeParams(params));
  simulation.reset(params);
}

view.setDragHandlers({
  canDrag: () => !controls.running,
  onDragStart: () => {
    accumulator = 0;
  },
  onDrag: (position) => {
    simulation.setReleasePosition(position);
  },
});

let lastTime = performance.now();
let accumulator = 0;
const fixedStep = 1 / 240;

function updateInfo(state) {
  periodValue.textContent = `${state.derived.period.toFixed(2)} s`;
  precessionValue.textContent = `${state.derived.precessionDegPerHour.toFixed(3)} deg/h`;
  timeValue.textContent = `${state.elapsed.toFixed(1)} s`;
}

function frame(now) {
  const realDelta = Math.min((now - lastTime) / 1000, 0.08);
  lastTime = now;
  if (controls.running) accumulator += realDelta * params.timeScale;

  let steps = 0;
  while (accumulator >= fixedStep && steps < 600) {
    simulation.step(fixedStep);
    accumulator -= fixedStep;
    steps += 1;
  }

  const state = simulation.getState();
  view.update(state);
  view.render();
  updateInfo(state);
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
