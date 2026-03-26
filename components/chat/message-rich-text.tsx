"use client";

type Segment = {
  text: string;
  isDialogue: boolean;
};

function parseMessageSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /("([^"\n]|\\")*")|(“([^”\n]|\\”)*”)/g;
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const full = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      const plainText = content.slice(lastIndex, index);
      if (plainText) {
        segments.push({ text: plainText, isDialogue: false });
      }
    }

    if (full) {
      segments.push({ text: full, isDialogue: true });
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex), isDialogue: false });
  }

  if (segments.length === 0) {
    return [{ text: content, isDialogue: false }];
  }

  return segments;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function MessageRichText({
  content,
  tone = "light",
}: {
  content: string;
  tone?: "light" | "dark";
}) {
  const segments = parseMessageSegments(content);

  return (
    <div className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => (
        <span
          key={`${index}-${segment.isDialogue ? "dialogue" : "inner"}`}
          className={cn(
            segment.isDialogue
              ? tone === "dark"
                ? "font-semibold tracking-[0.01em] text-black"
                : "font-semibold tracking-[0.01em] text-white"
              : tone === "dark"
                ? "font-normal text-black/74"
                : "font-normal text-white/78",
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
