import { describe, expect, it } from 'vitest';
import { createSimulation, derivedValues, normalizeParams } from './simulation.js';

describe('normalizeParams', () => {
  it('clamps unsafe values', () => {
    const params = normalizeParams({ length: -3, mass: 0, latitude: 120, damping: -1, initialAngle: 95, timeScale: 500 });
    expect(params.length).toBe(0.5);
    expect(params.mass).toBe(0.1);
    expect(params.latitude).toBe(90);
    expect(params.damping).toBe(0);
    expect(params.initialAngle).toBe(75);
    expect(params.timeScale).toBe(120);
  });
});

describe('derivedValues', () => {
  it('computes period and latitude-dependent precession', () => {
    const values = derivedValues({ ...normalizeParams(), length: 9.81, gravity: 9.81, latitude: 30 });
    expect(values.period).toBeCloseTo(2 * Math.PI, 4);
    expect(values.precessionDegPerHour).toBeCloseTo(7.5208, 3);
  });
});

describe('createSimulation', () => {
  it('keeps the bob constrained to the string length', () => {
    const sim = createSimulation({ length: 8, initialAngle: 12, damping: 0.005 });
    for (let i = 0; i < 2000; i += 1) sim.step(1 / 240);
    const state = sim.getState();
    const radius = Math.hypot(state.position.x, state.position.y, state.position.z);
    expect(radius).toBeCloseTo(8, 3);
    expect(state.trace.length).toBeLessThanOrEqual(1200);
  });

  it('does not add horizontal Coriolis precession at the equator', () => {
    const sim = createSimulation({ length: 8, initialAngle: 15, latitude: 0, damping: 0 });
    for (let i = 0; i < 2000; i += 1) sim.step(1 / 240);
    expect(sim.getState().position.z).toBeCloseTo(0, 6);
  });

  it('sets a dragged release position while preserving length and clearing velocity', () => {
    const sim = createSimulation({ length: 8, initialAngle: 10 });
    sim.step(1 / 30);
    sim.setReleasePosition({ x: 3, y: -7, z: 2 });
    const state = sim.getState();
    const radius = Math.hypot(state.position.x, state.position.y, state.position.z);

    expect(radius).toBeCloseTo(8, 6);
    expect(state.position.x).toBeGreaterThan(0);
    expect(state.position.z).toBeGreaterThan(0);
    expect(state.velocity.length()).toBe(0);
    expect(state.elapsed).toBe(0);
  });

  it('records enough trace points shortly after release for the path to be visible', () => {
    const sim = createSimulation({ length: 8, initialAngle: 18, latitude: 35, damping: 0 });
    for (let i = 0; i < 60; i += 1) sim.step(1 / 240);

    expect(sim.getState().trace.length).toBeGreaterThanOrEqual(2);
  });
});
