// Slot + block registry. Children call registerSlot/registerBlock to override
// parent components without forking the engine.

import { type ComponentType, createElement, type ReactNode } from "react";

type SlotKey = string;

const slotRegistry = new Map<SlotKey, ComponentType<Record<string, unknown>>>();
const blockRegistry = new Map<string, ComponentType<Record<string, unknown>>>();

export function registerSlot(name: SlotKey, component: ComponentType<Record<string, unknown>>) {
  slotRegistry.set(name, component);
}

export function unregisterSlot(name: SlotKey) {
  slotRegistry.delete(name);
}

export function getSlot(name: SlotKey): ComponentType<Record<string, unknown>> | null {
  return slotRegistry.get(name) || null;
}

export function Slot({
  name,
  fallback,
  ...props
}: { name: SlotKey; fallback?: ReactNode } & Record<string, unknown>): ReactNode {
  const Comp = slotRegistry.get(name);
  if (!Comp) return fallback ?? null;
  return createElement(Comp, props);
}

export function registerBlock(type: string, component: ComponentType<Record<string, unknown>>) {
  blockRegistry.set(type, component);
}

export function getBlockRenderer(type: string): ComponentType<Record<string, unknown>> | null {
  return blockRegistry.get(type) || null;
}

export function listRegisteredSlots(): string[] { return Array.from(slotRegistry.keys()); }
export function listRegisteredBlocks(): string[] { return Array.from(blockRegistry.keys()); }
