export const LEVELS = [
  {
    id: 1,
    name: "First Light",
    subtitle: "Basic Beam Reflection",
    width: 5,
    height: 5,
    par: 2,
    hintTitle: "Tutorial",
    hintText: "Tap a mirror to rotate it 90°. Drag mirrors between tiles to reflect the laser into the energy core.",
    pieces: [
      { id: 'e1', type: 'emitter', x: 0, z: 2, orientation: 0, color: 'cyan', movable: false, rotatable: false },
      { id: 't1', type: 'target', x: 4, z: 4, orientation: 0, color: 'cyan', movable: false, rotatable: false },
      { id: 'm1', type: 'mirror', x: 2, z: 2, orientation: 1, movable: true, rotatable: true },
      { id: 'm2', type: 'mirror', x: 2, z: 4, orientation: 2, movable: true, rotatable: true }
    ]
  },
  {
    id: 2,
    name: "Chromatic Fusion",
    subtitle: "Additive Color Synthesis",
    width: 6,
    height: 6,
    par: 3,
    hintTitle: "Color Fusion",
    hintText: "Combine Red and Blue beams at the same target cell to synthesize a Magenta energy charge!",
    pieces: [
      { id: 'e1', type: 'emitter', x: 0, z: 1, orientation: 0, color: 'red', movable: false, rotatable: false },
      { id: 'e2', type: 'emitter', x: 0, z: 5, orientation: 0, color: 'blue', movable: false, rotatable: false },
      { id: 't1', type: 'target', x: 5, z: 3, orientation: 2, color: 'magenta', movable: false, rotatable: false },
      { id: 'm1', type: 'mirror', x: 2, z: 1, orientation: 0, movable: true, rotatable: true },
      { id: 'm2', type: 'mirror', x: 2, z: 5, orientation: 1, movable: true, rotatable: true },
      { id: 'm3', type: 'mirror', x: 2, z: 3, orientation: 0, movable: true, rotatable: true }
    ]
  },
  {
    id: 3,
    name: "Prismatic Dispersion",
    subtitle: "Beam Refraction & Splitting",
    width: 6,
    height: 6,
    par: 3,
    hintTitle: "Prism Mechanics",
    hintText: "Prisms split incoming White light into Cyan (straight) and Red (90° side) component beams.",
    pieces: [
      { id: 'e1', type: 'emitter', x: 0, z: 2, orientation: 0, color: 'white', movable: false, rotatable: false },
      { id: 'p1', type: 'prism', x: 2, z: 2, orientation: 0, movable: true, rotatable: true },
      { id: 't1', type: 'target', x: 2, z: 5, orientation: 3, color: 'red', movable: false, rotatable: false },
      { id: 't2', type: 'target', x: 5, z: 2, orientation: 2, color: 'cyan', movable: false, rotatable: false },
      { id: 'm1', type: 'mirror', x: 4, z: 4, orientation: 0, movable: true, rotatable: true }
    ]
  },
  {
    id: 4,
    name: "Spectral Filter",
    subtitle: "Wavelength Filtering",
    width: 6,
    height: 6,
    par: 4,
    hintTitle: "Color Filtering",
    hintText: "Pass beams through color filters to extract specific light frequencies for target cores.",
    pieces: [
      { id: 'e1', type: 'emitter', x: 0, z: 0, orientation: 0, color: 'white', movable: false, rotatable: false },
      { id: 's1', type: 'splitter', x: 3, z: 0, orientation: 0, movable: true, rotatable: true },
      { id: 'f1', type: 'filter', x: 3, z: 2, orientation: 0, color: 'red', movable: true, rotatable: true },
      { id: 'f2', type: 'filter', x: 5, z: 0, orientation: 0, color: 'green', movable: true, rotatable: true },
      { id: 't1', type: 'target', x: 3, z: 5, orientation: 3, color: 'red', movable: false, rotatable: false },
      { id: 't2', type: 'target', x: 5, z: 4, orientation: 3, color: 'green', movable: false, rotatable: false }
    ]
  },
  {
    id: 5,
    name: "Echoes of Convergence",
    subtitle: "Master Prism Network",
    width: 7,
    height: 7,
    par: 5,
    hintTitle: "Master Sector",
    hintText: "Synthesize Yellow, Cyan, and White light across a complex network of prisms, mirrors, and filters.",
    pieces: [
      { id: 'e1', type: 'emitter', x: 0, z: 3, orientation: 0, color: 'white', movable: false, rotatable: false },
      { id: 'e2', type: 'emitter', x: 3, z: 0, orientation: 1, color: 'blue', movable: false, rotatable: false },
      { id: 'p1', type: 'prism', x: 2, z: 3, orientation: 0, movable: true, rotatable: true },
      { id: 'f1', type: 'filter', x: 2, z: 5, orientation: 0, color: 'red', movable: true, rotatable: true },
      { id: 'm1', type: 'mirror', x: 4, z: 3, orientation: 0, movable: true, rotatable: true },
      { id: 'm2', type: 'mirror', x: 6, z: 5, orientation: 1, movable: true, rotatable: true },
      { id: 't1', type: 'target', x: 6, z: 3, orientation: 2, color: 'yellow', movable: false, rotatable: false },
      { id: 't2', type: 'target', x: 2, z: 6, orientation: 3, color: 'cyan', movable: false, rotatable: false },
      { id: 't3', type: 'target', x: 3, z: 6, orientation: 3, color: 'white', movable: false, rotatable: false }
    ]
  }
];
