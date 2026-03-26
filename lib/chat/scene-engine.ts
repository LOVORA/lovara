import type {
  ConversationMemoryState,
  MemoryChatMessage,
  SceneLedgerState,
} from "@/lib/conversation-memory";
import type { IntimacyGateDecision } from "@/lib/chat/intimacy-engine";

export type SceneMove =
  | "observe"
  | "test"
  | "withhold"
  | "reveal"
  | "repair"
  | "redirect"
  | "approach"
  | "hold_line"
  | "invite"
  | "exit_pressure";

type RealismLikeProfile = {
  initiativeStyle?: "leads-often" | "shared" | "selective";
  silenceTolerance?: "low" | "medium" | "high";
  deflectionHabit?: "low" | "medium" | "high";
  statusSensitivity?: "low" | "medium" | "high";
  conversationTexture?: "clean" | "layered" | "volatile";
  pushbackStyle?: "direct" | "quiet" | "conflicted" | "cool";
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function defaultSceneLedger(): SceneLedgerState {
  return {
    locationFrame: "private conversational frame",
    privacyLevel: 50,
    distanceState: "ambient-presence",
    touchState: "no direct touch",
    currentBeat: "live scene continuation",
    activeRisk: "guarded emotional escalation",
    lastPowerShift: "no clear shift",
    topicPressure: "staying emotionally precise",
    whatChangedLastTurn: "the emotional weather shifted slightly",
    pendingEmotionalThread: "the next emotional beat",
  };
}

export function readSceneLedger(
  memoryState?: ConversationMemoryState | null,
): SceneLedgerState {
  const direct = toRecord(memoryState?.sceneLedger);
  const facts = toRecord(memoryState?.memoryFacts);
  const legacy = toRecord(facts.scene_ledger);
  const relationship = toRecord(memoryState?.relationshipState);
  const merged = toRecord({
    ...defaultSceneLedger(),
    ...legacy,
    ...direct,
    ...toRecord(relationship.scene_ledger),
  });

  return {
    locationFrame:
      typeof merged.locationFrame === "string"
        ? clean(merged.locationFrame)
        : typeof merged.location_frame === "string"
          ? clean(merged.location_frame)
          : defaultSceneLedger().locationFrame,
    privacyLevel:
      readNumber(merged.privacyLevel) ??
      readNumber(merged.privacy_level) ??
      defaultSceneLedger().privacyLevel,
    distanceState:
      typeof merged.distanceState === "string"
        ? clean(merged.distanceState)
        : typeof merged.distance_state === "string"
          ? clean(merged.distance_state)
          : defaultSceneLedger().distanceState,
    touchState:
      typeof merged.touchState === "string"
        ? clean(merged.touchState)
        : typeof merged.touch_state === "string"
          ? clean(merged.touch_state)
          : defaultSceneLedger().touchState,
    currentBeat:
      typeof merged.currentBeat === "string"
        ? clean(merged.currentBeat)
        : typeof merged.current_beat === "string"
          ? clean(merged.current_beat)
          : defaultSceneLedger().currentBeat,
    activeRisk:
      typeof merged.activeRisk === "string"
        ? clean(merged.activeRisk)
        : typeof merged.active_risk === "string"
          ? clean(merged.active_risk)
          : defaultSceneLedger().activeRisk,
    lastPowerShift:
      typeof merged.lastPowerShift === "string"
        ? clean(merged.lastPowerShift)
        : typeof merged.last_power_shift === "string"
          ? clean(merged.last_power_shift)
          : defaultSceneLedger().lastPowerShift,
    topicPressure:
      typeof merged.topicPressure === "string"
        ? clean(merged.topicPressure)
        : typeof merged.topic_pressure === "string"
          ? clean(merged.topic_pressure)
          : defaultSceneLedger().topicPressure,
    whatChangedLastTurn:
      typeof merged.whatChangedLastTurn === "string"
        ? clean(merged.whatChangedLastTurn)
        : typeof merged.what_changed_last_turn === "string"
          ? clean(merged.what_changed_last_turn)
          : defaultSceneLedger().whatChangedLastTurn,
    pendingEmotionalThread:
      typeof merged.pendingEmotionalThread === "string"
        ? clean(merged.pendingEmotionalThread)
        : typeof merged.pending_emotional_thread === "string"
          ? clean(merged.pending_emotional_thread)
          : defaultSceneLedger().pendingEmotionalThread,
  };
}

export function chooseSceneMove(args: {
  lastIntent: string;
  memoryState?: ConversationMemoryState | null;
  realismProfile?: RealismLikeProfile;
  intimacyDecision?: IntimacyGateDecision;
}): {
  move: SceneMove;
  reason: string;
  expectedConsequence: string;
} {
  const { lastIntent, memoryState, realismProfile, intimacyDecision } = args;
  const ledger = readSceneLedger(memoryState);
  const relationship = toRecord(memoryState?.relationshipState);
  const unresolved =
    readNumber(relationship.friction_level) ??
    readNumber(toRecord(memoryState?.conflictState).unresolvedConflict) ??
    0;
  const scenePressure =
    readNumber(relationship.scene_pressure) ??
    readNumber(toRecord(memoryState?.bondState).tension) ??
    0;
  const initiative = realismProfile?.initiativeStyle ?? "leads-often";
  const intent = lastIntent.toLocaleLowerCase("en");

  if (intimacyDecision?.decision === "repair_first" || intent === "repair") {
    return {
      move: "repair",
      reason: "the scene still has damage in it and the next believable move is careful repair",
      expectedConsequence: "the bruise is named and warmth can return slowly",
    };
  }

  if (intimacyDecision?.decision === "decline") {
    return {
      move: "hold_line",
      reason: "permission is not there and the character should protect the line instead of rewarding pressure",
      expectedConsequence: "the user feels the resistance and the scene keeps its realism",
    };
  }

  if (intent === "pressure-for-intimacy") {
    return {
      move: "redirect",
      reason: "the pace was pushed, so the character should redirect into role, pressure, or consequence",
      expectedConsequence: "chemistry stays alive without giving the moment away",
    };
  }

  if (intent === "confession") {
    return {
      move:
        ledger.activeRisk.includes("rupture") || unresolved >= 52 ? "withhold" : "reveal",
      reason: "confession scenes feel real when truth comes with cost, delay, or careful release",
      expectedConsequence: "the scene crosses into honesty without turning fully neat",
    };
  }

  if (intent === "jealousy") {
    return {
      move: initiative === "leads-often" ? "test" : "hold_line",
      reason: "jealousy reads best as pointed pressure, not broad reassurance",
      expectedConsequence: "the power balance sharpens and the subtext becomes harder to ignore",
    };
  }

  if (intent === "ambivalent") {
    return {
      move: "observe",
      reason: "mixed signals need to be read before they are answered literally",
      expectedConsequence: "the hesitation becomes part of the scene instead of being flattened",
    };
  }

  if (intent === "withdrawal") {
    return {
      move: "exit_pressure",
      reason: "when the user pulls back, the scene needs space before another push",
      expectedConsequence: "distance is respected without collapsing the emotional thread",
    };
  }

  if (intent === "greeting") {
    return {
      move: initiative === "selective" ? "observe" : "approach",
      reason: "arrival beats should open scene energy, not default to generic questions",
      expectedConsequence: "the character enters first and sets the room",
    };
  }

  if (scenePressure >= 58) {
    return {
      move: "test",
      reason: "high pressure scenes need a pointed move instead of soft generality",
      expectedConsequence: "the next beat gains charge and direction",
    };
  }

  if (initiative === "leads-often") {
    return {
      move: "invite",
      reason: "this character should carry the scene forward with a specific hook",
      expectedConsequence: "the user gets pulled deeper into the same live scene",
    };
  }

  if (ledger.distanceState === "distance-held") {
    return {
      move: "approach",
      reason: "distance is part of the tension, so the next move should narrow it carefully",
      expectedConsequence: "proximity changes without breaking plausibility",
    };
  }

  return {
    move: "observe",
    reason: "the safest strong move is a scene read that still changes the beat",
    expectedConsequence: "the line feels caused by this exact moment",
  };
}

export function buildSceneLedgerDirectives(
  memoryState?: ConversationMemoryState | null,
): string[] {
  const ledger = readSceneLedger(memoryState);

  return [
    "ACTIVE SCENE LEDGER",
    `Location frame: ${ledger.locationFrame}.`,
    `Privacy level: ${ledger.privacyLevel}/100.`,
    `Distance state: ${ledger.distanceState}.`,
    `Touch state: ${ledger.touchState}.`,
    `Current beat: ${ledger.currentBeat}.`,
    `Active risk: ${ledger.activeRisk}.`,
    `Last power shift: ${ledger.lastPowerShift}.`,
    `Topic pressure: ${ledger.topicPressure}.`,
    `What changed last turn: ${ledger.whatChangedLastTurn}.`,
    `Pending emotional thread: ${ledger.pendingEmotionalThread}.`,
  ];
}

export function buildSharedReplyPlannerLines(args: {
  messages: MemoryChatMessage[];
  lastIntent: string;
  memoryState?: ConversationMemoryState | null;
  intimacyDecision?: IntimacyGateDecision;
  realismProfile?: RealismLikeProfile;
  characterName?: string;
}): string[] {
  const { messages, lastIntent, memoryState, intimacyDecision, realismProfile, characterName } = args;
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const sceneMove = chooseSceneMove({
    lastIntent,
    memoryState,
    realismProfile,
    intimacyDecision,
  });
  const ledger = readSceneLedger(memoryState);
  const relationship = toRecord(memoryState?.relationshipState);
  const tone = toRecord(memoryState?.toneState);

  return [
    "REPLY PLANNER",
    `Last user intent: ${lastIntent}.`,
    lastUserMessage ? `Last user message: ${clean(lastUserMessage.content)}` : "",
    characterName ? `Write as ${characterName}.` : "",
    typeof relationship.stage === "string"
      ? `Current relationship stage: ${relationship.stage}`
      : "",
    typeof tone.reply_strategy === "string"
      ? `Reply strategy: ${tone.reply_strategy}`
      : "",
    typeof tone.next_scene_move === "string"
      ? `Memory next-scene hint: ${tone.next_scene_move}`
      : "",
    intimacyDecision
      ? `Intimacy gate: ${intimacyDecision.decision.replaceAll("_", " ")}`
      : "",
    `Scene move for this turn: ${sceneMove.move}.`,
    `Why this move fits: ${sceneMove.reason}.`,
    `Expected consequence: ${sceneMove.expectedConsequence}.`,
    `Keep the move inside this beat: ${ledger.currentBeat}.`,
    `Honor this live risk: ${ledger.activeRisk}.`,
    "Write the reply in this order:",
    "1. Read what was actually triggered, not just the literal wording.",
    "2. Open with the scene move, not filler.",
    "3. Use one concrete anchor from the room, distance, body language, or risk.",
    "4. Show one believable emotional read from the character's side.",
    "5. Let one hidden layer stay alive: restraint, pride, hesitation, jealousy, or withheld warmth.",
    "6. Create one consequence so the scene actually changes after this line.",
    "7. End on a hook that belongs to the move, not on a broad conversational question.",
  ].filter(Boolean);
}

export function buildSharedSelfCheckLines(args: {
  lastIntent: string;
  memoryState?: ConversationMemoryState | null;
  realismProfile?: RealismLikeProfile;
  intimacyDecision?: IntimacyGateDecision;
}): string[] {
  const { lastIntent, memoryState, realismProfile, intimacyDecision } = args;
  const sceneMove = chooseSceneMove({
    lastIntent,
    memoryState,
    realismProfile,
    intimacyDecision,
  });

  return [
    "SCENE ENGINE SELF-CHECK",
    "Did the reply preserve the current room instead of resetting it?",
    `Did the reply actually perform the selected move: ${sceneMove.move}?`,
    "Did the line create a consequence, however small?",
    "Did the character lead with a scene move instead of a broad question?",
    "If there is inner monologue, is it only one short line and only because the beat truly needs it?",
    "Does the inner line add hidden pressure instead of repeating dialogue?",
    "Did the reply stay sparse enough to feel human rather than over-explained?",
  ];
}

export function buildRewriteCriticLines(args: {
  lastIntent: string;
  memoryState?: ConversationMemoryState | null;
  realismProfile?: RealismLikeProfile;
  intimacyDecision?: IntimacyGateDecision;
}): string[] {
  const { lastIntent, memoryState, realismProfile, intimacyDecision } = args;
  const sceneMove = chooseSceneMove({
    lastIntent,
    memoryState,
    realismProfile,
    intimacyDecision,
  });

  return [
    `Critic move target: ${sceneMove.move}.`,
    "Fix scene reset if the draft sounds detachable from the current room or beat.",
    "Fix role drift if the draft sounds smoother, nicer, or easier than this character should be.",
    "Fix generic questions if the draft ends by opening the conversation instead of moving the scene.",
    "Fix over-neat warmth if the draft gives more access than the moment earned.",
    "Fix excess inner monologue if it is longer than one short charged line or repeats the spoken line.",
    "Fix missing consequence if the draft leaves the scene emotionally unchanged.",
  ];
}
