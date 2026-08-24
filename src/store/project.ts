import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeMassing } from "@/lib/building/calculate";
import type { OsmBuilding } from "@/lib/building/geo";
import { maxAptsFor, resolveProgram } from "@/lib/building/layout";
import type { AddressLookupResult } from "@/lib/building/lookup";
import { DEFAULT_INPUTS } from "@/lib/building/presets";
import type { ExtraRoom, FloorProgram, MassingResult, ProjectInputs, RoomKind, SavedStudy, ViewMode } from "@/lib/building/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function mergeInputs(partial: Partial<ProjectInputs> | ProjectInputs): ProjectInputs {
  return { ...DEFAULT_INPUTS, ...partial, floorPrograms: { ...(partial.floorPrograms ?? {}) } };
}

type ProjectState = {
  inputs: ProjectInputs;
  name: string;
  addressQuery: string;
  lookup: AddressLookupResult | null;
  studies: SavedStudy[];
  activeId: string | null;
  dirty: boolean;
  view: ViewMode;
  autoRotate: boolean;
  explode: boolean;
  panelOpen: boolean;
  selectedFloor: number | null;
  selectedUnitId: string | null;
  setInput: <K extends keyof ProjectInputs>(key: K, value: ProjectInputs[K]) => void;
  patchInputs: (patch: Partial<ProjectInputs>) => void;
  applyPreset: (inputs: ProjectInputs, name?: string) => void;
  setName: (name: string) => void;
  setAddressQuery: (q: string) => void;
  setLookup: (r: AddressLookupResult | null) => void;
  applyOsmBuilding: (b: OsmBuilding, label?: string) => void;
  ingestAddress: (r: AddressLookupResult) => void;
  setFloorCount: (habIndex: number, count: number, plateArea: number) => void;
  setFloorArea: (habIndex: number, unitIndex: number, m2: number, plateArea: number) => void;
  equalizeFloor: (habIndex: number, plateArea: number) => void;
  setUnitBedrooms: (habIndex: number, unitIndex: number, n: number, plateArea: number) => void;
  addUnitRoom: (habIndex: number, unitIndex: number, kind: RoomKind, plateArea: number) => void;
  removeUnitRoom: (habIndex: number, unitIndex: number, extraIndex: number, plateArea: number) => void;
  setView: (view: ViewMode) => void;
  setAutoRotate: (v: boolean) => void;
  setExplode: (v: boolean) => void;
  setPanelOpen: (v: boolean) => void;
  setSelectedFloor: (n: number | null) => void;
  setSelectedUnitId: (id: string | null) => void;
  saveStudy: () => void;
  loadStudy: (id: string) => void;
  deleteStudy: (id: string) => void;
  newStudy: () => void;
};

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => ({
      inputs: DEFAULT_INPUTS,
      name: "Κυψέλη 12×22",
      addressQuery: "",
      lookup: null,
      studies: [],
      activeId: null,
      dirty: true,
      view: "iso",
      autoRotate: false,
      explode: false,
      panelOpen: false,
      selectedFloor: null,
      selectedUnitId: null,
      setInput: (key, value) =>
        set((s) => {
          const inputs = { ...s.inputs, [key]: value };
          if (key === "aptsPerFloor") inputs.floorPrograms = {};
          return { inputs, dirty: true };
        }),
      patchInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch }, dirty: true })),
      applyPreset: (inputs, name) =>
        set({ inputs: mergeInputs(inputs), name: name ?? "Νέα μελέτη", dirty: true, view: "iso", selectedFloor: null, selectedUnitId: null, explode: false, lookup: null }),
      setName: (name) => set({ name, dirty: true }),
      setAddressQuery: (addressQuery) => set({ addressQuery }),
      setLookup: (lookup) => set({ lookup }),
      ingestAddress: (result) => {
        const b = result.building ?? result.candidates[0] ?? null;
        const t = result.officialTerms;
        set((s) => {
          const inputs = { ...s.inputs };
          if (b) {
            inputs.plotWidth = clamp(Math.round((b.width || 12) * 2) / 2, 6, 60);
            inputs.plotDepth = clamp(Math.round((b.depth || 18) * 2) / 2, 8, 80);
          }
          if (t?.far) inputs.far = clamp(t.far, 0.1, 8);
          if (t?.coverage) inputs.coverage = clamp(t.coverage, 0.15, 0.9);
          if (t?.maxHeight) inputs.maxHeight = clamp(Math.round(t.maxHeight * 2) / 2, 7, 40);
          if (t?.system) {
            inputs.system = t.system;
            if (t.system === "continuous") {
              inputs.sideSetback = 0;
              inputs.frontSetback = 0;
            }
          }
          return { lookup: result, inputs, name: result.place?.label || s.name, dirty: true, explode: false, selectedFloor: null };
        });
      },
      applyOsmBuilding: (b, label) => {
        const front = b.width || 12;
        const depth = b.depth || 18;
        const osmH = b.height && b.height >= 6 ? b.height : b.levels && b.levels >= 2 ? b.levels * 3 : null;
        set((s) => ({
          inputs: { ...s.inputs, plotWidth: clamp(Math.round(front * 2) / 2, 6, 60), plotDepth: clamp(Math.round(depth * 2) / 2, 8, 80), ...(osmH ? { maxHeight: clamp(Math.round(osmH * 2) / 2, 7, 32) } : {}) },
          name: label || s.name, dirty: true, explode: false, selectedFloor: null,
          lookup: s.lookup ? { ...s.lookup, building: b } : s.lookup,
        }));
      },
      setFloorCount: (habIndex, count, plateArea) => {
        const max = maxAptsFor(plateArea);
        const n = clamp(Math.round(count), 1, max);
        const net = plateArea * 0.84;
        const equal = Math.round((net / n) * 10) / 10;
        const key = String(habIndex);
        set((s) => {
          const prev = s.inputs.floorPrograms[key];
          const areas = Array.from({ length: n }, (_, i) => (prev?.areas[i] && prev.areas[i] >= 28 ? prev.areas[i] : equal));
          const program: FloorProgram = { count: n, areas, bedrooms: prev?.bedrooms?.slice(0, n), extras: prev?.extras?.slice(0, n) };
          return { inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms, [key]: program } }, dirty: true, explode: true };
        });
      },
      setFloorArea: (habIndex, unitIndex, m2, plateArea) => {
        const key = String(habIndex);
        set((s) => {
          const resolved = resolveProgram(s.inputs, habIndex, plateArea);
          const areas = resolved.areas.slice();
          areas[unitIndex] = clamp(m2, 28, plateArea * 0.84);
          const program: FloorProgram = { count: resolved.count, areas, bedrooms: resolved.bedrooms, extras: resolved.extras };
          return { inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms, [key]: program } }, dirty: true, explode: true };
        });
      },
      equalizeFloor: (habIndex, plateArea) => {
        const key = String(habIndex);
        set((s) => {
          const resolved = resolveProgram(s.inputs, habIndex, plateArea);
          const equal = Math.round(((plateArea * 0.84) / resolved.count) * 10) / 10;
          const program: FloorProgram = { count: resolved.count, areas: Array.from({ length: resolved.count }, () => equal), bedrooms: resolved.bedrooms, extras: resolved.extras };
          return { inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms, [key]: program } }, dirty: true, explode: true };
        });
      },
      setUnitBedrooms: (habIndex, unitIndex, n, plateArea) => {
        const key = String(habIndex);
        set((s) => {
          const resolved = resolveProgram(s.inputs, habIndex, plateArea);
          const bedrooms: number[] = Array.from({ length: resolved.count }, (_, i) => resolved.bedrooms?.[i] ?? -1);
          bedrooms[unitIndex] = clamp(Math.round(n), 0, 4);
          const program: FloorProgram = { ...resolved, bedrooms };
          return { inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms, [key]: program } }, dirty: true, explode: true };
        });
      },
      addUnitRoom: (habIndex, unitIndex, kind, plateArea) => {
        const sizes: Record<RoomKind, [number, number]> = { living: [4, 3.6], kitchen: [2.8, 3], bed: [3.2, 3.4], bath: [1.8, 2.2], shop: [4, 4], storage: [2, 2.2] };
        const key = String(habIndex);
        set((s) => {
          const resolved = resolveProgram(s.inputs, habIndex, plateArea);
          const extras: ExtraRoom[][] = Array.from({ length: resolved.count }, (_, i) => (resolved.extras?.[i] ?? []).slice());
          const [width, depth] = sizes[kind];
          extras[unitIndex] = [...(extras[unitIndex] ?? []), { kind, width, depth }];
          const program: FloorProgram = { ...resolved, extras };
          return { inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms, [key]: program } }, dirty: true, explode: true };
        });
      },
      removeUnitRoom: (habIndex, unitIndex, extraIndex, plateArea) => {
        const key = String(habIndex);
        set((s) => {
          const resolved = resolveProgram(s.inputs, habIndex, plateArea);
          const extras: ExtraRoom[][] = Array.from({ length: resolved.count }, (_, i) => (resolved.extras?.[i] ?? []).slice());
          extras[unitIndex] = (extras[unitIndex] ?? []).filter((_, i) => i !== extraIndex);
          const program: FloorProgram = { ...resolved, extras };
          return { inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms, [key]: program } }, dirty: true, explode: true };
        });
      },
      setView: (view) => set({ view }),
      setAutoRotate: (autoRotate) => set({ autoRotate }),
      setExplode: (explode) => set({ explode, selectedFloor: explode ? get().selectedFloor : null }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setSelectedFloor: (selectedFloor) =>
        set((s) => ({ selectedFloor, selectedUnitId: selectedFloor === null ? null : s.selectedUnitId, explode: selectedFloor !== null && selectedFloor < 0 ? false : selectedFloor !== null ? true : s.explode })),
      setSelectedUnitId: (selectedUnitId) => set({ selectedUnitId }),
      saveStudy: () => {
        const s = get();
        const id = s.activeId ?? uid();
        const name = s.name.trim() || "Μελέτη";
        const record: SavedStudy = { id, name, savedAt: Date.now(), inputs: { ...s.inputs, floorPrograms: { ...s.inputs.floorPrograms } }, address: s.addressQuery || undefined };
        const studies = s.activeId ? s.studies.map((st) => (st.id === id ? record : st)) : [record, ...s.studies].slice(0, 24);
        set({ studies, activeId: id, name, dirty: false });
      },
      loadStudy: (id) => {
        const st = get().studies.find((x) => x.id === id);
        if (!st) return;
        set({ inputs: mergeInputs(st.inputs), name: st.name, addressQuery: st.address ?? "", lookup: null, activeId: st.id, dirty: false, view: "iso", selectedFloor: null, selectedUnitId: null, explode: false });
      },
      deleteStudy: (id) => set((s) => ({ studies: s.studies.filter((st) => st.id !== id), activeId: s.activeId === id ? null : s.activeId })),
      newStudy: () => set({ inputs: { ...DEFAULT_INPUTS, floorPrograms: {} }, name: "Νέα μελέτη", addressQuery: "", lookup: null, activeId: null, dirty: true, view: "iso", selectedFloor: null, selectedUnitId: null, explode: false }),
    }),
    {
      name: "ogkos-project-v5",
      partialize: (s) => ({ inputs: s.inputs, name: s.name, studies: s.studies, activeId: s.activeId, dirty: s.dirty }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ProjectState> | undefined;
        if (!p) return current;
        return { ...current, ...p, inputs: mergeInputs(p.inputs ?? {}), studies: (p.studies ?? current.studies).map((st) => ({ ...st, inputs: mergeInputs(st.inputs) })) };
      },
      skipHydration: true,
    },
  ),
);

let massingCache: { inputs: ProjectInputs; result: MassingResult } | null = null;

export function useMassing(): MassingResult {
  const inputs = useProject((s) => s.inputs);
  return useMemo(() => {
    if (massingCache?.inputs === inputs) return massingCache.result;
    const result = computeMassing(mergeInputs(inputs));
    massingCache = { inputs, result };
    return result;
  }, [inputs]);
}
