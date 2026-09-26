/**
 * Athena's shield, as line art in a 200×200 box centred on (100, 100).
 * Plain SVG path strings, so the same drawing is used by the 3D scene (via Path2D on a canvas)
 * and by the home-page card (as <path d>).
 */

/** Helmeted profile of Athena facing right, as on classical coins: crest, Attic helmet, face, hair, neck, drapery. */
export const ATHENA_PROFILE: string[] = [
  // crest: a ridge over the helmet that falls down the back as a horsetail
  'M128 64 C124 34 90 20 62 32 C44 42 36 68 40 98 C42 116 50 132 60 142',
  'M122 68 C112 50 90 46 76 56 C62 68 58 96 64 120 C66 128 68 134 70 138',
  'M116 58 C104 42 82 38 68 46 M104 50 C90 40 74 42 62 56 M58 66 C52 84 52 104 58 124',
  // Attic helmet: bowl, brow band with a forward peak, cheek edge
  'M72 118 C66 96 70 72 88 62 C104 54 124 58 136 70 C142 78 146 84 150 90 C142 92 134 92 128 92 C116 92 104 94 96 100 C90 106 84 114 72 118 Z',
  'M86 74 C104 66 124 70 138 80',
  'M108 94 C106 102 104 110 106 118',
  // face: one straight line from forehead to nose, lips, chin, jaw
  'M128 92 C132 100 138 108 142 116 C140 118 138 119 136 119 C137 121 137 122 136 123 C134 124 134 125 135 127 C136 129 135 131 133 132 C133 136 132 139 128 142 C122 146 116 147 110 145',
  // eye and brow
  'M122 105 C125 103 128 103 131 105 C128 107 125 107 122 105 M120 100 C124 97 129 97 133 99',
  // hair from under the helmet, in waves down the neck
  'M76 118 C72 126 78 132 74 140 C70 148 78 154 84 150 C80 158 86 164 92 160',
  'M84 120 C82 128 88 134 86 142',
  // neck and drapery
  'M118 146 C118 158 120 168 124 180 M92 180 C94 168 94 158 92 150',
  'M68 190 C84 180 102 178 122 181 C136 183 146 188 154 194 M100 180 C104 186 110 190 118 192',
];

/** A Greek key (meander) running round a ring between radii r0 (inner) and r1 (outer). */
export function meanderPath(cx: number, cy: number, r0: number, r1: number, units: number): string {
  const at = (u: number, v: number) => {
    const a = (u / units) * Math.PI * 2 - Math.PI / 2;
    const r = r0 + v * (r1 - r0);
    return `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  };
  // one key per unit: up, across, down, back in, up again: the classic hooked spiral
  const key: [number, number][] = [
    [0, 0.08],
    [0, 0.92],
    [0.78, 0.92],
    [0.78, 0.3],
    [0.3, 0.3],
    [0.3, 0.62],
    [0.52, 0.62],
  ];
  let d = '';
  for (let i = 0; i < units; i++) {
    d += 'M' + key.map(([u, v]) => at(i + u, v)).join(' L');
    d += ` M${at(i, 0.08)} L${at(i + 1, 0.08)}`;
  }
  return d;
}

/** Rings of the shield (radius, relative weight), outermost first. */
export const SHIELD_RINGS: [number, number][] = [
  [96, 1],
  [92, 0.5],
  [78, 0.5],
  [74, 1],
];
