import * as THREE from 'three';
import { GameStateData, MapMode, SelectionTarget } from '../types/game';
import { STAR_CLASSES } from '../data/starClasses';
import { getGlowTexture, getTerritoryTexture } from './proceduralTextures';
import { PRNG } from '../engine/prng';
import { getSystemMapModeColor } from '../ui/Minimap';
import { findHyperlanePath } from '../engine/pathfinding';

export interface GalaxySceneHandle {
  scene: THREE.Scene;
  starHitMeshes: THREE.Mesh[];
  update: (
    state: GameStateData,
    selection: SelectionTarget,
    hoveredSystemId: string | null,
    showHyperlanes: boolean,
    showBorders: boolean,
    mapMode: MapMode,
    elapsedSec: number
  ) => void;
  getSystemWorldPos: (systemId: string) => THREE.Vector3 | null;
  dispose: () => void;
}

export function createGalaxyScene(state: GameStateData): GalaxySceneHandle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040711');

  const rng = new PRNG(state.config.seed ^ 0x9e3779b9);

  // 1. Deep background starfield
  const bgCount = 2400;
  const bgPositions = new Float32Array(bgCount * 3);
  const bgColors = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    const r = rng.range(380, 950);
    const theta = rng.range(0, Math.PI * 2);
    const phi = Math.acos(rng.range(-1, 1));
    bgPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    bgPositions[i * 3 + 1] = r * Math.cos(phi);
    bgPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const tint = rng.next();
    const c = new THREE.Color(
      tint < 0.25 ? '#93c5fd' : tint < 0.5 ? '#fde68a' : tint < 0.7 ? '#e2e8f0' : '#c4b5fd'
    );
    const bright = rng.range(0.35, 0.95);
    bgColors[i * 3] = c.r * bright;
    bgColors[i * 3 + 1] = c.g * bright;
    bgColors[i * 3 + 2] = c.b * bright;
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
  const bgMat = new THREE.PointsMaterial({
    size: 1.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  scene.add(new THREE.Points(bgGeo, bgMat));

  // 2. Galactic Core Glow + Spiral Dust Plane
  const coreSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture('#60a5fa', '#040711'),
      color: new THREE.Color('#93c5fd'),
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  coreSprite.scale.set(160, 160, 1);
  coreSprite.position.set(0, -12, 0);
  scene.add(coreSprite);

  // 2b. Volumetric-feel Cosmic Nebulae Clouds
  const nebulaPalette = ['#6366f1', '#0ea5e9', '#a855f7', '#06b6d4', '#f59e0b'];
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 + rng.range(-0.35, 0.35);
    const dist = rng.range(55, 170);
    const col = nebulaPalette[i % nebulaPalette.length];
    const cloud = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(col, '#040711'),
        color: new THREE.Color(col),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const scale = rng.range(115, 195);
    cloud.scale.set(scale, scale * 0.78, 1);
    cloud.position.set(Math.cos(ang) * dist, -14 - i * 0.5, Math.sin(ang) * dist);
    scene.add(cloud);
  }

  // Subtle galactic dust points along arms/disc
  const dustCount = 1600;
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  const maxR = state.config.size === 'small' ? 185 : state.config.size === 'medium' ? 235 : 275;
  for (let i = 0; i < dustCount; i++) {
    let x = 0;
    let z = 0;
    if (state.config.shape === 'spiral') {
      const arm = i % 3;
      const t = Math.pow(rng.next(), 0.75);
      const r = 18 + t * maxR;
      const angle = (arm / 3) * Math.PI * 2 + (r / maxR) * 3.1 + rng.range(-0.65, 0.65);
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
    } else if (state.config.shape === 'ring') {
      const angle = rng.range(0, Math.PI * 2);
      const r = rng.range(maxR * 0.42, maxR * 1.05);
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
    } else {
      const angle = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.next()) * maxR;
      x = Math.cos(angle) * r * 1.15;
      z = Math.sin(angle) * r * 0.85;
    }
    dustPos[i * 3] = x;
    dustPos[i * 3 + 1] = rng.range(-10, -3);
    dustPos[i * 3 + 2] = z;

    const c = new THREE.Color(rng.chance(0.55) ? '#1d4ed8' : '#7e22ce');
    dustCol[i * 3] = c.r;
    dustCol[i * 3 + 1] = c.g;
    dustCol[i * 3 + 2] = c.b;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 4.5,
    map: getGlowTexture('#38bdf8'),
    vertexColors: true,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // Subtle galactic reference grid ring
  const gridGroup = new THREE.Group();
  for (const r of [65, 130, 195]) {
    const ringGeo = new THREE.RingGeometry(r - 0.18, r + 0.18, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#1e3a5f',
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.y = -8;
    gridGroup.add(mesh);
  }
  scene.add(gridGroup);

  // 3. Stars, Stems, Nebulae, and Hit Spheres
  const starHitMeshes: THREE.Mesh[] = [];
  const starPositions = new Map<string, THREE.Vector3>();
  const starCoreMeshes = new Map<string, THREE.Mesh>();
  const starGlowSprites = new Map<string, THREE.Sprite>();
  const territoryDiscs = new Map<string, THREE.Mesh>();

  const stemPositions: number[] = [];
  const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
  const hitGeo = new THREE.SphereGeometry(6.5, 10, 10);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const terrGeo = new THREE.PlaneGeometry(54, 54);
  terrGeo.rotateX(-Math.PI / 2);

  const playerTerrTex = getTerritoryTexture('#38bdf8');

  for (const sysId of state.systemOrder) {
    const sys = state.systems[sysId];
    const starDef = STAR_CLASSES[sys.starClass];
    // Map (sys.x, sys.y, sys.z) -> Three.js (x, elevation y, z)
    const pos = new THREE.Vector3(sys.x, sys.z, sys.y);
    starPositions.set(sys.id, pos);

    // Subtle vertical elevation stem to galactic plane y = -8
    stemPositions.push(pos.x, pos.y, pos.z, pos.x, -8, pos.z);

    // Core star mesh
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(starDef.color),
    });
    const coreMesh = new THREE.Mesh(sphereGeo, coreMat);
    const visualScale = starDef.radius * 0.42;
    coreMesh.scale.setScalar(visualScale);
    coreMesh.position.copy(pos);
    scene.add(coreMesh);
    starCoreMeshes.set(sys.id, coreMesh);

    // Star glow sprite
    const glowMat = new THREE.SpriteMaterial({
      map: getGlowTexture(starDef.glowColor),
      color: new THREE.Color(starDef.color),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(glowMat);
    sprite.position.copy(pos);
    sprite.scale.setScalar(starDef.radius * 3.4);
    scene.add(sprite);
    starGlowSprites.set(sys.id, sprite);

    // Nebula cloud
    if (sys.hasNebula) {
      const nebSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getGlowTexture('#a855f7', '#040711'),
          color: new THREE.Color('#818cf8'),
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      nebSprite.position.set(pos.x, pos.y - 2, pos.z);
      nebSprite.scale.set(52, 52, 1);
      scene.add(nebSprite);
    }

    // Territory disc (toggled visible when owned)
    const terrMat = new THREE.MeshBasicMaterial({
      map: playerTerrTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const terrMesh = new THREE.Mesh(terrGeo, terrMat);
    terrMesh.position.set(pos.x, -7.8, pos.z);
    terrMesh.visible = sys.ownerId !== null;
    scene.add(terrMesh);
    territoryDiscs.set(sys.id, terrMesh);

    // Invisible raycast hit sphere
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.copy(pos);
    hitMesh.userData = { systemId: sys.id };
    scene.add(hitMesh);
    starHitMeshes.push(hitMesh);
  }

  // Vertical elevation stems
  const stemGeo = new THREE.BufferGeometry();
  stemGeo.setAttribute('position', new THREE.Float32BufferAttribute(stemPositions, 3));
  const stemMat = new THREE.LineBasicMaterial({
    color: '#334155',
    transparent: true,
    opacity: 0.28,
  });
  scene.add(new THREE.LineSegments(stemGeo, stemMat));

  // 4. Hyperlane network
  const lanePairs: Array<[string, string]> = [];
  const seenLane = new Set<string>();
  for (const sysId of state.systemOrder) {
    const sys = state.systems[sysId];
    for (const neighborId of sys.hyperlanes) {
      const key = sysId < neighborId ? `${sysId}_${neighborId}` : `${neighborId}_${sysId}`;
      if (seenLane.has(key)) continue;
      seenLane.add(key);
      lanePairs.push([sysId, neighborId]);
    }
  }

  const lanePosArr = new Float32Array(lanePairs.length * 6);
  const laneColArr = new Float32Array(lanePairs.length * 6);
  for (let i = 0; i < lanePairs.length; i++) {
    const [aId, bId] = lanePairs[i];
    const pa = starPositions.get(aId)!;
    const pb = starPositions.get(bId)!;
    lanePosArr[i * 6 + 0] = pa.x;
    lanePosArr[i * 6 + 1] = pa.y;
    lanePosArr[i * 6 + 2] = pa.z;
    lanePosArr[i * 6 + 3] = pb.x;
    lanePosArr[i * 6 + 4] = pb.y;
    lanePosArr[i * 6 + 5] = pb.z;
  }
  const laneGeo = new THREE.BufferGeometry();
  laneGeo.setAttribute('position', new THREE.BufferAttribute(lanePosArr, 3));
  laneGeo.setAttribute('color', new THREE.BufferAttribute(laneColArr, 3));
  const laneMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const hyperlaneLines = new THREE.LineSegments(laneGeo, laneMat);
  scene.add(hyperlaneLines);

  // 4b. Cross-Galaxy Gateway Network Lines (Cyan)
  const gatewayGeo = new THREE.BufferGeometry();
  const gatewayMat = new THREE.LineBasicMaterial({
    color: '#22d3ee',
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const gatewayLines = new THREE.LineSegments(gatewayGeo, gatewayMat);
  gatewayLines.visible = false;
  scene.add(gatewayLines);

  // 4c. Hovered Fleet Path Preview Line (Amber)
  const hoverPathGeo = new THREE.BufferGeometry();
  const hoverPathMat = new THREE.LineBasicMaterial({
    color: '#fbbf24',
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const hoverPathLine = new THREE.Line(hoverPathGeo, hoverPathMat);
  hoverPathLine.visible = false;
  scene.add(hoverPathLine);

  // 5. Selection & Hover rings
  const selRingGeo = new THREE.RingGeometry(4.8, 5.7, 36);
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

  const hoverRingGeo = new THREE.RingGeometry(4.0, 4.5, 32);
  hoverRingGeo.rotateX(-Math.PI / 2);
  const hoverRing = new THREE.Mesh(
    hoverRingGeo,
    new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  hoverRing.visible = false;
  scene.add(hoverRing);

  // 6. Active Fleet Route Line
  const routeMat = new THREE.LineBasicMaterial({
    color: '#34d399',
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const routeGeo = new THREE.BufferGeometry();
  const routeLine = new THREE.Line(routeGeo, routeMat);
  routeLine.visible = false;
  scene.add(routeLine);

  // 7. Fleet 3D Markers (Diamond/Chevron pyramids)
  const fleetMeshes = new Map<string, THREE.Mesh>();
  const fleetConeGeo = new THREE.ConeGeometry(1.5, 4.2, 4);
  fleetConeGeo.rotateX(Math.PI / 2);

  function ensureFleetMesh(fleetId: string, shipType: string, isHostile?: boolean): THREE.Mesh {
    let mesh = fleetMeshes.get(fleetId);
    if (!mesh) {
      const color = isHostile
        ? '#f43f5e'
        : shipType === 'science'
        ? '#38bdf8'
        : shipType === 'construction'
        ? '#fbbf24'
        : '#34d399';
      mesh = new THREE.Mesh(
        fleetConeGeo,
        new THREE.MeshBasicMaterial({ color })
      );
      scene.add(mesh);
      fleetMeshes.set(fleetId, mesh);
    }
    return mesh;
  }

  function update(
    curState: GameStateData,
    selection: SelectionTarget,
    hoveredSystemId: string | null,
    showHyperlanes: boolean,
    showBorders: boolean,
    mapMode: MapMode,
    elapsedSec: number
  ) {
    hyperlaneLines.visible = showHyperlanes;

    // Update hyperlane colors based on exploration & ownership
    const colAttr = laneGeo.getAttribute('color') as THREE.BufferAttribute;
    const cOwned = new THREE.Color('#38bdf8');
    const cExplored = new THREE.Color('#475569');
    const cFog = new THREE.Color('#1e293b');
    for (let i = 0; i < lanePairs.length; i++) {
      const [aId, bId] = lanePairs[i];
      const a = curState.systems[aId];
      const b = curState.systems[bId];
      let c = cFog;
      if (a?.ownerId && b?.ownerId && a.ownerId === b.ownerId) {
        c = cOwned;
      } else if (a?.exploredByPlayer || b?.exploredByPlayer) {
        c = cExplored;
      }
      colAttr.setXYZ(i * 2, c.r, c.g, c.b);
      colAttr.setXYZ(i * 2 + 1, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;

    // Update territory discs with Empire/MapMode colors and star glow subtle pulse
    for (const sysId of curState.systemOrder) {
      const sys = curState.systems[sysId];
      const disc = territoryDiscs.get(sysId);
      if (disc) {
        const modeColor = getSystemMapModeColor(
          sys,
          mapMode,
          curState.playerEmpireId,
          curState.empires,
          curState.relations
        );
        if (showBorders && modeColor) {
          const tex = getTerritoryTexture(modeColor);
          const mat = disc.material as THREE.MeshBasicMaterial;
          if (mat.map !== tex) {
            mat.map = tex;
            mat.needsUpdate = true;
          }
          disc.visible = true;
        } else {
          disc.visible = false;
        }
      }
      const sprite = starGlowSprites.get(sysId);
      if (sprite) {
        const starDef = STAR_CLASSES[sys.starClass];
        const baseOpacity = sys.exploredByPlayer ? 0.92 : 0.42;
        (sprite.material as THREE.SpriteMaterial).opacity =
          baseOpacity + Math.sin(elapsedSec * 1.8 + sys.x) * 0.06;
        sprite.scale.setScalar(starDef.radius * (sys.exploredByPlayer ? 3.5 : 2.6));
      }
    }

    // Update selection ring
    let selectedSysId: string | null = null;
    if (selection?.type === 'system') selectedSysId = selection.id;
    else if (selection?.type === 'planet') selectedSysId = selection.systemId;
    else if (selection?.type === 'fleet') {
      const f = curState.fleets[selection.id];
      if (f) selectedSysId = f.systemId;
    }

    if (selectedSysId && starPositions.has(selectedSysId)) {
      selRing.visible = true;
      selRing.position.copy(starPositions.get(selectedSysId)!);
      selRing.rotation.z = elapsedSec * 0.9;
    } else {
      selRing.visible = false;
    }

    // Update hover ring
    if (hoveredSystemId && starPositions.has(hoveredSystemId)) {
      hoverRing.visible = true;
      hoverRing.position.copy(starPositions.get(hoveredSystemId)!);
    } else {
      hoverRing.visible = false;
    }

    // Update fleet 3D markers & prune destroyed fleets
    const aliveFleetIds = new Set<string>();
    const fleetIndexBySys: Record<string, number> = {};
    for (const fleet of Object.values(curState.fleets)) {
      aliveFleetIds.add(fleet.id);
      const mesh = ensureFleetMesh(fleet.id, fleet.shipType, fleet.isHostile);
      if (fleet.inTransit && fleet.transitFromId && fleet.transitToId) {
        const pA = starPositions.get(fleet.transitFromId);
        const pB = starPositions.get(fleet.transitToId);
        if (pA && pB) {
          mesh.position.lerpVectors(pA, pB, fleet.transitProgress);
          mesh.position.y += 2.2;
          mesh.lookAt(pB.x, pB.y + 2.2, pB.z);
        }
      } else {
        const pSys = starPositions.get(fleet.systemId);
        if (pSys) {
          const idx = fleetIndexBySys[fleet.systemId] ?? 0;
          fleetIndexBySys[fleet.systemId] = idx + 1;
          const angle = elapsedSec * 0.65 + idx * 2.1;
          mesh.position.set(
            pSys.x + Math.cos(angle) * 5.2,
            pSys.y + 2.4,
            pSys.z + Math.sin(angle) * 5.2
          );
          mesh.lookAt(
            pSys.x + Math.cos(angle + 0.3) * 5.2,
            pSys.y + 2.4,
            pSys.z + Math.sin(angle + 0.3) * 5.2
          );
        }
      }
    }
    for (const [fId, mesh] of fleetMeshes.entries()) {
      if (!aliveFleetIds.has(fId)) {
        scene.remove(mesh);
        fleetMeshes.delete(fId);
      }
    }

    // Update selected fleet route preview
    if (selection?.type === 'fleet') {
      const fleet = curState.fleets[selection.id];
      const moveOrder = fleet?.orders.find((o) => o.type === 'move');
      if (fleet && moveOrder && moveOrder.type === 'move' && moveOrder.path.length > 0) {
        const pts: THREE.Vector3[] = [];
        const fleetMesh = fleetMeshes.get(fleet.id);
        if (fleetMesh) {
          pts.push(fleetMesh.position.clone());
        } else if (starPositions.has(fleet.systemId)) {
          pts.push(starPositions.get(fleet.systemId)!.clone());
        }
        for (const hopId of moveOrder.path) {
          const hp = starPositions.get(hopId);
          if (hp) pts.push(new THREE.Vector3(hp.x, hp.y + 1.5, hp.z));
        }
        routeGeo.setFromPoints(pts);
        routeLine.visible = pts.length >= 2;
      } else {
        routeLine.visible = false;
      }
    } else {
      routeLine.visible = false;
    }

    // Update Cross-Galaxy Gateway Network Lines (connect player's active gateways)
    const activeGateways = curState.systemOrder.filter((id) => {
      const s = curState.systems[id];
      return s && s.hasGateway && s.ownerId === curState.playerEmpireId;
    });
    if (activeGateways.length >= 2) {
      const gwPts: THREE.Vector3[] = [];
      for (let i = 0; i < activeGateways.length; i++) {
        for (let j = i + 1; j < activeGateways.length; j++) {
          const pA = starPositions.get(activeGateways[i]);
          const pB = starPositions.get(activeGateways[j]);
          if (pA && pB) {
            gwPts.push(
              new THREE.Vector3(pA.x, pA.y + 0.9, pA.z),
              new THREE.Vector3(pB.x, pB.y + 0.9, pB.z)
            );
          }
        }
      }
      gatewayGeo.setFromPoints(gwPts);
      gatewayLines.visible = gwPts.length >= 2;
    } else {
      gatewayLines.visible = false;
    }

    // Update Hovered Fleet Path Preview
    if (selection?.type === 'fleet' && hoveredSystemId) {
      const fleet = curState.fleets[selection.id];
      if (fleet && fleet.ownerId === curState.playerEmpireId && fleet.systemId !== hoveredSystemId) {
        const previewPath = findHyperlanePath(curState.systems, fleet.systemId, hoveredSystemId);
        if (previewPath && previewPath.length > 0) {
          const pts: THREE.Vector3[] = [];
          const startPos = starPositions.get(fleet.systemId);
          if (startPos) pts.push(new THREE.Vector3(startPos.x, startPos.y + 1.8, startPos.z));
          for (const hopId of previewPath) {
            const hp = starPositions.get(hopId);
            if (hp) pts.push(new THREE.Vector3(hp.x, hp.y + 1.8, hp.z));
          }
          hoverPathGeo.setFromPoints(pts);
          hoverPathLine.visible = pts.length >= 2;
        } else {
          hoverPathLine.visible = false;
        }
      } else {
        hoverPathLine.visible = false;
      }
    } else {
      hoverPathLine.visible = false;
    }
  }

  return {
    scene,
    starHitMeshes,
    update,
    getSystemWorldPos: (id) => starPositions.get(id) ?? null,
    dispose: () => {
      bgGeo.dispose();
      bgMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      sphereGeo.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      terrGeo.dispose();
      stemGeo.dispose();
      stemMat.dispose();
      laneGeo.dispose();
      laneMat.dispose();
      selRingGeo.dispose();
      hoverRingGeo.dispose();
      routeGeo.dispose();
      routeMat.dispose();
      gatewayGeo.dispose();
      gatewayMat.dispose();
      hoverPathGeo.dispose();
      hoverPathMat.dispose();
      fleetConeGeo.dispose();
    },
  };
}
