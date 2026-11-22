import * as THREE from 'three';
import { GameStateData, SelectionTarget, StarSystem } from '../types/game';
import { STAR_CLASSES } from '../data/starClasses';
import { PLANET_CLASSES } from '../data/planetClasses';
import { MEGASTRUCTURES } from '../data/megastructures';
import { getGlowTexture, getPlanetTexture, getRingTexture } from './proceduralTextures';
import { PRNG } from '../engine/prng';

const SPEED_DAYS_PER_SEC: Record<1 | 2 | 3 | 4, number> = {
  1: 1000 / 750,
  2: 1000 / 350,
  3: 1000 / 150,
  4: 1000 / 60,
};

export interface SystemSceneHandle {
  scene: THREE.Scene;
  systemId: string;
  planetHitMeshes: THREE.Mesh[];
  planetPositions: Map<string, THREE.Vector3>;
  starbasePosition: THREE.Vector3;
  update: (
    state: GameStateData,
    selection: SelectionTarget,
    elapsedSec: number,
    dt: number
  ) => void;
  dispose: () => void;
}

/**
 * Remaps RingGeometry UVs radially (u = 0 at innerRadius, u = 1 at outerRadius)
 * so 1D ring textures render as authentic concentric rings.
 */
function createRadialRingGeometry(
  innerRadius: number,
  outerRadius: number,
  segments = 64
): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  const span = Math.max(0.0001, outerRadius - innerRadius);

  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const radius = v3.length();
    const u = THREE.MathUtils.clamp((radius - innerRadius) / span, 0, 1);
    const angle = Math.atan2(v3.y, v3.x);
    uv.setXY(i, u, (angle + Math.PI) / (Math.PI * 2));
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Builds a sleek multi-part sci-fi 3D orbital station (Mining or Research)
 * instead of a plain placeholder cube.
 */
function createOrbitalStationModel(isResearch: boolean): THREE.Group {
  const group = new THREE.Group();
  const accentColor = isResearch ? '#38bdf8' : '#f59e0b';
  const emissiveColor = isResearch ? '#0284c7' : '#d97706';

  const hullMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.78,
    roughness: 0.28,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.75,
    metalness: 0.5,
    roughness: 0.25,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: isResearch ? '#0ea5e9' : '#334155',
    emissive: isResearch ? '#0369a1' : '#1e293b',
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.2,
  });

  // Central cylindrical core spire
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.75, 8), hullMat);
  group.add(core);

  // Glowing command dome / reactor core
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), accentMat);
  dome.position.y = 0.32;
  group.add(dome);

  if (isResearch) {
    // Research station: sleek sensor ring + dual telemetry dishes
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24), hullMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const dishMat = accentMat;
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), hullMat);
      arm.position.set(side * 0.28, 0, 0);
      group.add(arm);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.18), solarMat);
      panel.position.set(side * 0.58, 0, 0);
      group.add(panel);
    }

    const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), dishMat);
    beacon.position.y = -0.45;
    beacon.rotation.x = Math.PI;
    group.add(beacon);
  } else {
    // Mining station: industrial truss arms + extraction laser pod + solar wings
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 6), accentMat);
    group.add(collar);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.16), solarMat);
      wing.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      wing.rotation.y = -a;
      group.add(wing);
    }

    const drill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 6), hullMat);
    drill.position.y = -0.5;
    drill.rotation.x = Math.PI;
    group.add(drill);
  }

  // Subtle glow sprite
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(accentColor),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.setScalar(1.25);
  group.add(glow);

  return group;
}

/**
 * Builds an illuminated multi-part sci-fi 3D Starbase / Starport citadel.
 */
function createStarbaseModel(): THREE.Group {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    emissive: '#1e293b',
    emissiveIntensity: 0.45,
    metalness: 0.6,
    roughness: 0.35,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0ea5e9',
    emissiveIntensity: 0.9,
    metalness: 0.4,
    roughness: 0.2,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    emissive: '#d97706',
    emissiveIntensity: 0.65,
    metalness: 0.5,
    roughness: 0.3,
  });

  // Central command spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 2.2, 8), hullMat);
  group.add(spire);

  // Upper & lower reactor domes
  const topDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), coreMat);
  topDome.position.y = 1.05;
  group.add(topDome);

  const midCore = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.32, 8), coreMat);
  group.add(midCore);

  // Illuminated structural docking ring
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.11, 10, 36), hullMat);
  outerRing.rotation.x = Math.PI / 2;
  group.add(outerRing);

  // 4 radial shipyard docking piers with beacon lights
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 0.22), hullMat);
    arm.position.set(Math.cos(angle) * 0.95, 0, Math.sin(angle) * 0.95);
    arm.rotation.y = -angle;
    group.add(arm);

    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.36), goldMat);
    pod.position.set(Math.cos(angle) * 1.72, 0, Math.sin(angle) * 1.72);
    group.add(pod);
  }

  // Soft reactor glow halo
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture('#38bdf8'),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.setScalar(4.2);
  group.add(glow);

  return group;
}

export function createSystemScene(sys: StarSystem): SystemSceneHandle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040711');

  const rng = new PRNG(sys.name.length * 997 + Math.round(sys.x * 13));
  const starDef = STAR_CLASSES[sys.starClass];

  // Lighting: strong point light from central star + soft ambient
  const ambient = new THREE.AmbientLight('#64748b', 0.95);
  scene.add(ambient);

  const starLight = new THREE.PointLight(
    sys.starClass === 'black_hole' ? '#a855f7' : starDef.color,
    3.8,
    260,
    0.65
  );
  starLight.position.set(0, 0, 0);
  scene.add(starLight);

  // 1. Background starfield
  const bgCount = 1500;
  const bgPos = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    const r = rng.range(180, 420);
    const theta = rng.range(0, Math.PI * 2);
    const phi = Math.acos(rng.range(-1, 1));
    bgPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    bgPos[i * 3 + 1] = r * Math.cos(phi);
    bgPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
  const bgMat = new THREE.PointsMaterial({
    color: '#cbd5e1',
    size: 1.1,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  scene.add(new THREE.Points(bgGeo, bgMat));

  // 2. Central Star
  const starGeo = new THREE.SphereGeometry(starDef.radius * 1.15, 32, 32);
  const starMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(starDef.color),
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  scene.add(starMesh);

  const coronaSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(starDef.glowColor),
      color: new THREE.Color(sys.starClass === 'black_hole' ? '#c084fc' : starDef.color),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  coronaSprite.scale.setScalar(starDef.radius * 6.5);
  scene.add(coronaSprite);

  // Black hole accretion ring with radial UVs
  if (sys.starClass === 'black_hole') {
    const accGeo = createRadialRingGeometry(starDef.radius * 1.45, starDef.radius * 3.1, 64);
    accGeo.rotateX(-Math.PI / 2.4);
    const accMat = new THREE.MeshBasicMaterial({
      map: getRingTexture('#c084fc'),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(accGeo, accMat));
  }

  // 3. Starbase (shown when system is owned)
  const starbaseGroup = createStarbaseModel();
  starbaseGroup.position.set(starDef.radius * 2.1 + 3.2, 0.6, 0);
  starbaseGroup.visible = sys.ownerId !== null;
  scene.add(starbaseGroup);

  // 3b. 3D Megastructure Gyroscopic Rings around the Central Star
  const megaGroup = new THREE.Group();
  const megaRingMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    emissive: '#d97706',
    emissiveIntensity: 0.75,
    metalness: 0.7,
    roughness: 0.25,
    transparent: true,
    opacity: 0.9,
  });
  const megaRadius = starDef.radius * 1.65;
  const mRing1 = new THREE.Mesh(new THREE.TorusGeometry(megaRadius, 0.16, 10, 48), megaRingMat);
  const mRing2 = new THREE.Mesh(new THREE.TorusGeometry(megaRadius * 1.08, 0.14, 10, 48), megaRingMat);
  const mRing3 = new THREE.Mesh(new THREE.TorusGeometry(megaRadius * 1.16, 0.12, 10, 48), megaRingMat);
  mRing1.rotation.x = Math.PI / 3;
  mRing2.rotation.y = Math.PI / 3;
  mRing3.rotation.z = Math.PI / 4;
  megaGroup.add(mRing1, mRing2, mRing3);
  megaGroup.visible = Boolean(sys.megastructure);
  scene.add(megaGroup);

  // 3c. 3D Rotating Cross-Galaxy Stargate Ring (shown when sys.hasGateway === true)
  const gatewayGroup = new THREE.Group();
  gatewayGroup.position.set(36, 1.5, -24);
  const gwOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.32, 12, 48),
    new THREE.MeshStandardMaterial({
      color: '#64748b',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.2,
    })
  );
  const gwInnerGlow = new THREE.Mesh(
    new THREE.TorusGeometry(3.65, 0.14, 10, 48),
    new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.92,
    })
  );
  const gwPortalDisc = new THREE.Mesh(
    new THREE.CircleGeometry(3.55, 40),
    new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  gatewayGroup.add(gwOuterRing, gwInnerGlow, gwPortalDisc);
  gatewayGroup.visible = Boolean(sys.hasGateway);
  scene.add(gatewayGroup);

  // 4. Planets, Orbits & Detailed Orbital Stations
  const planetHitMeshes: THREE.Mesh[] = [];
  const planetGroups = new Map<string, THREE.Group>();
  const planetMeshes = new Map<string, THREE.Mesh>();
  const planetStationGroups = new Map<string, THREE.Group>();
  const planetPositions = new Map<string, THREE.Vector3>();
  const visualOrbitAngles = new Map<string, number>();

  for (const planet of sys.planets) {
    const pDef = PLANET_CLASSES[planet.planetClass];
    visualOrbitAngles.set(planet.id, planet.orbitAngle);

    // Orbit ring
    const orbitPts: THREE.Vector3[] = [];
    const segs = 112;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      orbitPts.push(
        new THREE.Vector3(Math.cos(a) * planet.orbitRadius, 0, Math.sin(a) * planet.orbitRadius)
      );
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: pDef.habitable ? '#22c55e' : '#334155',
      transparent: true,
      opacity: pDef.habitable ? 0.44 : 0.3,
    });
    scene.add(new THREE.Line(orbitGeo, orbitMat));

    const pGroup = new THREE.Group();
    const px = Math.cos(planet.orbitAngle) * planet.orbitRadius;
    const pz = Math.sin(planet.orbitAngle) * planet.orbitRadius;
    pGroup.position.set(px, 0, pz);
    planetPositions.set(planet.id, new THREE.Vector3(px, 0, pz));

    // Planet sphere
    const pGeo = new THREE.SphereGeometry(planet.visualRadius, 32, 32);
    const pTex = getPlanetTexture(planet.planetClass, planet.textureSeed);
    const pMat = new THREE.MeshStandardMaterial({
      map: pTex,
      roughness: planet.planetClass === 'ocean' ? 0.35 : 0.78,
      metalness: 0.08,
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.userData = { planetId: planet.id, systemId: sys.id };
    pGroup.add(pMesh);
    planetMeshes.set(planet.id, pMesh);
    planetHitMeshes.push(pMesh);

    // Atmosphere halo for habitable/atmospheric planets
    if (pDef.atmosphereColor) {
      const atmoGeo = new THREE.SphereGeometry(planet.visualRadius * 1.07, 24, 24);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pDef.atmosphereColor),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      pGroup.add(new THREE.Mesh(atmoGeo, atmoMat));
    }

    // Concentric Planetary Rings for Gas Giants
    if (planet.hasRings) {
      const ringGeo = createRadialRingGeometry(
        planet.visualRadius * 1.38,
        planet.visualRadius * 2.25,
        64
      );
      ringGeo.rotateX(-Math.PI / 2.35);
      const ringMat = new THREE.MeshBasicMaterial({
        map: getRingTexture(planet.ringColor),
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      pGroup.add(new THREE.Mesh(ringGeo, ringMat));
    }

    // Detailed 3D Sci-Fi Orbital Station (orbits smoothly around the planet)
    const isResearch = planet.deposit?.type === 'research';
    const stModel = createOrbitalStationModel(isResearch);
    stModel.position.set(planet.visualRadius + 1.35, 0.55, 0);
    stModel.visible = planet.stationType !== 'none';
    pGroup.add(stModel);
    planetStationGroups.set(planet.id, stModel);

    scene.add(pGroup);
    planetGroups.set(planet.id, pGroup);
  }

  // Selection ring around selected planet
  const selRingGeo = new THREE.RingGeometry(1.3, 1.48, 40);
  selRingGeo.rotateX(-Math.PI / 2);
  const selRing = new THREE.Mesh(
    selRingGeo,
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  selRing.visible = false;
  scene.add(selRing);

  // 5. Fleets & Real-time 3D Combat Laser/Projectile VFX inside this system
  const fleetMeshes = new Map<string, THREE.Group>();
  const combatBeamGroup = new THREE.Group();
  scene.add(combatBeamGroup);

  interface BeamVisual {
    line: THREE.Line;
    impactSprite: THREE.Sprite;
  }
  const beamPool: BeamVisual[] = [];
  for (let i = 0; i < 16; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    combatBeamGroup.add(line);

    const impactSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture('#fde047'),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    impactSprite.scale.setScalar(2.2);
    impactSprite.visible = false;
    combatBeamGroup.add(impactSprite);

    beamPool.push({ line, impactSprite });
  }

  function createShipModel(
    shipType: string,
    isHostile?: boolean,
    flagshipHull?: string
  ): THREE.Group {
    const g = new THREE.Group();
    const color = isHostile
      ? '#f43f5e'
      : shipType === 'science'
      ? '#38bdf8'
      : shipType === 'construction'
      ? '#fbbf24'
      : '#34d399';
    const hullMat = new THREE.MeshStandardMaterial({
      color: isHostile ? '#9f1239' : '#334155',
      emissive: isHostile ? '#4c0519' : '#0f172a',
      emissiveIntensity: 0.4,
      metalness: 0.72,
      roughness: 0.28,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      metalness: 0.55,
      roughness: 0.25,
    });

    if (shipType === 'corvette' && flagshipHull === 'titan') {
      // Colossal Titan Flagship with armored hull, dorsal citadel, twin nacelles & halo ring
      const spine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 4.4), hullMat);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 1.4), accentMat);
      bridge.position.set(0, 0.45, -0.4);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 8, 24), accentMat);
      ring.position.set(0, 0, 0.3);
      g.add(spine, bridge, ring);
    } else if (shipType === 'corvette' && flagshipHull === 'battleship') {
      // Twin-nacelle Dreadnought Battleship
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 3.4), hullMat);
      const leftPod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 2.5), hullMat);
      leftPod.position.set(-0.85, 0, -0.2);
      const rightPod = leftPod.clone();
      rightPod.position.x = 0.85;
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.1, 4), accentMat);
      bow.rotation.x = Math.PI / 2;
      bow.position.z = 2.1;
      g.add(core, leftPod, rightPod, bow);
    } else if (shipType === 'corvette' && flagshipHull === 'cruiser') {
      // Heavy Cruiser with dorsal bridge & swept wings
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 2.8), hullMat);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.85), accentMat);
      wing.position.set(0, 0, -0.3);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.8), accentMat);
      bridge.position.set(0, 0.32, -0.4);
      g.add(core, wing, bridge);
    } else if (shipType === 'corvette' && flagshipHull === 'destroyer') {
      // Twin-wing Gunship Destroyer
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.6, 4), accentMat);
      body.rotation.x = Math.PI / 2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.7), hullMat);
      wing.position.set(0, 0, -0.35);
      g.add(body, wing);
    } else {
      // Corvette / Science / Construction sleek wedge
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.58, 2.1, 4), accentMat);
      body.rotation.x = Math.PI / 2;
      g.add(body);
      if (shipType === 'corvette') {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.5), hullMat);
        wing.position.set(0, 0, -0.35);
        g.add(wing);
      }
    }

    const engine = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(color),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    engine.scale.setScalar(1.8);
    engine.position.set(0, 0, -1.25);
    g.add(engine);
    return g;
  }

  // 3D Explosion Burst Pool for active battles
  const explosionSprites: THREE.Sprite[] = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture('#f97316', '#dc2626'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    sp.visible = false;
    combatBeamGroup.add(sp);
    explosionSprites.push(sp);
  }

  function update(
    curState: GameStateData,
    selection: SelectionTarget,
    elapsedSec: number,
    dt: number
  ) {
    const curSys = curState.systems[sys.id];
    if (!curSys) return;

    // Pulse star corona
    coronaSprite.scale.setScalar(starDef.radius * (6.4 + Math.sin(elapsedSec * 2.2) * 0.25));

    // Starbase gentle spin
    starbaseGroup.visible = curSys.ownerId !== null;
    starbaseGroup.rotation.y = elapsedSec * 0.45;

    // 3D Megastructure animation
    if (curSys.megastructure) {
      const mDef = MEGASTRUCTURES[curSys.megastructure.type];
      megaGroup.visible = true;
      megaRingMat.color.set(mDef.color);
      megaRingMat.emissive.set(mDef.color);
      megaRingMat.opacity = curSys.megastructure.stage === 'completed' ? 0.92 : 0.42;
      mRing1.rotation.z = elapsedSec * 0.35;
      mRing2.rotation.x = elapsedSec * 0.28;
      mRing3.rotation.y = -elapsedSec * 0.32;
    } else {
      megaGroup.visible = false;
    }

    // 3D Stargate Ring animation
    gatewayGroup.visible = Boolean(curSys.hasGateway);
    if (gatewayGroup.visible) {
      gatewayGroup.rotation.y = elapsedSec * 0.3;
      gwOuterRing.rotation.z = elapsedSec * 0.45;
      gwInnerGlow.rotation.z = -elapsedSec * 0.7;
      const pulse = 1 + Math.sin(elapsedSec * 3.0) * 0.04;
      gwPortalDisc.scale.setScalar(pulse);
    }

    const daysPerSec = curState.paused ? 0 : SPEED_DAYS_PER_SEC[curState.speed];

    // Smooth 60 FPS continuous planetary orbit & station orbit
    for (const planet of curSys.planets) {
      const pGroup = planetGroups.get(planet.id);
      const pMesh = planetMeshes.get(planet.id);
      const stGroup = planetStationGroups.get(planet.id);

      let angle = visualOrbitAngles.get(planet.id) ?? planet.orbitAngle;
      if (!curState.paused) {
        angle = (angle + planet.orbitSpeed * daysPerSec * dt) % (Math.PI * 2);
        // Gently pull toward simulation angle so it never drifts across view switches
        let diff = planet.orbitAngle - angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 0.08) {
          angle = (angle + diff * Math.min(1, dt * 3)) % (Math.PI * 2);
        }
        visualOrbitAngles.set(planet.id, angle);
      }

      if (pGroup) {
        const px = Math.cos(angle) * planet.orbitRadius;
        const pz = Math.sin(angle) * planet.orbitRadius;
        pGroup.position.set(px, 0, pz);
        planetPositions.set(planet.id, new THREE.Vector3(px, 0, pz));
      }
      if (pMesh) {
        pMesh.rotation.y = elapsedSec * 0.24;
      }
      if (stGroup) {
        stGroup.visible = planet.stationType !== 'none';
        if (stGroup.visible) {
          const stOrbitAngle = elapsedSec * 0.55 + planet.orbitIndex;
          const stDist = planet.visualRadius + 1.45;
          stGroup.position.set(
            Math.cos(stOrbitAngle) * stDist,
            0.55 + Math.sin(elapsedSec * 1.4 + planet.orbitIndex) * 0.12,
            Math.sin(stOrbitAngle) * stDist
          );
          stGroup.rotation.y = -stOrbitAngle + elapsedSec * 0.35;
        }
      }
    }

    // Planet selection ring
    if (selection?.type === 'planet' && selection.systemId === sys.id) {
      const pos = planetPositions.get(selection.id);
      const planet = curSys.planets.find((p) => p.id === selection.id);
      if (pos && planet) {
        selRing.visible = true;
        selRing.position.copy(pos);
        selRing.scale.setScalar(planet.visualRadius);
      } else {
        selRing.visible = false;
      }
    } else {
      selRing.visible = false;
    }

    // Sync fleets in this system
    const presentIds = new Set<string>();
    for (const fleet of Object.values(curState.fleets)) {
      if (fleet.inTransit || fleet.systemId !== sys.id) continue;
      presentIds.add(fleet.id);
      let model = fleetMeshes.get(fleet.id);
      const hullRank = ['corvette', 'destroyer', 'cruiser', 'battleship', 'titan'];
      const flagshipHull =
        fleet.ships.length > 0
          ? fleet.ships.reduce(
              (best, s) =>
                hullRank.indexOf(s.hullClass) > hullRank.indexOf(best) ? s.hullClass : best,
              fleet.ships[0].hullClass
            )
          : undefined;

      if (!model || model.userData.flagshipHull !== flagshipHull) {
        if (model) scene.remove(model);
        model = createShipModel(fleet.shipType, fleet.isHostile, flagshipHull);
        model.userData.flagshipHull = flagshipHull;
        scene.add(model);
        fleetMeshes.set(fleet.id, model);
      }
      // Scale military fleet visual slightly by ship count
      if (fleet.shipType === 'corvette') {
        const sc = Math.min(2.1, 0.9 + Math.sqrt(Math.max(1, fleet.shipCount)) * 0.25);
        model.scale.setScalar(sc);
      }
      const targetPos = new THREE.Vector3(fleet.localX, 0.8, fleet.localZ);
      const dist = model.position.distanceTo(targetPos);
      if (dist > 0.05) {
        model.lookAt(targetPos);
        model.position.lerp(targetPos, Math.min(1, dt * 6));
      } else if (fleet.inCombat) {
        model.lookAt(fleet.isHostile ? -15 : 15, 0.8, 0);
      }
      model.visible = true;
    }
    for (const [id, model] of fleetMeshes.entries()) {
      if (!presentIds.has(id)) {
        model.visible = false;
      }
    }

    // Render live 3D laser/kinetic/missile combat beams if battle is active in this system
    const battle = curState.battles[sys.id];
    for (let i = 0; i < beamPool.length; i++) {
      const bv = beamPool[i];
      if (!battle || i >= battle.recentShots.length) {
        bv.line.visible = false;
        bv.impactSprite.visible = false;
        continue;
      }
      const shot = battle.recentShots[i];
      const fromMesh = fleetMeshes.get(shot.fromFleetId);
      const toMesh = fleetMeshes.get(shot.toFleetId);
      if (!fromMesh || !toMesh || !fromMesh.visible || !toMesh.visible) {
        bv.line.visible = false;
        bv.impactSprite.visible = false;
        continue;
      }

      // Animated pulse phase per beam so lasers fire continuously & dynamically
      const phase = (elapsedSec * 4.5 + i * 0.73) % 1;
      const spreadX = Math.sin(i * 3.1 + Math.floor(elapsedSec * 3)) * 2.2;
      const spreadZ = Math.cos(i * 2.7 + Math.floor(elapsedSec * 3)) * 2.2;
      const start = fromMesh.position.clone().add(new THREE.Vector3(spreadX * 0.4, 0.3, spreadZ * 0.4));
      const end = toMesh.position.clone().add(new THREE.Vector3(spreadX, 0.2, spreadZ));

      const isBeam =
        shot.weaponType.startsWith('laser') ||
        shot.weaponType.startsWith('plasma') ||
        shot.weaponType === 'tachyon_lance' ||
        shot.weaponType === 'arc_emitter';

      if (isBeam) {
        const posAttr = bv.line.geometry.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, start.x, start.y, start.z);
        posAttr.setXYZ(1, end.x, end.y, end.z);
        posAttr.needsUpdate = true;
        const mat = bv.line.material as THREE.LineBasicMaterial;
        mat.color.set(shot.color);
        mat.opacity = phase < 0.55 ? 0.95 : 0.15;
        bv.line.visible = true;

        bv.impactSprite.position.copy(end);
        bv.impactSprite.visible = phase < 0.45;
      } else {
        // Kinetic / Missile traveling bolt
        const head = new THREE.Vector3().lerpVectors(start, end, phase);
        const tail = new THREE.Vector3().lerpVectors(start, end, Math.max(0, phase - 0.18));
        const posAttr = bv.line.geometry.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, tail.x, tail.y, tail.z);
        posAttr.setXYZ(1, head.x, head.y, head.z);
        posAttr.needsUpdate = true;
        const mat = bv.line.material as THREE.LineBasicMaterial;
        mat.color.set(shot.color);
        mat.opacity = 0.95;
        bv.line.visible = true;

        bv.impactSprite.position.copy(end);
        bv.impactSprite.visible = phase > 0.85;
      }
    }

    // Animate 3D Explosion Bursts during active combat
    for (let i = 0; i < explosionSprites.length; i++) {
      const sp = explosionSprites[i];
      if (!battle) {
        sp.visible = false;
        continue;
      }
      const p = (elapsedSec * 1.4 + i * 0.37) % 1;
      const sideX = i % 2 === 0 ? 15 : -15;
      const ox = Math.sin(i * 4.7 + Math.floor(elapsedSec)) * 3.8;
      const oz = Math.cos(i * 3.3 + Math.floor(elapsedSec)) * 3.8;
      sp.visible = true;
      sp.position.set(sideX + ox, 1.0 + p * 0.8, oz);
      sp.scale.setScalar(1.2 + p * 4.2);
      (sp.material as THREE.SpriteMaterial).opacity = Math.max(0, (1 - p) * 0.9);
    }
  }

  return {
    scene,
    systemId: sys.id,
    planetHitMeshes,
    planetPositions,
    starbasePosition: starbaseGroup.position.clone(),
    update,
    dispose: () => {
      bgGeo.dispose();
      bgMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      selRingGeo.dispose();
    },
  };
}
