import type {
  CharacterImagePromptInput,
  GeneratedImageCandidate,
} from "@/lib/image-generation/types";

export type CandidateJudgeDecision = "accept" | "soft_reject" | "reject";

export type CandidateJudgeReport = {
  candidateId: string;
  score: number;
  decision: CandidateJudgeDecision;
  flags: string[];
};

export type BatchJudgeSummary = {
  judgeVersion: string;
  retryCount: number;
  bestCandidateId: string | null;
  bestScore: number | null;
  shouldRetry: boolean;
  bestAvailable: boolean;
  reports: CandidateJudgeReport[];
};

const JUDGE_VERSION = "quality_judge_v1";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildKeywordSet(value: string | null | undefined) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function bodyKeywords(input: CharacterImagePromptInput) {
  return [
    ...buildKeywordSet(input.bodyType),
    ...buildKeywordSet(input.bustSize),
    ...buildKeywordSet(input.breastType),
    ...buildKeywordSet(input.buttSize),
    ...buildKeywordSet(input.waistDefinition),
  ];
}

function realismKeywords(input: CharacterImagePromptInput) {
  return [
    ...buildKeywordSet(input.avatarStyle),
    ...buildKeywordSet(input.photoPack),
    ...buildKeywordSet(input.lightingMood),
    "realistic",
    "photo",
    "natural",
  ];
}

function summarizeDecision(score: number): CandidateJudgeDecision {
  if (score >= 72) return "accept";
  if (score >= 58) return "soft_reject";
  return "reject";
}

export function evaluateGeneratedCandidate(args: {
  candidate: GeneratedImageCandidate;
  promptInput: CharacterImagePromptInput;
  outputType?: "upper_body" | "full_body" | "selfie" | null;
}): CandidateJudgeReport {
  const candidateText = normalize(
    [
      args.candidate.prompt,
      args.promptInput.pose,
      args.promptInput.sceneNote,
      args.promptInput.camera,
      args.promptInput.photoPack,
    ]
      .filter(Boolean)
      .join(" "),
  );

  let score = 100;
  const flags: string[] = [];

  const portraitRisk = includesAny(candidateText, [
    "portrait",
    "headshot",
    "passport",
    "close-up",
    "close crop",
    "shoulders-only",
    "face-only",
  ]);

  if (portraitRisk) {
    score -= 40;
    flags.push("portrait_risk");
  }

  if (args.outputType !== "selfie") {
    const genericBodyRead = includesAny(candidateText, [
      "upper-body",
      "upper body",
      "full-body",
      "full body",
      "torso",
      "waist",
      "hips",
      "silhouette",
      "legs",
      "stomach line",
    ]);

    if (!genericBodyRead) {
      score -= 24;
      flags.push("weak_body_read");
    }
  }

  if (args.outputType === "full_body") {
    const fullBodyRead = includesAny(candidateText, [
      "full-body",
      "full body",
      "full silhouette",
      "legs",
      "hips",
      "waist",
    ]);

    if (!fullBodyRead) {
      score -= 18;
      flags.push("full_body_not_reinforced");
    }
  }

  if (args.outputType === "upper_body") {
    const upperBodyRead = includesAny(candidateText, [
      "upper-body",
      "upper body",
      "torso",
      "waist",
      "hips",
      "stomach line",
      "hip line",
    ]);

    if (!upperBodyRead) {
      score -= 16;
      flags.push("upper_body_not_reinforced");
    }
  }

  if (args.promptInput.outfit) {
    const outfitKeys = buildKeywordSet(args.promptInput.outfit);
    if (outfitKeys.length > 0 && !includesAny(candidateText, outfitKeys)) {
      score -= 12;
      flags.push("outfit_not_reinforced");
    }
  }

  const bodyKeys = bodyKeywords(args.promptInput);
  if (bodyKeys.length > 0 && !includesAny(candidateText, bodyKeys)) {
    score -= 12;
    flags.push("body_not_reinforced");
  }

  if (args.promptInput.poseContract) {
    const poseKeys = [
      ...buildKeywordSet(args.promptInput.poseContract.poseFamily),
      ...buildKeywordSet(args.promptInput.poseContract.bodyLinePrompt),
      ...buildKeywordSet(args.promptInput.poseContract.cropDiscipline),
    ];
    if (poseKeys.length > 0 && !includesAny(candidateText, poseKeys)) {
      score -= 14;
      flags.push("pose_not_reinforced");
    }
  }

  if (args.promptInput.faceBias === "soft_feminine") {
    if (!includesAny(candidateText, ["soft", "feminine", "gentle", "smooth"])) {
      score -= 10;
      flags.push("soft_feminine_not_reinforced");
    }
  }

  if (!includesAny(candidateText, realismKeywords(args.promptInput))) {
    score -= 10;
    flags.push("weak_realism_signal");
  }

  if (
    args.promptInput.selectionContractSummary?.length &&
    !includesAny(
      candidateText,
      args.promptInput.selectionContractSummary.flatMap((line) => buildKeywordSet(line)),
    )
  ) {
    score -= 10;
    flags.push("contract_summary_not_reinforced");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    candidateId: args.candidate.tempId,
    score,
    decision: summarizeDecision(score),
    flags,
  };
}

export function scoreBatchAndDecideRetry(args: {
  candidates: GeneratedImageCandidate[];
  promptInput: CharacterImagePromptInput;
  retryCount: number;
  maxRetries: number;
  outputType?: "upper_body" | "full_body" | "selfie" | null;
}): BatchJudgeSummary {
  const reports = args.candidates.map((candidate) =>
    evaluateGeneratedCandidate({
      candidate,
      promptInput: args.promptInput,
      outputType: args.outputType ?? null,
    }),
  );

  const best = reports
    .slice()
    .sort((left, right) => right.score - left.score)[0] ?? null;
  const acceptedCount = reports.filter((report) => report.decision === "accept").length;
  const hardRejectBest = Boolean(
    best &&
      best.flags.some((flag) =>
        [
          "portrait_risk",
          "weak_body_read",
          "full_body_not_reinforced",
          "upper_body_not_reinforced",
        ].includes(flag),
      ),
  );
  const shouldRetry =
    (acceptedCount === 0 || hardRejectBest) &&
    Boolean(best && best.score < 82) &&
    args.retryCount < args.maxRetries;

  return {
    judgeVersion: JUDGE_VERSION,
    retryCount: args.retryCount,
    bestCandidateId: best?.candidateId ?? null,
    bestScore: best?.score ?? null,
    shouldRetry,
    bestAvailable: acceptedCount === 0,
    reports,
  };
}
