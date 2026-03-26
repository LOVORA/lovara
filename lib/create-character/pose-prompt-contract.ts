import type {
  AvatarFramingBias,
  AvatarPoseFamily,
} from "@/lib/avatar-pose-library";

export type PosePromptContract = {
  poseFamily: AvatarPoseFamily | "custom" | "generic";
  posePrompt: string;
  bodyLinePrompt: string;
  framingBias: AvatarFramingBias;
  cropDiscipline: string;
  gazeDirection: string;
  handLanguage: string;
  posePriority: "high";
};
