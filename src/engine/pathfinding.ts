import { StarSystem } from '../types/game';

/**
 * Finds the shortest hyperlane path from startId to goalId (inclusive of goalId, exclusive of startId).
 * Returns null if unreachable.
 */
export function findHyperlanePath(
  systems: Record<string, StarSystem>,
  startId: string,
  goalId: string
): string[] | null {
  if (startId === goalId) return [];
  if (!systems[startId] || !systems[goalId]) return null;

  const visited = new Set<string>([startId]);
  const parent: Record<string, string> = {};
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const sys = systems[current];
    if (!sys) continue;

    const neighbors = [...sys.hyperlanes];
    // Cross-galaxy Gateway 1-hop teleport between owned gateways
    if (sys.hasGateway && sys.ownerId) {
      for (const other of Object.values(systems)) {
        if (other.id !== current && other.hasGateway && other.ownerId === sys.ownerId) {
          neighbors.push(other.id);
        }
      }
    }

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent[neighbor] = current;
      if (neighbor === goalId) {
        const path: string[] = [];
        let node: string | undefined = goalId;
        while (node && node !== startId) {
          path.push(node);
          node = parent[node];
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }

  return null;
}

/**
 * Returns hop distance from any system owned by empireId to targetSystemId.
 */
export function getMinJumpsFromEmpire(
  systems: Record<string, StarSystem>,
  empireId: string,
  targetSystemId: string
): number {
  const visited = new Set<string>();
  const queue: Array<{ id: string; dist: number }> = [];

  for (const sys of Object.values(systems)) {
    if (sys.ownerId === empireId) {
      if (sys.id === targetSystemId) return 0;
      visited.add(sys.id);
      queue.push({ id: sys.id, dist: 0 });
    }
  }

  while (queue.length > 0) {
    const { id, dist } = queue.shift()!;
    const sys = systems[id];
    if (!sys) continue;
    const neighbors = [...sys.hyperlanes];
    // Cross-galaxy Gateway 1-hop teleport between owned gateways
    if (sys.hasGateway && sys.ownerId) {
      for (const other of Object.values(systems)) {
        if (other.id !== id && other.hasGateway && other.ownerId === sys.ownerId) {
          neighbors.push(other.id);
        }
      }
    }

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      if (neighbor === targetSystemId) return dist + 1;
      visited.add(neighbor);
      queue.push({ id: neighbor, dist: dist + 1 });
    }
  }

  return 99;
}

/**
 * Finds the nearest unsurveyed system reachable from startId.
 */
export function findNearestUnsurveyedSystem(
  systems: Record<string, StarSystem>,
  startId: string,
  excludedTargets: Set<string>
): { systemId: string; path: string[] } | null {
  const visited = new Set<string>([startId]);
  const parent: Record<string, string> = {};
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const sys = systems[current];
    if (!sys) continue;

    if (current !== startId && !sys.surveyedByPlayer && !excludedTargets.has(current)) {
      const path: string[] = [];
      let node: string | undefined = current;
      while (node && node !== startId) {
        path.push(node);
        node = parent[node];
      }
      return { systemId: current, path: path.reverse() };
    }

    const neighbors = [...sys.hyperlanes];
    // Cross-galaxy Gateway 1-hop teleport between owned gateways
    if (sys.hasGateway && sys.ownerId) {
      for (const other of Object.values(systems)) {
        if (other.id !== current && other.hasGateway && other.ownerId === sys.ownerId) {
          neighbors.push(other.id);
        }
      }
    }

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent[neighbor] = current;
      queue.push(neighbor);
    }
  }

  return null;
}
