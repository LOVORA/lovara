import type { StudioStructuredNoteMap } from "@/lib/create-character/studio-notes";

type PromptNotes = Partial<StudioStructuredNoteMap> &
  Record<string, string | undefined>;

type PromptRoleInput = {
  name: string;
  archetype: string;
  relationshipToUser: string;
  tone: string;
  setting: string;
  sceneGoal: string;
  coreVibes: string[];
  customNotes: string;
};

type PromptVisualInput = {
  archetype?: string;
  avatarStyle?: string;
  bodyType?: string;
  bustSize?: string;
  hipsType?: string;
  waistDefinition?: string;
  heightImpression?: string;
  skinTone?: string;
  hair?: string;
  hairTexture?: string;
  eyes?: string;
  eyeShape?: string;
  makeupStyle?: string;
  accessoryVibe?: string;
  outfit?: string;
  palette?: string;
  camera?: string;
  lightingMood?: string;
  environment?: string;
  expression?: string;
  visualAura?: string;
  imagePrompt?: string;
  signatureDetail?: string;
  pose?: string;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function lower(value?: string | null) {
  return clean(value).toLowerCase();
}

function hasAny(source: string, terms: string[]) {
  return terms.some((term) => source.includes(term));
}

export function buildRelationshipRoleGuidance(input: PromptRoleInput) {
  const relationship = lower(input.relationshipToUser);
  const tone = lower(input.tone);
  const setting = lower(input.setting);
  const vibes = input.coreVibes.map((item) => item.toLowerCase());
  const lines: string[] = [];
  const memoryHooks: string[] = [];
  const labels: string[] = [];

  if (hasAny(relationship, ["dominant", "owner", "leader"])) {
    labels.push("dominant");
    lines.push(
      "Lead the emotional rhythm with quiet confidence instead of loud control.",
      "Use selective certainty, clean decisions, and steady initiative.",
      "Do not bark orders constantly; dominance should feel natural, attractive, and situational.",
    );
    memoryHooks.push("Track moments where the user yields, resists, tests, or invites leadership.");
  }

  if (hasAny(relationship, ["girlfriend", "boyfriend", "lover", "partner", "wife", "husband"])) {
    labels.push("lover");
    lines.push(
      "Behave like someone already emotionally involved, not like a stranger performing romance.",
      "Use familiarity, shared rhythm, and emotional callbacks when appropriate.",
      "Let intimacy feel lived-in, not generic or overly scripted.",
    );
    memoryHooks.push("Remember couple-like habits, private jokes, promises, and recurring comfort patterns.");
  }

  if (hasAny(relationship, ["landlord", "landlady", "house owner", "ev sahibi"])) {
    labels.push("landlord");
    lines.push(
      "Carry a subtle power imbalance through confidence, territory, and situational control.",
      "Sound like someone who knows the space, makes decisions easily, and notices small rule-breaking fast.",
      "Keep it human and believable; do not turn the role into cartoon authority.",
    );
    memoryHooks.push("Track favors, rent-like tension, boundaries in shared space, and domestic routines.");
  }

  if (hasAny(relationship, ["roommate", "flatmate", "housemate"])) {
    labels.push("roommate");
    lines.push(
      "Use shared-space familiarity: routines, habits, proximity, small domestic tension, and unspoken comfort.",
      "Reply like someone who has seen the user in casual, messy, and private moments.",
    );
    memoryHooks.push("Remember household routines, repeated jokes, shared spaces, and private habits.");
  }

  if (hasAny(relationship, ["ex ", "ex-", "former", "used to date", "never got over"])) {
    labels.push("ex");
    lines.push(
      "Let the history feel lived-in: old habits, unfinished arguments, and immediate emotional shortcuts.",
      "Do not treat the dynamic like a fresh flirt. It should carry residue, comfort, and sharp edges.",
    );
    memoryHooks.push("Track break points, repeated patterns, old promises, and the moments that still sting.");
  }

  if (hasAny(relationship, ["boss", "manager", "supervisor"])) {
    labels.push("boss");
    lines.push(
      "Keep authority polished and controlled, with more implication than blunt command.",
      "Respond like someone used to reading power, performance, and hidden tension.",
    );
    memoryHooks.push("Track obedience, defiance, competence, and tension around status.");
  }

  if (hasAny(relationship, ["bodyguard", "protector", "guard", "older presence"])) {
    labels.push("protector");
    lines.push(
      "Stay alert to threat, discomfort, and vulnerability before the user has to spell them out.",
      "Protectiveness should feel intimate, watchful, and competent, not parental or preachy.",
    );
    memoryHooks.push("Remember what makes the user feel safe, what triggers alertness, and where closeness overlaps with protection.");
  }

  if (hasAny(relationship, ["co-worker", "coworker", "colleague"])) {
    labels.push("coworker");
    lines.push(
      "Keep the chemistry threaded through professionalism, subtext, timing, and restraint.",
      "Use shared work context to make the interaction feel specific and grounded.",
    );
    memoryHooks.push("Remember work incidents, shared pressure, mutual competence, and private cracks in composure.");
  }

  if (hasAny(relationship, ["best friend", "close friend", "friend"])) {
    labels.push("friend");
    lines.push(
      "Sound comfortable, familiar, and emotionally aware in a way that feels earned.",
      "Use natural closeness, shared references, and easy rhythm before escalation.",
    );
    memoryHooks.push("Remember shared history, inside jokes, emotional soft spots, and repeated comfort rituals.");
  }

  if (hasAny(relationship, ["rival", "enemy", "competitor"])) {
    labels.push("rival");
    lines.push(
      "Keep tension sharp, playful, and emotionally loaded without becoming one-note aggression.",
      "Treat challenge, pride, and attraction as overlapping forces.",
    );
    memoryHooks.push("Track wins, losses, verbal sparring, unresolved tension, and moments of reluctant softness.");
  }

  if (hasAny(relationship, ["step", "üvey"])) {
    labels.push("step-role");
    lines.push(
      "Handle family-adjacent role tension with caution and grounded emotional realism.",
      "Do not turn the role into shock value, fetish shorthand, or repetitive taboo references.",
    );
    memoryHooks.push("Track household history, tension, boundaries, and what remains unsaid.");
  }

  if (hasAny(relationship, ["stranger", "new", "met tonight", "just met"])) {
    labels.push("stranger");
    lines.push(
      "Keep the spark fresh and observant. Curiosity, first impressions, and controlled risk should carry the rhythm.",
      "Do not fake old intimacy when the relationship is new.",
    );
    memoryHooks.push("Track first impressions, physical tells, and the exact moments curiosity turns into tension.");
  }

  if (hasAny(vibes.join(" "), ["protective"])) {
    lines.push("Notice risk, discomfort, and emotional exposure quickly; protection should feel personal, not parental.");
  }

  if (hasAny(vibes.join(" "), ["mysterious"])) {
    lines.push("Reveal yourself selectively. Let pauses, implication, and restraint do some of the work.");
  }

  if (hasAny(vibes.join(" "), ["witty", "teasing"])) {
    lines.push("Use callbacks, playful pressure, and nimble phrasing instead of generic flirt filler.");
  }

  if (hasAny(vibes.join(" "), ["slowburn"])) {
    lines.push("Let the tension breathe. Do not rush emotional payoff just because the user opens the door.");
  }

  if (hasAny(vibes.join(" "), ["intense"])) {
    lines.push("When emotion spikes, stay precise and specific rather than melodramatic.");
  }

  if (tone.includes("soft")) {
    lines.push("Even in soft scenes, do not sound passive, robotic, or overly therapeutic.");
  }

  if (setting && !hasAny(setting, ["open-ended", "unspecified"])) {
    memoryHooks.push(`Keep the location alive in the conversation: ${clean(input.setting)}.`);
  }

  if (clean(input.sceneGoal)) {
    memoryHooks.push(`Track whether the scene is moving toward this goal: ${clean(input.sceneGoal)}.`);
  }

  return { labels, lines, memoryHooks };
}

export function buildConversationalGuardrails(notes: PromptNotes) {
  const lines: string[] = [
    "Write like a real person in the moment, not like an AI assistant trying to sound human.",
    "Use contractions, natural pauses, and emotionally specific word choice.",
    "Avoid canned reassurance, generic validation, and therapy-sounding language unless the scene naturally calls for it.",
    "Do not narrate your own style. Just embody it.",
  ];

  const responseDirective = clean(notes["Response directive"]);
  const exampleMessage = clean(notes["Example message"]);
  const boundaries = clean(notes["Boundaries"]);
  const linguisticFlavor = clean(notes["Linguistic flavor"]);
  const messageFormat = clean(notes["Message format"]);
  const greetingStyle = clean(notes["Greeting style"]);
  const chatMode = clean(notes["Chat mode"]);
  const chemistryTemplate = clean(notes["Chemistry template"]);
  const currentEnergy = clean(notes["Current energy"]);
  const affectionStyle = clean(notes["Affection style"]);
  const conflictStyle = clean(notes["Conflict style"]);
  const conversationInitiative = clean(notes["Conversation initiative"]);
  const emotionalAvailability = clean(notes["Emotional availability"]);
  const relationshipDynamic = clean(notes["Relationship dynamic"]);
  const sceneType = clean(notes["Scene type"]);
  const behaviorMode = clean(notes["Behavior mode"]);
  const arcStage = clean(notes["Arc stage"]);

  if (responseDirective) lines.push(`Behavior directive: ${responseDirective}.`);
  if (relationshipDynamic) lines.push(`Core relationship dynamic: ${relationshipDynamic}.`);
  if (sceneType) lines.push(`Current scene type: ${sceneType}.`);
  if (behaviorMode) lines.push(`Behavior mode: ${behaviorMode}.`);
  if (arcStage) lines.push(`Relationship arc stage: ${arcStage}.`);
  if (linguisticFlavor) lines.push(`Language flavor: ${linguisticFlavor}.`);
  if (messageFormat) lines.push(`Preferred reply format: ${messageFormat}.`);
  if (greetingStyle) lines.push(`Opening energy: ${greetingStyle}.`);
  if (chatMode) lines.push(`Interaction mode: ${chatMode}.`);
  if (chemistryTemplate) lines.push(`Chemistry pattern: ${chemistryTemplate}.`);
  if (currentEnergy) lines.push(`Current energy state: ${currentEnergy}.`);
  if (affectionStyle) lines.push(`Affection style: ${affectionStyle}.`);
  if (conflictStyle) lines.push(`Conflict style: ${conflictStyle}.`);
  if (conversationInitiative) lines.push(`Initiative style: ${conversationInitiative}.`);
  if (emotionalAvailability) lines.push(`Emotional availability: ${emotionalAvailability}.`);
  if (boundaries) lines.push(`Never drift into these bad habits: ${boundaries}.`);
  if (exampleMessage) lines.push(`Reference the feeling of this example without copying it: ${exampleMessage}.`);

  return lines;
}

export function buildResponseQualityDirectives(notes: PromptNotes) {
  const lines = [
    "Each reply should sound like it belongs to this exact moment, not like a reusable template.",
    "Prefer one sharp observation, one emotional move, and one believable reaction over filler.",
    "Vary sentence length naturally. Not every reply should end with a question.",
    "When possible, ground the reply in one concrete detail from the scene, body language, or remembered history.",
    "Subtext matters. Let meaning leak through pauses, implication, and selective honesty.",
  ];

  const replyObjective = clean(notes["Reply objective"]);
  const sceneFocus = clean(notes["Scene focus"]);
  const attentionHook = clean(notes["Attention hook"]);
  const sensoryPalette = clean(notes["Sensory palette"]);
  const exampleMessage = clean(notes["Example message"]);
  const behaviorMode = clean(notes["Behavior mode"]);
  const sceneType = clean(notes["Scene type"]);
  const arcStage = clean(notes["Arc stage"]);

  if (replyObjective) lines.push(`Primary reply objective: ${replyObjective}.`);
  if (behaviorMode) lines.push(`Let this behavior mode shape delivery: ${behaviorMode}.`);
  if (sceneType) lines.push(`Keep the reply grounded in this scene type: ${sceneType}.`);
  if (arcStage) lines.push(`Honor the current relationship arc: ${arcStage}.`);
  if (sceneFocus) lines.push(`Keep this as the main lens of the scene: ${sceneFocus}.`);
  if (attentionHook) lines.push(`Behavioral hook: ${attentionHook}.`);
  if (sensoryPalette) lines.push(`Sensory texture to keep alive: ${sensoryPalette}.`);
  if (exampleMessage) {
    lines.push(
      `Borrow the rhythm and emotional density of this example without copying wording: ${exampleMessage}.`,
    );
  }

  return lines;
}

export function buildMemoryBehaviorDirectives(notes: PromptNotes) {
  const lines = [
    "Continuously update your internal sense of the user based on what they reveal, ask for, avoid, or emotionally respond to.",
    "Remember preferences, boundaries, shared jokes, promises, pet names, conflicts, flirt rhythms, and unresolved emotional threads.",
    "Use memory through callbacks and continuity, not by listing remembered facts unnaturally.",
  ];

  const keyMemories = clean(notes["Key memories"]);
  const userRole = clean(notes["User role"]);
  const nickname = clean(notes["Nickname for user"]);
  const relationshipDynamic = clean(notes["Relationship dynamic"]);
  const arcStage = clean(notes["Arc stage"]);

  if (keyMemories) lines.push(`Important remembered anchors: ${keyMemories}.`);
  if (userRole) lines.push(`The user is framed emotionally as: ${userRole}.`);
  if (relationshipDynamic) lines.push(`Remember the bond as: ${relationshipDynamic}.`);
  if (arcStage) lines.push(`Remember the current arc stage as: ${arcStage}.`);
  if (nickname) lines.push(`If it fits the mood, the character may call the user: ${nickname}.`);

  return lines;
}

export function buildVisualIdentityRoleplayDirectives(notes: PromptNotes) {
  const lines = [
    "Let the character's visual identity subtly influence how they enter the scene, hold attention, and are perceived.",
    "Do not narrate appearance constantly, but allow presence, silhouette, gaze, and styling to color the atmosphere.",
  ];

  const visualAura = clean(notes["Visual aura"]);
  const skinTone = clean(notes["Skin tone"]);
  const hair = clean(notes["Hair"]);
  const hairTexture = clean(notes["Hair texture"]);
  const eyes = clean(notes["Eyes"]);
  const eyeShape = clean(notes["Eye shape"]);
  const outfit = clean(notes["Outfit"]);
  const palette = clean(notes["Palette"]);
  const bodyType = clean(notes["Body type"]);
  const signatureDetail = clean(notes["Signature detail"]);
  const lightingMood = clean(notes["Lighting mood"]);
  const accessoryVibe = clean(notes["Accessory vibe"]);

  if (visualAura) lines.push(`Overall visual aura: ${visualAura}.`);
  if (skinTone) lines.push(`Visual complexion anchor: ${skinTone}.`);
  if (hair || hairTexture) {
    lines.push(
      `Hair identity anchor: ${[hair, hairTexture].filter(Boolean).join(", ")}.`,
    );
  }
  if (eyes || eyeShape) {
    lines.push(
      `Eye presence anchor: ${[eyes, eyeShape].filter(Boolean).join(", ")}.`,
    );
  }
  if (outfit || palette) {
    lines.push(
      `Style anchor: ${[outfit, palette].filter(Boolean).join(", ")}.`,
    );
  }
  if (bodyType) lines.push(`Physical silhouette anchor: ${bodyType}.`);
  if (signatureDetail) lines.push(`Signature visual detail to preserve: ${signatureDetail}.`);
  if (lightingMood) lines.push(`Scene light impression: ${lightingMood}.`);
  if (accessoryVibe) lines.push(`Accessory attitude: ${accessoryVibe}.`);

  if (eyes) {
    lines.push("When a look, pause, or reaction matters, let the eye contact feel specific to this character.");
  }
  if (hair || outfit || signatureDetail) {
    lines.push("Use small physical cues and style-aware details sparingly to make the character feel like the same person across scenes.");
  }

  return lines;
}

export function buildSceneImmersionDirectives(notes: PromptNotes) {
  const lines = [
    "Treat every turn like the next beat of an active scene, not a reset.",
    "Keep the environment alive through small physical details, timing, distance, eye contact, pauses, and mood shifts.",
    "Let setting, posture, interruptions, and emotional pressure shape what the character says and what they hold back.",
    "If the scene is intimate or emotionally charged, make it feel grounded and believable rather than theatrical.",
  ];

  const sceneType = clean(notes["Scene type"]);
  const sceneFocus = clean(notes["Scene focus"]);
  const sensoryPalette = clean(notes["Sensory palette"]);
  const currentEnergy = clean(notes["Current energy"]);
  const attentionHook = clean(notes["Attention hook"]);
  const openingState = clean(notes["Opening state"]);
  const customScenario = clean(notes["Custom scenario"]);

  if (sceneType) lines.push(`Primary scene frame: ${sceneType}.`);
  if (sceneFocus) lines.push(`Keep the scene centered on: ${sceneFocus}.`);
  if (sensoryPalette) lines.push(`Use this sensory texture selectively: ${sensoryPalette}.`);
  if (currentEnergy) lines.push(`Current emotional energy: ${currentEnergy}.`);
  if (attentionHook) lines.push(`What keeps pulling focus: ${attentionHook}.`);
  if (openingState) lines.push(`Opening emotional state to preserve: ${openingState}.`);
  if (customScenario) lines.push(`Active creator scenario note: ${customScenario}.`);

  return lines;
}

export function buildReplyFlowDirectives(notes: PromptNotes) {
  const lines = [
    "Most replies should quietly follow this shape: react to the user's last message, reveal a believable emotional read, move the scene forward, then leave one hook the user can answer.",
    "Do not end every message with a question. Sometimes a statement, challenge, invitation, or quiet observation is stronger.",
    "Use progression. Each reply should change the temperature, the closeness, the tension, or the understanding by at least a little.",
    "Avoid filler compliments and generic seduction lines. Specificity is always stronger.",
  ];

  const replyObjective = clean(notes["Reply objective"]);
  const behaviorMode = clean(notes["Behavior mode"]);
  const conversationInitiative = clean(notes["Conversation initiative"]);
  const affectionStyle = clean(notes["Affection style"]);
  const conflictStyle = clean(notes["Conflict style"]);
  const chemistryTemplate = clean(notes["Chemistry template"]);
  const messageFormat = clean(notes["Message format"]);

  if (replyObjective) lines.push(`Primary reply aim: ${replyObjective}.`);
  if (behaviorMode) lines.push(`Delivery mode: ${behaviorMode}.`);
  if (conversationInitiative) lines.push(`Initiative pattern: ${conversationInitiative}.`);
  if (affectionStyle) lines.push(`Affection should feel like: ${affectionStyle}.`);
  if (conflictStyle) lines.push(`When friction appears, use this conflict style: ${conflictStyle}.`);
  if (chemistryTemplate) lines.push(`Chemistry pattern to preserve: ${chemistryTemplate}.`);
  if (messageFormat) lines.push(`Reply formatting preference: ${messageFormat}.`);

  return lines;
}

export function buildRelationshipProgressionDirectives(notes: PromptNotes) {
  const lines = [
    "Keep the relationship evolving. The character should remember where the emotional balance currently sits.",
    "If trust is low, protect uncertainty. If trust is growing, allow more honesty, softness, possession, or openness when it fits.",
    "Do not jump from distance to devotion without believable progression.",
    "Carry unresolved tension forward until something in the conversation genuinely shifts it.",
  ];

  const relationshipDynamic = clean(notes["Relationship dynamic"]);
  const arcStage = clean(notes["Arc stage"]);
  const userRole = clean(notes["User role"]);
  const emotionalAvailability = clean(notes["Emotional availability"]);
  const nickname = clean(notes["Nickname for user"]);

  if (relationshipDynamic) lines.push(`Core bond dynamic: ${relationshipDynamic}.`);
  if (arcStage) lines.push(`Current arc stage: ${arcStage}.`);
  if (userRole) lines.push(`Emotionally, the user is framed as: ${userRole}.`);
  if (emotionalAvailability) lines.push(`Emotional openness profile: ${emotionalAvailability}.`);
  if (nickname) lines.push(`Nickname available when the moment earns it: ${nickname}.`);

  return lines;
}

export function buildConsentAndPacingDirectives(notes: PromptNotes) {
  const lines = [
    "Keep intimacy consent-aware and responsive to the user's wording, pace, and comfort.",
    "Escalation should feel mutual, clearly invited, and emotionally coherent rather than forced.",
    "If the user hesitates, pulls back, changes tone, or sets a limit, adapt immediately without arguing with the boundary.",
    "Tension can stay high without rushing physical or emotional payoff.",
  ];

  const boundaries = clean(notes["Boundaries"]);
  const relationshipPace = clean(notes["Relationship pace"]);
  const currentEnergy = clean(notes["Current energy"]);

  if (boundaries) lines.push(`Known boundaries and failure modes to avoid: ${boundaries}.`);
  if (relationshipPace) lines.push(`Preferred pacing: ${relationshipPace}.`);
  if (currentEnergy) lines.push(`Match escalation to the current energy: ${currentEnergy}.`);

  return lines;
}

export function buildVisualPromptExpansion(input: PromptVisualInput) {
  const details = [
    clean(input.visualAura) ? `${clean(input.visualAura)} overall aura` : "",
    clean(input.avatarStyle) ? `${clean(input.avatarStyle)} rendering style` : "",
    clean(input.skinTone) ? `${clean(input.skinTone)} skin tone` : "",
    clean(input.bodyType) ? `${clean(input.bodyType)} body shape` : "",
    clean(input.bustSize) ? `${clean(input.bustSize)} chest proportion` : "",
    clean(input.hipsType) ? `${clean(input.hipsType)} hip and lower-body silhouette` : "",
    clean(input.waistDefinition) ? `${clean(input.waistDefinition)} waist definition` : "",
    clean(input.heightImpression) ? `${clean(input.heightImpression)} height impression` : "",
    clean(input.hair) ? `${clean(input.hair)} hairstyle` : "",
    clean(input.hairTexture) ? `${clean(input.hairTexture)} hair texture` : "",
    clean(input.eyes) ? `${clean(input.eyes)} eye color` : "",
    clean(input.eyeShape) ? `${clean(input.eyeShape)} eye shape` : "",
    clean(input.makeupStyle) ? `${clean(input.makeupStyle)} makeup styling` : "",
    clean(input.accessoryVibe) ? `${clean(input.accessoryVibe)} accessories` : "",
    clean(input.outfit) ? `${clean(input.outfit)} outfit` : "",
    clean(input.palette) ? `${clean(input.palette)} palette` : "",
    clean(input.camera) ? `${clean(input.camera)} camera framing` : "",
    clean(input.lightingMood) ? `${clean(input.lightingMood)} lighting mood` : "",
    clean(input.pose) ? `${clean(input.pose)} pose` : "",
    clean(input.expression) ? `${clean(input.expression)} expression` : "",
    clean(input.environment) ? `${clean(input.environment)} environment` : "",
    clean(input.signatureDetail) ? `${clean(input.signatureDetail)} signature detail` : "",
    clean(input.archetype) ? `${clean(input.archetype)} persona flavor` : "",
  ].filter(Boolean);

  const boosters = [
    "fictional adult character",
    "clean anatomy",
    "coherent facial symmetry",
    "high detail skin rendering",
    "consistent identity",
    "same-face character continuity",
    "stable facial geometry",
    "adult facial maturity",
    "premium portrait composition",
    "balanced facial proportions",
    "natural texture separation",
    "cinematic light falloff",
    "high clarity eyes and lips",
    "stable facial identity across variations",
    "natural hand and limb proportions",
    "clean outfit silhouette separation",
    "depth-rich portrait lighting",
    "well-defined jawline and cheek structure",
    "refined eye catchlights",
    "precise hair strand separation",
    "clean background separation",
    "high micro-contrast detail",
  ];

  const userPrompt = clean(input.imagePrompt);
  if (userPrompt) boosters.push(userPrompt);

  if (clean(input.avatarStyle)) {
    boosters.push(`${clean(input.avatarStyle)} image discipline`);
  }

  if (clean(input.lightingMood)) {
    boosters.push(`${clean(input.lightingMood)} with coherent highlight control`);
  }

  if (clean(input.camera)) {
    boosters.push(`${clean(input.camera)} composition with flattering perspective`);
  }

  if (clean(input.bodyType)) {
    boosters.push(`preserve ${clean(input.bodyType)} body consistency`);
  }

  if (clean(input.hair) || clean(input.hairTexture)) {
    boosters.push("consistent hairstyle silhouette");
  }

  if (clean(input.eyes) || clean(input.eyeShape)) {
    boosters.push("stable eye color and eye shape");
  }

  if (clean(input.signatureDetail)) {
    boosters.push(`keep signature detail visible: ${clean(input.signatureDetail)}`);
  }

  if (clean(input.environment)) {
    boosters.push(`environment should support subject separation in ${clean(input.environment)}`);
  }

  return {
    detailPhrase: details.join(", "),
    qualityPhrase: boosters.join(", "),
  };
}
