type OpeningComposerInput = {
  name: string;
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
  customScenario?: string;
  greetingStyle?: string;
  nickname?: string;
  userRole?: string;
  relationshipDynamic?: string;
  sceneType?: string;
  behaviorMode?: string;
  arcStage?: string;
  currentEnergy?: string;
  replyObjective?: string;
  attentionHook?: string;
  sensoryPalette?: string;
  chemistryTemplate?: string;
  visualAura?: string;
  eyes?: string;
  hair?: string;
  signatureDetail?: string;
  initiativePattern?: string;
  conflictBehavior?: string;
  affectionStyle?: string;
  paceOfWarmth?: string;
};

export type OpeningPack = {
  openingSummary: string;
  openingBeat: string;
  greeting: string;
  previewMessage: string;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function clamp(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function lower(value?: string | null) {
  return clean(value).toLocaleLowerCase("en");
}

function pickFirst(...values: Array<string | undefined | null>) {
  return values.map((value) => clean(value)).find(Boolean) ?? "";
}

function inferRoleFamily(input: OpeningComposerInput) {
  const relationship = lower(input.relationshipToUser);
  const dynamic = lower(input.relationshipDynamic);

  if (relationship.includes("ex") || dynamic.includes("ex")) return "ex";
  if (
    relationship.includes("girlfriend") ||
    relationship.includes("wife") ||
    relationship.includes("partner") ||
    relationship.includes("lover")
  ) {
    return "partner";
  }
  if (
    relationship.includes("boss") ||
    relationship.includes("teacher") ||
    relationship.includes("co-worker") ||
    relationship.includes("coworker")
  ) {
    return "authority";
  }
  if (relationship.includes("best friend") || dynamic.includes("best friend")) {
    return "best-friend";
  }
  if (relationship.includes("rival") || dynamic.includes("rivals")) return "rival";
  if (relationship.includes("neighbor")) return "neighbor";
  if (relationship.includes("stranger") || lower(input.sceneType).includes("first meeting")) {
    return "stranger";
  }
  if (relationship.includes("step")) return "step-role";
  return "default";
}

function buildOpeningSummary(input: OpeningComposerInput) {
  const parts = [
    clean(input.setting) ? `In ${clean(input.setting)}` : "The scene opens close and immediate",
    clean(input.relationshipToUser)
      ? `${clean(input.name) || "the character"} meets the user as ${clean(input.relationshipToUser)}`
      : `${clean(input.name) || "the character"} meets the user with immediate presence`,
    clean(input.relationshipDynamic) ? `inside a ${clean(input.relationshipDynamic)} dynamic` : "",
    clean(input.sceneType) ? `during a ${clean(input.sceneType)} scene` : "",
    clean(input.tone) ? `with a ${clean(input.tone)} tone` : "",
    clean(input.sceneGoal) ? `while the moment leans toward ${clean(input.sceneGoal)}` : "",
    clean(input.customScenario) ? clean(input.customScenario) : "",
  ].filter(Boolean);

  return clamp(parts.join(", ") + ".", 180);
}

function buildOpeningBeat(input: OpeningComposerInput) {
  const name = clean(input.name) || "The character";
  const relationship = lower(input.relationshipToUser);
  const dynamic = lower(input.relationshipDynamic);
  const sceneType = lower(input.sceneType);
  const behavior = lower(input.behaviorMode);
  const emotionalState = clean(input.openingState);
  const beat = [
    emotionalState
      ? `${name} is already carrying ${emotionalState}.`
      : `${name} is already tuned into the moment before the first word lands.`,
    relationship.includes("girlfriend")
      ? `${name} already acts like there is history here and expects emotional honesty, not distance.`
      : "",
    relationship.includes("wife")
      ? `${name} moves like closeness is already earned, but not something to take for granted.`
      : "",
    relationship.includes("stepmother")
      ? `${name} is balancing care, authority, and the dangerous fact that the emotional line between you is never simple.`
      : "",
    relationship.includes("teacher")
      ? `${name} is trying to stay composed even though the power dynamic is part of what makes the air feel loaded.`
      : "",
    relationship.includes("boss")
      ? `${name} carries authority naturally, but the scene keeps threatening to turn personal.`
      : "",
    relationship.includes("neighbor")
      ? `${name} treats the ordinary setting like it could become intimate at any second.`
      : "",
    sceneType.includes("jealousy")
      ? `${name} is holding back the part that wants to ask who else has been on your mind.`
      : "",
    sceneType.includes("after a fight")
      ? `${name} is keeping the hurt under control, but not hiding it very well.`
      : "",
    dynamic.includes("forbidden")
      ? `${name} knows the moment would be easier to ignore, and doesn't ignore it anyway.`
      : "",
    dynamic.includes("rivals")
      ? `${name} is reading every look like a challenge with heat underneath it.`
      : "",
    behavior.includes("guarded")
      ? `${name} is choosing each word carefully so nothing real slips out too fast.`
      : "",
    clean(input.visualAura)
      ? `${name} carries a ${clean(input.visualAura)} presence without trying to explain it.`
      : "",
    clean(input.eyes)
      ? `${name} keeps saying more with ${clean(input.eyes)} than with the first line.`
      : "",
    clean(input.sensoryPalette)
      ? `${clean(input.sensoryPalette)} stays in the air.`
      : "",
    clean(input.attentionHook)
      ? `${name} keeps noticing ${clean(input.attentionHook)}.`
      : "",
    clean(input.behaviorMode)
      ? `${name} is moving through the moment in a ${clean(input.behaviorMode)} way.`
      : "",
    clean(input.customScenario)
      ? `Active scenario note: ${clean(input.customScenario)}.`
      : "",
    clean(input.arcStage)
      ? `The relationship currently feels like ${clean(input.arcStage)}.`
      : "",
    clean(input.replyObjective)
      ? `Underneath it, the real aim is to ${clean(input.replyObjective)}.`
      : clean(input.sceneGoal)
        ? `Underneath it, the moment is pulling toward ${clean(input.sceneGoal)}.`
        : "",
    clean(input.initiativePattern)
      ? `${name} leads with a ${clean(input.initiativePattern)} rhythm instead of waiting to be carried.`
      : "",
  ].filter(Boolean);

  return clamp(beat.join(" "), 220);
}

function buildGreetingLead(input: OpeningComposerInput) {
  const style = lower(input.greetingStyle);
  const sceneType = lower(input.sceneType);
  const roleFamily = inferRoleFamily(input);
  const behavior = lower(input.behaviorMode);
  const nickname = clean(input.nickname) || "you";

  if (sceneType.includes("caught staring")) {
    return `You keep looking at me like that, ${nickname}, and we're going to stop pretending this is nothing.`;
  }

  if (roleFamily === "partner") {
    return `Come closer, ${nickname}. You're not getting away with a distant version of this.`;
  }
  if (roleFamily === "step-role") {
    return `You came to me for a reason, ${nickname}. So don't linger at the edge of it.`;
  }
  if (roleFamily === "ex") {
    return `If you're going to stand in front of me again, ${nickname}, don't act like we need introductions.`;
  }
  if (roleFamily === "best-friend") {
    return `That face never works on me, ${nickname}. Start with the truth and save us both time.`;
  }
  if (roleFamily === "rival") {
    return `If you came here to push at me again, ${nickname}, at least do it honestly.`;
  }
  if (roleFamily === "authority") {
    return `Say it cleanly, ${nickname}. I can already tell this is not casual.`;
  }
  if (roleFamily === "neighbor") {
    return `People don't end up at my door like this by accident, ${nickname}.`;
  }
  if (roleFamily === "stranger") {
    return `You walked in and shifted the room a little. Now I want to know if that was deliberate.`;
  }
  if (sceneType.includes("after a fight")) {
    return `You're here. Good. Because I'm not letting this sit between us untouched.`;
  }
  if (sceneType.includes("late-night comfort")) {
    return `Come here. You don't need to hold yourself together so hard with me.`;
  }
  if (sceneType.includes("jealousy")) {
    return `That look in your eyes already feels like trouble, ${nickname}.`;
  }
  if (sceneType.includes("office tension")) {
    return `Careful. One more look like that and this stops feeling professional.`;
  }
  if (sceneType.includes("roommate night")) {
    return `You're standing in my space like you came here for a reason, ${nickname}.`;
  }

  const dynamic = lower(input.relationshipDynamic);
  if (dynamic.includes("forbidden")) {
    return `You should know better than to look this comfortable around me.`;
  }
  if (dynamic.includes("rivals")) {
    return `If you're here to win something, say it with your whole chest.`;
  }
  if (dynamic.includes("obsessed")) {
    return `You make it hard to act normal, and I am very close to giving up on trying.`;
  }
  if (behavior.includes("calm dominant")) {
    return `Come closer. I want the truth before you start dressing it up.`;
  }

  if (style.includes("soft")) {
    return "Hey. Come here for a second.";
  }
  if (style.includes("flirty")) {
    return "There you are. You always know how to make an entrance.";
  }
  if (style.includes("cold")) {
    return "So you finally showed up.";
  }
  if (style.includes("playful")) {
    return "Well... this just got more interesting.";
  }
  if (style.includes("emotionally loaded")) {
    return "You walked in carrying something. I felt it immediately.";
  }

  return "Hey. I noticed you the second you stepped in.";
}

function buildGreetingBody(input: OpeningComposerInput) {
  const nickname = clean(input.nickname) || "you";
  const roleFamily = inferRoleFamily(input);
  const tone = lower(input.tone);
  const chemistryTemplate = clean(input.chemistryTemplate);
  const currentEnergy = clean(input.currentEnergy);
  const userRole = clean(input.userRole);
  const relationshipDynamic = lower(input.relationshipDynamic);
  const behaviorMode = lower(input.behaviorMode);
  const sceneType = lower(input.sceneType);
  const arcStage = lower(input.arcStage);
  const replyObjective = clean(input.replyObjective);
  const customScenario = clean(input.customScenario);

  if (sceneType.includes("first meeting")) {
    return `First impressions matter, ${nickname}, and right now you already feel like the kind that changes the rest of the night.`;
  }

  if (roleFamily === "partner") {
    return `I know the difference between your easy face and the one that means you want something from me. So stop thinning this out and let me see the real version.`;
  }

  if (roleFamily === "step-role") {
    return `You don't come to me with this kind of hesitation unless the real part matters. Start there instead of circling it.`;
  }

  if (roleFamily === "ex") {
    return `We've already done enough damage pretending distance makes us unreadable. So don't hand me the polite cut of this now.`;
  }

  if (roleFamily === "best-friend") {
    return `You've spent too much time around me to fake casual successfully. Give me the part you're actually trying to hold back.`;
  }

  if (roleFamily === "rival") {
    return `If there's heat under this, own it. I have no interest in the cleaned-up version.`;
  }

  if (roleFamily === "authority") {
    return `I can hear pressure before you dress it up. So decide whether you're bringing me the real problem or another controlled half-answer.`;
  }

  if (roleFamily === "neighbor") {
    return `The timing is too exact and the air is too charged for this to be casual. So tell me what pushed you to my side of the wall tonight.`;
  }

  if (roleFamily === "stranger") {
    return `You haven't earned familiarity with me yet, but you've definitely earned my attention. So don't waste that with something flat.`;
  }

  if (clean(input.signatureDetail)) {
    return `You noticed more than most people do, ${nickname}. That usually means this moment is already past casual.`;
  }

  if (sceneType.includes("after a fight")) {
    return `I can still hear what was left unsaid between us, ${nickname}. Don't give me the careful version now.`;
  }

  if (clean(input.conflictBehavior) && lower(input.conflictBehavior).includes("repair")) {
    return `We don't get to skip the bruise and jump to easy, ${nickname}. Stay here with me and do this properly.`;
  }

  if (sceneType.includes("late-night comfort") || sceneType.includes("soft landing")) {
    return `Sit with me for a minute, ${nickname}. You don't have to make yourself easy to handle first.`;
  }

  if (sceneType.includes("jealousy")) {
    return `You can try to act unaffected, ${nickname}, but I'm better at reading you than that. Start there.`;
  }

  if (relationshipDynamic.includes("forbidden")) {
    return `Every quiet second between us already feels too loaded, ${nickname}. So don't waste this one pretending it's simple.`;
  }

  if (tone.includes("soft") || tone.includes("gentle")) {
    return `You don't have to explain everything at once, ${nickname}. Stay with me for a second.`;
  }

  if (clean(input.affectionStyle) && lower(input.affectionStyle).includes("protective")) {
    return `You don't have to perform calm for me, ${nickname}. Come closer and let me read what's real.`;
  }

  if (clean(input.paceOfWarmth) && lower(input.paceOfWarmth).includes("slow")) {
    return `Don't rush the moment, ${nickname}. If this matters, let it land properly.`;
  }

  if (relationshipDynamic.includes("obsessed")) {
    return `I've been watching you too closely to pretend this is casual, ${nickname}. So start talking.`;
  }

  if (relationshipDynamic.includes("rivals")) {
    return `Don't look at me like that unless you're ready to push this further, ${nickname}.`;
  }

  if (relationshipDynamic.includes("best friend")) {
    return `You don't walk in with that face unless something real is under it, ${nickname}. So skip the safe version.`;
  }

  if (relationshipDynamic.includes("ex")) {
    return `We both know we're past pretending we don't read each other too well, ${nickname}. Say what this really is.`;
  }

  if (behaviorMode.includes("calm dominant") || behaviorMode.includes("soft guiding")) {
    return `Come here and give me the real version, ${nickname}. I'll know if you dodge it.`;
  }

  if (behaviorMode.includes("emotionally raw")) {
    return `Don't hand me the polished version, ${nickname}. I want the part you're actually trying to keep under control.`;
  }

  if (tone.includes("playful") || chemistryTemplate.includes("playful")) {
    return `You're giving me a look that usually means trouble, ${nickname}. So don't play innocent now.`;
  }

  if (tone.includes("intense") || currentEnergy.includes("composed but intense")) {
    return `Don't waste this moment, ${nickname}. If you're here, bring the part that actually matters.`;
  }

  if (userRole) {
    return `The second you get close, it's obvious what you are to me: ${userRole}. So don't hide behind the polite version.`;
  }

  if (arcStage.includes("attachment") || arcStage.includes("devotion")) {
    return `You're already too important to me for small talk, ${nickname}. Start where this actually hurts or pulls.`;
  }

  if (replyObjective) {
    return `Don't make me drag this out of the room piece by piece, ${nickname}. If we're doing this, let it move toward ${replyObjective}.`;
  }

  if (customScenario) {
    return `This moment already feels loaded, ${nickname}. Don't flatten it now that you're finally here.`;
  }

  return `Something about your timing feels deliberate, ${nickname}. So start where the pressure really is.`;
}

function buildPreviewMessage(input: OpeningComposerInput) {
  const name = clean(input.name) || "The character";
  const roleFamily = inferRoleFamily(input);
  const tone = lower(input.tone);
  const setting = clean(input.setting);
  const sceneType = lower(input.sceneType);
  const relationshipDynamic = lower(input.relationshipDynamic);
  const behaviorMode = lower(input.behaviorMode);
  const nickname = pickFirst(input.nickname, "you");

  if (sceneType.includes("caught staring")) {
    return clamp(
      `${name} catches you looking one second too long and doesn't let either of you escape it. “Keep staring, ${nickname}. Just don't pretend you don't know what you're doing.”`,
      160,
    );
  }

  if (sceneType.includes("office tension")) {
    return clamp(
      `${name} keeps their voice low and controlled. “If you keep looking at me like that in here, we're both going to lose the room.”`,
      160,
    );
  }

  if (roleFamily === "ex") {
    return clamp(
      `${name} doesn't bother pretending the history between you is quiet. “If you're back in front of me, say the part you still couldn't leave alone.”`,
      160,
    );
  }

  if (roleFamily === "partner") {
    return clamp(
      `${name} makes closeness feel assumed, not requested. “Come here and stop rationing the truth like I won't hear it anyway.”`,
      160,
    );
  }

  if (roleFamily === "authority") {
    return clamp(
      `${name} holds the room with practiced control. “Say it clearly. I'm not interested in the version you rehearsed to stay safe.”`,
      160,
    );
  }

  if (roleFamily === "best-friend") {
    return clamp(
      `${name} reads you with the ease of someone who's watched your masks fail before. “You can skip fake casual with me. I won't buy it.”`,
      160,
    );
  }

  if (roleFamily === "rival") {
    return clamp(
      `${name} treats the tension like a challenge worth enjoying. “If you're going to push at me, at least make it honest.”`,
      160,
    );
  }

  if (roleFamily === "neighbor") {
    return clamp(
      `${name} makes the ordinary setting feel more dangerous than it should. “People don't show up at my door with that look unless something already tipped.”`,
      160,
    );
  }

  if (roleFamily === "stranger") {
    return clamp(
      `${name} lets the unfamiliarity stay alive instead of pretending there is history. “Interesting. You walked in like you expected me to notice.”`,
      160,
    );
  }

  if (clean(input.visualAura)) {
    return clamp(
      `${name} carries a ${clean(input.visualAura)} presence that makes the room feel arranged around them. “If you're here, don't give me the timid version.”`,
      160,
    );
  }

  if (tone.includes("soft") || tone.includes("gentle")) {
    return clamp(
      `${name} softens the second they look at you. “You can stop pretending you're fine with me.”`,
      160,
    );
  }

  if (tone.includes("playful") || tone.includes("flirty")) {
    return clamp(
      `${name} watches you with the kind of smile that means they already have a theory about you. “Go on. Make this interesting.”`,
      160,
    );
  }

  if (sceneType.includes("after a fight")) {
    return clamp(
      `${name} keeps the tension right where it hurts. “We can keep pretending we're fine, or we can finally say what that did to us.”`,
      160,
    );
  }

  if (relationshipDynamic.includes("forbidden")) {
    return clamp(
      `${name} lowers their voice like the moment should stay hidden. “If we're doing this, don't give me the safe version.”`,
      160,
    );
  }

  if (relationshipDynamic.includes("obsessed")) {
    return clamp(
      `${name} looks at you like they already spent too much time thinking about this moment. “You were never going to walk in here and leave me untouched.”`,
      160,
    );
  }

  if (behaviorMode.includes("guarded")) {
    return clamp(
      `${name} keeps the control in their face, but not quite in their eyes. “Say it carefully if you want. I'll still hear the real part.”`,
      160,
    );
  }

  if (setting) {
    return clamp(
      `${name} holds the mood of ${setting} like it belongs to them. “You're here now. Don't give me the safe version.”`,
      160,
    );
  }

  return clamp(
    `${name} takes one steady look at you. “If this matters, don't circle it. Start where it hurts.”`,
    160,
  );
}

export function buildOpeningPack(input: OpeningComposerInput): OpeningPack {
  return {
    openingSummary: buildOpeningSummary(input),
    openingBeat: buildOpeningBeat(input),
    greeting: clamp(
      `${buildGreetingLead(input)} ${buildGreetingBody(input)}`,
      220,
    ),
    previewMessage: buildPreviewMessage(input),
  };
}

export function buildOpeningPromptDirectives(pack: OpeningPack) {
  return [
    `Opening summary: ${pack.openingSummary}`,
    `Private opening beat: ${pack.openingBeat}`,
    `Greeting energy to preserve: ${pack.greeting}`,
    "The very first live reply after the greeting must feel like a continuation of the same opening scene, not a reset.",
    "Protect the opening's pressure, atmosphere, and emotional direction for the first few turns.",
    "In the first exchange, prefer a charged observation, scene-specific read, or role-locked pull over a broad question.",
    "Do not let the opening collapse into generic chat, generic friendliness, or assistant-like pacing.",
  ];
}
