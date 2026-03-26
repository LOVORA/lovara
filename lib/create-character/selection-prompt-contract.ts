export type SelectionPromptGroup =
  | "identity"
  | "face"
  | "hair"
  | "body"
  | "outfit"
  | "scenario"
  | "personality"
  | "imageMood"
  | "hobbies"
  | "fetishes"
  | "extraPersonality"
  | "extraPhysical";

export type SelectionPromptContract = {
  identity: string[];
  face: string[];
  hair: string[];
  body: string[];
  outfit: string[];
  scenario: string[];
  personality: string[];
  imageMood: string[];
  hobbies: string[];
  fetishes: string[];
  extraPersonality: string[];
  extraPhysical: string[];
  promptSummary: string[];
};
