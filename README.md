# 3D Foucault Pendulum Demo

Browser-based 3D 傅科摆演示 built with Vite, Three.js, and lil-gui.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL in a browser.

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Model

The simulation uses a constrained spherical-pendulum state with fixed-step integration. Gravity and damping evolve the bob, while a latitude-dependent Earth-rotation term rotates the horizontal velocity to demonstrate Foucault precession.

The mass control is included for education and visual scale. For an ideal pendulum, the period does not depend on mass.
