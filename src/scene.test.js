import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyTraceGeometry, tracePointsForState } from './scene.js';

describe('tracePointsForState', () => {
  it('returns no renderable trace when tracing is hidden or has fewer than two points', () => {
    const pivot = new THREE.Vector3(0, 12, 0);
    const point = new THREE.Vector3(1, -8, 0);

    expect(tracePointsForState({ params: { showTrace: false }, trace: [point, point.clone()] }, pivot)).toEqual([]);
    expect(tracePointsForState({ params: { showTrace: true }, trace: [] }, pivot)).toEqual([]);
    expect(tracePointsForState({ params: { showTrace: true }, trace: [point] }, pivot)).toEqual([]);
  });

  it('offsets renderable trace points by the scene pivot', () => {
    const pivot = new THREE.Vector3(0, 12, 0);
    const points = tracePointsForState(
      {
        params: { showTrace: true },
        trace: [new THREE.Vector3(1, -8, 0), new THREE.Vector3(2, -7, 1)],
      },
      pivot
    );

    expect(points).toHaveLength(2);
    expect(points[0].toArray()).toEqual([1, 4, 0]);
    expect(points[1].toArray()).toEqual([2, 5, 1]);
  });

  it('updates trace geometry draw range and disables frustum culling for dynamic paths', () => {
    const geometry = new THREE.BufferGeometry();
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
    const points = [new THREE.Vector3(1, 4, 0), new THREE.Vector3(2, 5, 1), new THREE.Vector3(3, 6, 1)];

    applyTraceGeometry(line, geometry, points);

    expect(line.visible).toBe(true);
    expect(line.frustumCulled).toBe(false);
    expect(geometry.attributes.position.count).toBe(3);
    expect(geometry.drawRange.count).toBe(3);
  });

  it('hides and clears trace geometry when there are fewer than two points', () => {
    const geometry = new THREE.BufferGeometry();
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());

    applyTraceGeometry(line, geometry, [new THREE.Vector3(1, 4, 0)]);

    expect(line.visible).toBe(false);
    expect(geometry.attributes.position.count).toBe(0);
    expect(geometry.drawRange.count).toBe(0);
  });
});
