import type { ComponentType } from "react";
import type { SceneContext } from "../Frame";
import { Example } from "./example";

export type CustomSceneProps = { context: SceneContext; props: Record<string, unknown> };

export const customScenes: Record<string, ComponentType<CustomSceneProps>> = {
  example: Example,
};
