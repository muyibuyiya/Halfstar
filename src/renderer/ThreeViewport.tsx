import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { createGalaxyScene, GalaxySceneHandle } from './GalaxySceneBuilder';
import { createSystemScene, SystemSceneHandle } from './SystemSceneBuilder';
import { StarSystem } from '../types/game';
import { PLANET_CLASSES } from '../data/planetClasses';
import { STRATEGIC_RESOURCES } from '../data/megastructures';
import { findHyperlanePath } from '../engine/pathfinding';

interface CameraState {
  target: THREE.Vector3;
  desiredTarget: THREE.Vector3;
  distance: number;
  desiredDistance: number;
  yaw: number;
  desiredYaw: number;
  pitch: number;
  desiredPitch: number;
}

function summarizeSystemDeposits(sys: StarSystem) {
  let energy = 0;
  let minerals = 0;
  let research = 0;
  let alloys = 0;
  let unbuilt = 0;
  let habitable = 0;
  let colonized = 0;

  for (const p of sys.planets) {
    if (p.habitable) habitable++;
    if (p.colonizedBy) colonized++;
    if (p.deposit) {
      if (p.deposit.type === 'energy') energy += p.deposit.amount;
      if (p.deposit.type === 'minerals') minerals += p.deposit.amount;
      if (p.deposit.type === 'research') research += p.deposit.amount;
      if (p.deposit.type === 'alloys') alloys += p.deposit.amount;
      if (p.stationType === 'none') unbuilt++;
    }
  }
  return { energy, minerals, research, alloys, unbuilt, habitable, colonized };
}

export const ThreeViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const planetLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const exitLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const starbaseLabelRef = useRef<HTMLDivElement | null>(null);

  // Subscribe only to structural changes needed to render label DOM nodes
  const game = useGameStore((s) => s.game);
  const tickVersion = useGameStore((s) => s.tickVersion);
  const viewMode = useGameStore((s) => s.viewMode);
  const activeSystemId = useGameStore((s) => s.activeSystemId);
  const selection = useGameStore((s) => s.selection);
  const hoveredSystemId = useGameStore((s) => s.hoveredSystemId);
  const cameraFocus = useGameStore((s) => s.cameraFocus);

  const galaxySceneRef = useRef<GalaxySceneHandle | null>(null);
  const systemSceneRef = useRef<SystemSceneHandle | null>(null);
  const cameraStateRef = useRef<CameraState>({
    target: new THREE.Vector3(0, 0, 0),
    desiredTarget: new THREE.Vector3(0, 0, 0),
    distance: 230,
    desiredDistance: 230,
    yaw: 0.15,
    desiredYaw: 0.15,
    pitch: 0.92,
    desiredPitch: 0.92,
  });

  // Rebuild galaxy scene when galaxy seed/config changes
  useEffect(() => {
    if (galaxySceneRef.current) {
      galaxySceneRef.current.dispose();
    }
    const state = useGameStore.getState().game;
    galaxySceneRef.current = createGalaxyScene(state);
    return () => {
      galaxySceneRef.current?.dispose();
      galaxySceneRef.current = null;
    };
  }, [game.config.seed, game.config.size, game.config.shape]);

  // Rebuild system scene when entering a system
  useEffect(() => {
    if (viewMode === 'system') {
      const sys = useGameStore.getState().game.systems[activeSystemId];
      if (sys) {
        systemSceneRef.current?.dispose();
        systemSceneRef.current = createSystemScene(sys);
        const cam = cameraStateRef.current;
        cam.desiredTarget.set(0, 0, 0);
        cam.target.set(0, 0, 0);
        cam.desiredDistance = 78;
        cam.distance = 92;
        cam.desiredPitch = 0.72;
        cam.desiredYaw = 0.35;
      }
    } else {
      const cam = cameraStateRef.current;
      cam.desiredDistance = 215;
      cam.desiredPitch = 0.95;
    }
  }, [viewMode, activeSystemId]);

  // Focus camera on requested system
  useEffect(() => {
    if (!cameraFocus) return;
    if (useGameStore.getState().viewMode === 'galaxy') {
      const sys = useGameStore.getState().game.systems[cameraFocus.systemId];
      if (sys) {
        const cam = cameraStateRef.current;
        cam.desiredTarget.set(sys.x, 0, sys.y);
        cam.desiredDistance = Math.min(cam.desiredDistance, 175);
      }
    }
  }, [cameraFocus]);

  // Main WebGL renderer, input, and animation loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      2500
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keysDown = new Set<string>();

    let draggingMode: 'none' | 'pan' | 'orbit' = 'none';
    let pointerDownPos = { x: 0, y: 0 };
    let lastPointer = { x: 0, y: 0 };
    let dragDistance = 0;

    const getRaycastHit = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const mode = useGameStore.getState().viewMode;
      if (mode === 'galaxy' && galaxySceneRef.current) {
        const hits = raycaster.intersectObjects(galaxySceneRef.current.starHitMeshes, false);
        if (hits.length > 0) {
          return { kind: 'system' as const, systemId: hits[0].object.userData.systemId as string };
        }
      } else if (mode === 'system' && systemSceneRef.current) {
        const hits = raycaster.intersectObjects(systemSceneRef.current.planetHitMeshes, false);
        if (hits.length > 0) {
          return {
            kind: 'planet' as const,
            planetId: hits[0].object.userData.planetId as string,
            systemId: hits[0].object.userData.systemId as string,
          };
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.target !== renderer.domElement) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastPointer = { x: e.clientX, y: e.clientY };
      dragDistance = 0;

      if (e.button === 2) {
        draggingMode = e.altKey ? 'orbit' : 'orbit';
      } else if (e.button === 1) {
        draggingMode = 'orbit';
      } else if (e.button === 0) {
        draggingMode = 'pan';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      lastPointer = { x: e.clientX, y: e.clientY };

      if (draggingMode !== 'none') {
        dragDistance += Math.abs(dx) + Math.abs(dy);
        const cam = cameraStateRef.current;

        if (draggingMode === 'pan') {
          const panScale = cam.distance * 0.00145;
          const forward = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
          const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
          cam.desiredTarget.addScaledVector(right, -dx * panScale);
          cam.desiredTarget.addScaledVector(forward, dy * panScale);
        } else if (draggingMode === 'orbit') {
          cam.desiredYaw -= dx * 0.0055;
          cam.desiredPitch = THREE.MathUtils.clamp(
            cam.desiredPitch + dy * 0.0045,
            0.32,
            1.42
          );
        }
        return;
      }

      // Hover highlight in Galaxy View
      if (e.target === renderer.domElement && useGameStore.getState().viewMode === 'galaxy') {
        const hit = getRaycastHit(e.clientX, e.clientY);
        const nextHover = hit?.kind === 'system' ? hit.systemId : null;
        if (useGameStore.getState().hoveredSystemId !== nextHover) {
          useGameStore.getState().setHoveredSystem(nextHover);
        }
        renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = dragDistance < 6;
      const prevMode = draggingMode;
      draggingMode = 'none';

      if (!wasClick || e.target !== renderer.domElement) return;

      const store = useGameStore.getState();
      const hit = getRaycastHit(e.clientX, e.clientY);

      if (e.button === 0 && prevMode === 'pan') {
        store.openContextMenu(null);
        if (hit?.kind === 'system') {
          store.setSelection({ type: 'system', id: hit.systemId });
        } else if (hit?.kind === 'planet') {
          store.setSelection({ type: 'planet', id: hit.planetId, systemId: hit.systemId });
        }
      } else if (e.button === 2) {
        if (hit?.kind === 'system') {
          store.openContextMenu({
            screenX: e.clientX,
            screenY: e.clientY,
            systemId: hit.systemId,
          });
        } else {
          store.openContextMenu(null);
        }
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      const hit = getRaycastHit(e.clientX, e.clientY);
      if (hit?.kind === 'system') {
        useGameStore.getState().enterSystemView(hit.systemId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.target !== renderer.domElement) return;
      e.preventDefault();
      const cam = cameraStateRef.current;
      const mode = useGameStore.getState().viewMode;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      const minD = mode === 'galaxy' ? 68 : 22;
      const maxD = mode === 'galaxy' ? 460 : 160;
      cam.desiredDistance = THREE.MathUtils.clamp(cam.desiredDistance * factor, minD, maxD);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysDown.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const projVec = new THREE.Vector3();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const cam = cameraStateRef.current;
      const store = useGameStore.getState();

      // Keyboard WASD camera pan
      const panSpeed = cam.distance * 0.9 * dt;
      const forward = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
      const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) {
        cam.desiredTarget.addScaledVector(forward, panSpeed);
      }
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) {
        cam.desiredTarget.addScaledVector(forward, -panSpeed);
      }
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) {
        cam.desiredTarget.addScaledVector(right, -panSpeed);
      }
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) {
        cam.desiredTarget.addScaledVector(right, panSpeed);
      }

      // Clamp target bounds
      const maxBound = store.viewMode === 'galaxy' ? 280 : 70;
      cam.desiredTarget.x = THREE.MathUtils.clamp(cam.desiredTarget.x, -maxBound, maxBound);
      cam.desiredTarget.z = THREE.MathUtils.clamp(cam.desiredTarget.z, -maxBound, maxBound);

      // Smooth damping
      const damp = 1 - Math.exp(-9 * dt);
      cam.target.lerp(cam.desiredTarget, damp);
      cam.distance = THREE.MathUtils.lerp(cam.distance, cam.desiredDistance, damp);
      cam.yaw = THREE.MathUtils.lerp(cam.yaw, cam.desiredYaw, damp);
      cam.pitch = THREE.MathUtils.lerp(cam.pitch, cam.desiredPitch, damp);

      // Compute spherical camera position around target
      const horiz = Math.cos(cam.pitch) * cam.distance;
      camera.position.set(
        cam.target.x + Math.sin(cam.yaw) * horiz,
        cam.target.y + Math.sin(cam.pitch) * cam.distance,
        cam.target.z + Math.cos(cam.yaw) * horiz
      );
      camera.lookAt(cam.target);

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (store.viewMode === 'galaxy' && galaxySceneRef.current) {
        galaxySceneRef.current.update(
          store.game,
          store.selection,
          store.hoveredSystemId,
          store.showHyperlanes,
          store.showBorders,
          store.mapMode,
          elapsed
        );
        renderer.render(galaxySceneRef.current.scene, camera);

        // Project system labels at 60 FPS directly via DOM transforms
        for (const sysId of store.game.systemOrder) {
          const el = labelRefs.current.get(sysId);
          if (!el) continue;
          const worldPos = galaxySceneRef.current.getSystemWorldPos(sysId);
          if (!worldPos) continue;
          projVec.copy(worldPos);
          projVec.y -= 2.4;
          projVec.project(camera);

          const visible = projVec.z < 1 && projVec.x >= -1.15 && projVec.x <= 1.15 && projVec.y >= -1.15 && projVec.y <= 1.15;
          if (!visible) {
            el.style.display = 'none';
          } else {
            const sx = (projVec.x * 0.5 + 0.5) * width;
            const sy = (-projVec.y * 0.5 + 0.5) * height;
            el.style.display = 'flex';
            el.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy + 10).toFixed(1)}px, 0) translate(-50%, 0)`;
          }
        }
      } else if (store.viewMode === 'system' && systemSceneRef.current) {
        systemSceneRef.current.update(store.game, store.selection, elapsed, dt);
        renderer.render(systemSceneRef.current.scene, camera);

        const curSys = store.game.systems[store.activeSystemId];
        // Project starbase label if owned
        const sbEl = starbaseLabelRef.current;
        if (sbEl && curSys?.ownerId) {
          projVec.copy(systemSceneRef.current.starbasePosition);
          projVec.y -= 1.8;
          projVec.project(camera);
          if (projVec.z >= 1) {
            sbEl.style.display = 'none';
          } else {
            const sx = (projVec.x * 0.5 + 0.5) * width;
            const sy = (-projVec.y * 0.5 + 0.5) * height;
            sbEl.style.display = 'flex';
            sbEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy + 8).toFixed(1)}px, 0) translate(-50%, 0)`;
          }
        } else if (sbEl) {
          sbEl.style.display = 'none';
        }

        // Project planet labels & hyperlane exit jump badges
        if (curSys) {
          for (const nId of curSys.hyperlanes) {
            const exitEl = exitLabelRefs.current.get(nId);
            const nSys = store.game.systems[nId];
            if (!exitEl || !nSys) continue;
            const dx = nSys.x - curSys.x;
            const dz = nSys.y - curSys.y;
            const len = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
            projVec.set((dx / len) * 56, 0.5, (dz / len) * 56);
            projVec.project(camera);
            if (projVec.z >= 1) {
              exitEl.style.display = 'none';
            } else {
              const sx = (projVec.x * 0.5 + 0.5) * width;
              const sy = (-projVec.y * 0.5 + 0.5) * height;
              exitEl.style.display = 'flex';
              exitEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
            }
          }

          for (const planet of curSys.planets) {
            const el = planetLabelRefs.current.get(planet.id);
            if (!el) continue;
            const pPos = systemSceneRef.current.planetPositions.get(planet.id);
            if (!pPos) continue;
            projVec.copy(pPos);
            projVec.y -= planet.visualRadius + 0.6;
            projVec.project(camera);

            if (projVec.z >= 1) {
              el.style.display = 'none';
            } else {
              const sx = (projVec.x * 0.5 + 0.5) * width;
              const sy = (-projVec.y * 0.5 + 0.5) * height;
              el.style.display = 'flex';
              el.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy + 6).toFixed(1)}px, 0) translate(-50%, 0)`;
            }
          }
        }
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Active system data for System View labels
  const activeSystem = game.systems[activeSystemId];
  void tickVersion; // keep labels reactive to survey/owner/station updates

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Screen-Projected HTML Labels Layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {viewMode === 'galaxy' &&
          game.systemOrder.map((sysId) => {
            const sys = game.systems[sysId];
            const stats = summarizeSystemDeposits(sys);
            const isSelected =
              (selection?.type === 'system' && selection.id === sys.id) ||
              (selection?.type === 'fleet' && game.fleets[selection.id]?.systemId === sys.id);
            const fleetsHere = Object.values(game.fleets).filter(
              (f) => !f.inTransit && f.systemId === sys.id
            );

            return (
              <div
                key={sys.id}
                ref={(el) => {
                  if (el) labelRefs.current.set(sys.id, el);
                  else labelRefs.current.delete(sys.id);
                }}
                style={{ display: 'none' }}
                className="pointer-events-auto absolute top-0 left-0 flex-col items-center select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  useGameStore.getState().setSelection({ type: 'system', id: sys.id });
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  useGameStore.getState().enterSystemView(sys.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  useGameStore.getState().openContextMenu({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    systemId: sys.id,
                  });
                }}
              >
                {/* Nameplate bar */}
                {(() => {
                  const ownerEmp = sys.ownerId ? game.empires[sys.ownerId] : null;
                  const isPlayerOwned = sys.ownerId === game.playerEmpireId;
                  return (
                    <div
                      style={
                        ownerEmp && !isPlayerOwned
                          ? {
                              borderColor: `${ownerEmp.color}99`,
                              boxShadow: `0 0 10px ${ownerEmp.color}33`,
                            }
                          : undefined
                      }
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium tracking-wide cursor-pointer transition-colors whitespace-nowrap border ${
                        isPlayerOwned
                          ? 'bg-sky-950/85 border-sky-400/60 text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                          : ownerEmp
                          ? 'bg-slate-950/90 text-slate-100'
                          : sys.exploredByPlayer
                          ? 'bg-slate-900/80 border-slate-600/50 text-slate-200'
                          : 'bg-slate-950/60 border-slate-800/40 text-slate-500'
                      } ${isSelected ? 'ring-1 ring-amber-400' : ''}`}
                    >
                      {ownerEmp && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: ownerEmp.color }}
                        />
                      )}
                      {ownerEmp?.isFallenEmpire && (
                        <span title="远古失落帝国" className="text-amber-300 text-[10px]">
                          ♛
                        </span>
                      )}
                      <span>{sys.name}</span>
                      {sys.hasGateway && (
                        <span title="跨星系星门" className="text-cyan-300 text-[10px] font-bold">
                          ◎
                        </span>
                      )}
                      {sys.exploredByPlayer && sys.enclave && (
                        <span title={sys.enclave.name} className="text-teal-300 text-[10px]">
                          🏛
                        </span>
                      )}
                      {sys.megastructure && (
                        <span title="星际巨型建筑" className="text-amber-300 text-[10px]">
                          ◈
                        </span>
                      )}
                      {sys.surveyedByPlayer && sys.archSite && sys.archSite.stage !== 'completed' && (
                        <span title={`考古遗址：${sys.archSite.siteName}`} className="text-purple-300 text-[10px]">
                          ⚱
                        </span>
                      )}
                      {sys.surveyedByPlayer && sys.strategicDeposit && (
                        <span
                          title={`战略资源：${STRATEGIC_RESOURCES[sys.strategicDeposit.type].name}`}
                          className={`text-[10px] ${STRATEGIC_RESOURCES[sys.strategicDeposit.type].color}`}
                        >
                          {STRATEGIC_RESOURCES[sys.strategicDeposit.type].symbol}
                        </span>
                      )}
                      {sys.surveyedByPlayer && stats.habitable > 0 && (
                        <span
                          title={`宜居星球 x${stats.habitable}`}
                          className={`px-1 rounded text-[9px] font-bold ${
                            stats.colonized > 0
                              ? 'bg-sky-500/30 text-sky-200'
                              : 'bg-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          ●{stats.habitable}
                        </span>
                      )}
                      {sys.anomalyDiscovered && (
                        <span title={sys.anomalyName} className="text-purple-300 text-[10px]">
                          ✦
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Hovered Fleet Route ETA Badge */}
                {hoveredSystemId === sys.id &&
                  selection?.type === 'fleet' &&
                  (() => {
                    const f = game.fleets[selection.id];
                    if (!f || f.ownerId !== game.playerEmpireId || f.systemId === sys.id) return null;
                    const path = findHyperlanePath(game.systems, f.systemId, sys.id);
                    if (!path || path.length === 0) return null;
                    const startSys = game.systems[f.systemId];
                    const usesGateway =
                      Boolean(startSys?.hasGateway && sys.hasGateway && path.length === 1 && !startSys.hyperlanes.includes(sys.id));
                    const estDays = Math.max(4, Math.round(path.length * 10));
                    return (
                      <div className="mt-0.5 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/70 text-amber-200 text-[9px] font-mono font-bold shadow-lg whitespace-nowrap">
                        {usesGateway
                          ? `◎ 星门瞬移 · 1 跳`
                          : `➜ ${path.length} 跳 · 约 ${estDays} 天`}
                      </div>
                    );
                  })()}

                {/* Surveyed Resource Summary Row */}
                {sys.surveyedByPlayer &&
                  (stats.energy > 0 || stats.minerals > 0 || stats.research > 0 || stats.alloys > 0) && (
                    <div className="mt-0.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-950/75 border border-slate-800/70 text-[10px] leading-none">
                      {stats.energy > 0 && (
                        <span className="text-amber-300">⚡{stats.energy}</span>
                      )}
                      {stats.minerals > 0 && (
                        <span className="text-rose-300">◆{stats.minerals}</span>
                      )}
                      {stats.research > 0 && (
                        <span className="text-sky-300">◈{stats.research}</span>
                      )}
                      {stats.alloys > 0 && (
                        <span className="text-purple-300">⬢{stats.alloys}</span>
                      )}
                      {sys.ownerId && stats.unbuilt === 0 && (
                        <span className="text-emerald-400 text-[9px]">✓</span>
                      )}
                    </div>
                  )}

                {/* Fleet badges in system */}
                {fleetsHere.length > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 flex-wrap justify-center">
                    {game.battles[sys.id] && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600/90 border border-rose-300 text-white animate-pulse">
                        ⚔ 激战中
                      </span>
                    )}
                    {fleetsHere.some((f) => f.leviathanId) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-900/90 border border-fuchsia-400 text-fuchsia-100">
                        🐉 利维坦
                      </span>
                    )}
                    {fleetsHere.map((f) => (
                      <button
                        key={f.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!f.isHostile) {
                            useGameStore.getState().setSelection({ type: 'fleet', id: f.id });
                          } else {
                            useGameStore.getState().setSelection({ type: 'system', id: sys.id });
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border cursor-pointer ${
                          f.isHostile
                            ? 'bg-rose-950/90 border-rose-500/80 text-rose-200'
                            : f.shipType === 'science'
                            ? 'bg-sky-950/90 border-sky-400/70 text-sky-200'
                            : f.shipType === 'construction'
                            ? 'bg-amber-950/90 border-amber-400/70 text-amber-200'
                            : 'bg-emerald-950/90 border-emerald-400/70 text-emerald-200'
                        }`}
                      >
                        {f.isHostile
                          ? `☠ 敌舰 ${f.power}`
                          : f.shipType === 'science'
                          ? '科研船'
                          : f.shipType === 'construction'
                          ? '工程船'
                          : `舰队 ${f.power}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {viewMode === 'system' && activeSystem && activeSystem.hyperlanes.map((nId) => {
          const nSys = game.systems[nId];
          if (!nSys) return null;
          return (
            <div
              key={`exit_${nId}`}
              ref={(el) => {
                if (el) exitLabelRefs.current.set(nId, el);
                else exitLabelRefs.current.delete(nId);
              }}
              style={{ display: 'none' }}
              onClick={(e) => {
                e.stopPropagation();
                useGameStore.getState().enterSystemView(nId);
              }}
              className="pointer-events-auto absolute top-0 left-0 cursor-pointer select-none"
            >
              <div className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-950/85 hover:bg-sky-900/90 border border-sky-400/50 text-sky-200 whitespace-nowrap shadow-lg transition-colors">
                ↗ {nSys.name}
              </div>
            </div>
          );
        })}

        {viewMode === 'system' && activeSystem && activeSystem.ownerId && (
          <div
            ref={starbaseLabelRef}
            style={{ display: 'none' }}
            onClick={(e) => {
              e.stopPropagation();
              useGameStore.getState().setSelection({ type: 'system', id: activeSystem.id });
            }}
            className="pointer-events-auto absolute top-0 left-0 flex-col items-center cursor-pointer select-none"
          >
            <div className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/90 border border-sky-400/70 text-sky-200 whitespace-nowrap shadow-[0_0_10px_rgba(56,189,248,0.3)] hover:bg-sky-900">
              ★ {activeSystem.starbaseLevel >= 2 ? '恒星星港 · 点击打开船坞' : '恒星前哨站'}
            </div>
          </div>
        )}

        {viewMode === 'system' &&
          activeSystem &&
          activeSystem.planets.map((planet) => {
            const pDef = PLANET_CLASSES[planet.planetClass];
            const isSelected = selection?.type === 'planet' && selection.id === planet.id;
            return (
              <div
                key={planet.id}
                ref={(el) => {
                  if (el) planetLabelRefs.current.set(planet.id, el);
                  else planetLabelRefs.current.delete(planet.id);
                }}
                style={{ display: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                  useGameStore.getState().setSelection({
                    type: 'planet',
                    id: planet.id,
                    systemId: activeSystem.id,
                  });
                }}
                className="pointer-events-auto absolute top-0 left-0 flex-col items-center cursor-pointer select-none"
              >
                <div
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] whitespace-nowrap border ${
                    planet.colonizedBy
                      ? 'bg-sky-950/90 border-sky-400/70 text-sky-100'
                      : planet.habitable
                      ? 'bg-emerald-950/85 border-emerald-400/60 text-emerald-100'
                      : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                  } ${isSelected ? 'ring-1 ring-amber-400' : ''}`}
                >
                  <span className="font-medium">{planet.name}</span>
                  <span className="text-[10px] opacity-75">{pDef.name}</span>
                  {planet.colonizedBy && (
                    <span className="text-[10px] text-sky-300 font-semibold">
                      人口 {planet.popCount}
                    </span>
                  )}
                </div>
                {planet.surveyed && planet.deposit && (
                  <div
                    className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] border ${
                      planet.stationType !== 'none'
                        ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950/80 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    {planet.deposit.type === 'energy' && `⚡ +${planet.deposit.amount}`}
                    {planet.deposit.type === 'minerals' && `◆ +${planet.deposit.amount}`}
                    {planet.deposit.type === 'research' && `◈ +${planet.deposit.amount}`}
                    {planet.deposit.type === 'alloys' && `⬢ +${planet.deposit.amount}`}
                    {planet.stationType !== 'none' ? ' (已开采)' : ''}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
