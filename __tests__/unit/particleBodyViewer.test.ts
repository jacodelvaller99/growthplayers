import { projectChestCenter, projectJointsForView, projectPoint } from '@/lib/particleBodyViewer';

const MODEL_HEIGHT = 1.8; // debe coincidir con la constante interna del módulo.
const ASPECT = 300 / 486; // misma que body-scan-report.web.tsx.
const ZOOM = 1.05;
const PITCH = -0.05; // mismo pitch que VIEW_PRESETS.

describe('projectPoint', () => {
  it('proyecta el punto de mira (target) exactamente al centro de pantalla, sin importar yaw/pitch/zoom', () => {
    const target = { x: 0, y: MODEL_HEIGHT / 2, z: 0 };
    for (const yaw of [0, Math.PI, Math.PI / 2, -Math.PI / 2, 0.3]) {
      for (const pitch of [-0.05, 0, 0.2]) {
        const { x, y } = projectPoint(target, yaw, pitch, ZOOM, ASPECT);
        expect(x).toBeCloseTo(0.5, 5);
        expect(y).toBeCloseTo(0.5, 5);
      }
    }
  });

  it('un punto más alto (mayor Y de mundo) cae más arriba en pantalla (menor y) en la vista frontal', () => {
    const low = projectPoint({ x: 0, y: MODEL_HEIGHT * 0.2, z: 0.1 }, 0, PITCH, ZOOM, ASPECT);
    const high = projectPoint({ x: 0, y: MODEL_HEIGHT * 0.8, z: 0.1 }, 0, PITCH, ZOOM, ASPECT);
    expect(high.y).toBeLessThan(low.y);
  });

  it('un punto con x=0 de mundo cae en x=0.5 de pantalla en la vista frontal (yaw=0), sin importar la profundidad z', () => {
    for (const z of [-0.2, 0, 0.13, 0.3]) {
      const { x } = projectPoint({ x: 0, y: MODEL_HEIGHT * 0.6, z }, 0, PITCH, ZOOM, ASPECT);
      expect(x).toBeCloseTo(0.5, 5);
    }
  });
});

describe('projectJointsForView', () => {
  it('devuelve las 8 articulaciones esperadas', () => {
    const joints = projectJointsForView(0, PITCH, ZOOM, ASPECT);
    expect(joints).toHaveLength(8);
    const ids = joints.map((j) => j.id).sort();
    expect(ids).toEqual(
      ['elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'shoulderL', 'shoulderR'].sort(),
    );
  });

  it('shoulderL y shoulderR son simétricos respecto al centro en la vista frontal', () => {
    const joints = projectJointsForView(0, PITCH, ZOOM, ASPECT);
    const left = joints.find((j) => j.id === 'shoulderL')!;
    const right = joints.find((j) => j.id === 'shoulderR')!;
    expect(left.x - 0.5).toBeCloseTo(-(right.x - 0.5), 5);
    expect(left.y).toBeCloseTo(right.y, 5);
  });

  it('el orden vertical en pantalla es hombro > codo > cadera > rodilla (de arriba a abajo)', () => {
    const joints = projectJointsForView(0, PITCH, ZOOM, ASPECT);
    const y = (id: string) => joints.find((j) => j.id === id)!.y;
    expect(y('shoulderR')).toBeLessThan(y('elbowR'));
    expect(y('elbowR')).toBeLessThan(y('hipR'));
    expect(y('hipR')).toBeLessThan(y('kneeR'));
  });

  it('todas las coordenadas están dentro de un rango razonable del encuadre', () => {
    const joints = projectJointsForView(0, PITCH, ZOOM, ASPECT);
    for (const j of joints) {
      expect(j.x).toBeGreaterThan(-0.5);
      expect(j.x).toBeLessThan(1.5);
      expect(j.y).toBeGreaterThan(-0.5);
      expect(j.y).toBeLessThan(1.5);
    }
  });
});

describe('projectChestCenter', () => {
  it('cae en x=0.5 en la vista frontal (el pecho está centrado lateralmente)', () => {
    const { x } = projectChestCenter(0, PITCH, ZOOM, ASPECT);
    expect(x).toBeCloseTo(0.5, 5);
  });

  it('cae por encima del centro vertical de pantalla (CHEST_Y=0.72 > 0.5 de altura)', () => {
    const { y } = projectChestCenter(0, PITCH, ZOOM, ASPECT);
    expect(y).toBeLessThan(0.5);
  });
});
