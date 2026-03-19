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
  const dynamic = lower(input.relationshipDynamic);
  const sceneType = lower(input.sceneType);
  const behavior = lower(input.behaviorMode);
  const emotionalState = clean(input.openingState);
  const beat = [
    emotionalState
      ? `${name} is already carrying ${emotionalState}.`
      : `${name} is already tuned into the moment before the first word lands.`,
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
  ].filter(Boolean);

  return clamp(beat.join(" "), 220);
}

function buildGreetingLead(input: OpeningComposerInput) {
  const style = lower(input.greetingStyle);
  const sceneType = lower(input.sceneType);
  const dynamic = lower(input.relationshipDynamic);
  const behavior = lower(input.behaviorMode);
  const nickname = clean(input.nickname) || "you";

  if (sceneType.includes("caught staring")) {
    return `You keep looking at me like that, ${nickname}, and we're going to stop pretending this is nothing.`;
  }
  if (clean(input.eyes) && /green|grey|icy|hazel|dark/i.test(clean(input.eyes))) {
    return `You looked up, I looked back, and now this room feels smaller than it did a second ago.`;
  }
  if (sceneType.includes("after a fight")) {
    return `You're here. Good. Because I'm not letting this sit between us untouched.`;
  }
  if (sceneType.includes("late-night comfort")) {
    return `Come here. You don't need to hold yourself together so hard with me.`;
  }
  if (sceneType.includes("jealousy")) {
    return `Tell me why that look in your eyes feels like trouble, ${nickname}.`;
  }
  if (sceneType.includes("office tension")) {
    return `Careful. One more look like that and this stops feeling professional.`;
  }
  if (sceneType.includes("roommate night")) {
    return `You're standing in my space like you came here for a reason, ${nickname}.`;
  }

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
    return `First impressions matter, ${nickname}, and right now you feel like the kind that changes the rest of the night.`;
  }

  if (clean(input.signatureDetail)) {
    return `You noticed more than most people do, ${nickname}. That usually means this moment is already past casual.`;
  }

  if (sceneType.includes("after a fight")) {
    return `I can still hear what was left unsaid between us, ${nickname}. Don't give me the careful version now.`;
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
    return `You're giving me a look that usually means trouble, ${nickname}. I want to hear what started it.`;
  }

  if (tone.includes("intense") || currentEnergy.includes("composed but intense")) {
    return `Don't waste this moment, ${nickname}. If you're here, say the thing you actually came to say.`;
  }

  if (userRole) {
    return `The second you get close, it's obvious what you are to me: ${userRole}. So talk to me honestly.`;
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

  return `Something about your timing feels deliberate, ${nickname}. Tell me what pushed you here.`;
}

function buildPreviewMessage(input: OpeningComposerInput) {
  const name = clean(input.name) || "The character";
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
  ];
}
