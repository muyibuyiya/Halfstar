// Fleet activity labels derived from the order queue.
//
// `fleet.statusText` is only refreshed while the simulation is running, so a
// paused game (or a freshly loaded save) would otherwise keep showing a stale
// 「待命」even though the ship is already flying off to build something. These
// helpers compute the label straight from `fleet.orders`, which is always the
// source of truth.

import { Fleet, StarSystem } from '../types/game';

const pct = (v: number) => Math.min(100, Math.round(v));

export function fleetStatusLabel(
  fleet: Fleet,
  systems: Record<string, StarSystem>
): string {
  if (fleet.inTransit && fleet.transitToId) {
    return `超空间航行 → ${systems[fleet.transitToId]?.name ?? '未知星系'}`;
  }

  const next = fleet.orders[0];
  if (!next) {
    if (fleet.autoSurvey) return '自动探索待命';
    if (fleet.autoBuild) return '自动建设待命';
    return fleet.shipType === 'corvette' ? '轨道巡逻' : '待命';
  }

  const target = systems[next.targetSystemId]?.name ?? '未知星系';
  const suffix = fleet.orders.length > 1 ? ` · 队列 ${fleet.orders.length} 项` : '';

  switch (next.type) {
    case 'move': {
      const jumps = Math.max(0, next.path.length - 1);
      return `航行前往 ${target}${jumps > 0 ? `（${jumps} 跳）` : ''}${suffix}`;
    }
    case 'survey':
      return next.progress > 0
        ? `调查 ${target} (${pct(next.progress)}%)${suffix}`
        : `前往调查 ${target}${suffix}`;
    case 'build_outpost':
      return next.progress > 0
        ? `建造前哨站：${target} (${pct(next.progress)}%)${suffix}`
        : `前往建造前哨站：${target}${suffix}`;
    case 'build_stations': {
      const label = next.stationKind === 'mining' ? '开采站' : '科研站';
      return next.progress > 0
        ? `建造${label}：${target} (${pct(next.progress)}%)${suffix}`
        : `前往建造${label}：${target}${suffix}`;
    }
    default:
      return fleet.statusText;
  }
}

/** True when this empire already has a construction ship building the system. */
export function hasOutpostOrderFor(
  fleets: Record<string, Fleet>,
  empireId: string,
  systemId: string
): boolean {
  return Object.values(fleets).some(
    (f) =>
      f.ownerId === empireId &&
      f.orders.some((o) => o.type === 'build_outpost' && o.targetSystemId === systemId)
  );
}
