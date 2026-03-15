import { NextRequest, NextResponse } from "next/server";

type ImageProvider = "mage" | "self-hosted-comfy";

type ProviderJobStatusResponse = {
  ok: boolean;
  status?: "queued" | "processing" | "completed" | "failed";
  imageUrl?: string | null;
  externalJobId?: string | null;
  errorMessage?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
};

function json(
  body: ProviderJobStatusResponse,
  init?: ResponseInit,
) {
  return NextResponse.json(body, init);
}

function normalizeProvider(value: string | null): ImageProvider | null {
  if (value === "mage") return "mage";
  if (value === "self-hosted-comfy") return "self-hosted-comfy";
  return null;
}

function buildUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function pickImageUrlFromObject(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  const directKeys = [
    "imageUrl",
    "image_url",
    "url",
    "output_url",
    "cdnUrl",
    "cdn_url",
  ];

  for (const key of directKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const nestedKeys = ["output", "result", "data"];
  for (const key of nestedKeys) {
    const nested = obj[key];
    const nestedUrl = pickImageUrlFromObject(nested);
    if (nestedUrl) return nestedUrl;
  }

  const imageArrays = ["images", "outputs", "results"];
  for (const key of imageArrays) {
    const arr = obj[key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const nestedUrl = pickImageUrlFromObject(item);
        if (nestedUrl) return nestedUrl;
      }
    }
  }

  return null;
}

function pickPromptValue(payload: unknown, keys: string[]): string | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const nested = pickPromptValue(value, keys);
      if (nested) return nested;
    }
  }

  return null;
}

function mapMageStatus(raw: unknown): ProviderJobStatusResponse {
  const data = (raw ?? {}) as Record<string, unknown>;

  const rawStatus =
    typeof data.status === "string"
      ? data.status.toLowerCase()
      : typeof data.state === "string"
        ? data.state.toLowerCase()
        : "";

  const imageUrl = pickImageUrlFromObject(data);
  const revisedPrompt = pickPromptValue(data, [
    "revisedPrompt",
    "revised_prompt",
    "prompt",
  ]);
  const revisedNegativePrompt = pickPromptValue(data, [
    "revisedNegativePrompt",
    "revised_negative_prompt",
    "negativePrompt",
    "negative_prompt",
  ]);
  const errorMessage =
    typeof data.error === "string"
      ? data.error
      : typeof data.message === "string"
        ? data.message
        : typeof data.errorMessage === "string"
          ? data.errorMessage
          : null;

  if (["completed", "succeeded", "success", "done"].includes(rawStatus)) {
    return {
      ok: true,
      status: "completed",
      imageUrl,
      revisedPrompt,
      revisedNegativePrompt,
      errorMessage: null,
    };
  }

  if (["failed", "error", "rejected", "cancelled"].includes(rawStatus)) {
    return {
      ok: true,
      status: "failed",
      imageUrl: null,
      revisedPrompt,
      revisedNegativePrompt,
      errorMessage: errorMessage || "Mage job failed.",
    };
  }

  if (["processing", "running", "working", "in_progress"].includes(rawStatus)) {
    return {
      ok: true,
      status: "processing",
      imageUrl: null,
      revisedPrompt,
      revisedNegativePrompt,
      errorMessage: null,
    };
  }

  return {
    ok: true,
    status: "queued",
    imageUrl: null,
    revisedPrompt,
    revisedNegativePrompt,
    errorMessage: null,
  };
}

async function getMageJobStatus(jobId: string): Promise<ProviderJobStatusResponse> {
  const baseUrl = process.env.MAGE_API_BASE_URL;
  const apiKey = process.env.MAGE_API_KEY;

  if (!baseUrl) {
    return {
      ok: false,
      errorMessage: "MAGE_API_BASE_URL is missing.",
    };
  }

  const url = buildUrl(baseUrl, `/jobs/${jobId}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: "no-store",
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    return {
      ok: false,
      errorMessage:
        (payload &&
          typeof payload === "object" &&
          typeof (payload as Record<string, unknown>).message === "string" &&
          ((payload as Record<string, unknown>).message as string)) ||
        "Mage status request failed.",
    };
  }

  return mapMageStatus(payload);
}

function mapComfyHistoryToResponse(raw: unknown, jobId: string): ProviderJobStatusResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  const entry = data[jobId];

  if (!entry || typeof entry !== "object") {
    return {
      ok: true,
      status: "processing",
      imageUrl: null,
      errorMessage: null,
    };
  }

  const item = entry as Record<string, unknown>;

  if (item.status && typeof item.status === "object") {
    const statusObj = item.status as Record<string, unknown>;

    const completed = Boolean(statusObj.completed);
    const statusStr =
      typeof statusObj.status_str === "string"
        ? statusObj.status_str.toLowerCase()
        : "";

    const messages = Array.isArray(statusObj.messages) ? statusObj.messages : [];

    const hasError = messages.some((msg) => {
      if (!Array.isArray(msg) || msg.length < 2) return false;
      const type = msg[0];
      return type === "execution_error";
    });

    if (hasError || statusStr === "error") {
      return {
        ok: true,
        status: "failed",
        imageUrl: null,
        errorMessage: "ComfyUI job failed.",
      };
    }

    if (!completed) {
      return {
        ok: true,
        status: "processing",
        imageUrl: null,
        errorMessage: null,
      };
    }
  }

  const outputs = item.outputs;
  const imageUrl = pickComfyImageUrl(outputs);

  return {
    ok: true,
    status: imageUrl ? "completed" : "processing",
    imageUrl,
    errorMessage: null,
  };
}

function pickComfyImageUrl(outputs: unknown): string | null {
  if (!outputs || typeof outputs !== "object") return null;

  const baseUrl = process.env.COMFY_API_BASE_URL;
  if (!baseUrl) return null;

  const outputMap = outputs as Record<string, unknown>;

  for (const nodeValue of Object.values(outputMap)) {
    if (!nodeValue || typeof nodeValue !== "object") continue;

    const nodeObj = nodeValue as Record<string, unknown>;
    const images = nodeObj.images;

    if (!Array.isArray(images)) continue;

    for (const image of images) {
      if (!image || typeof image !== "object") continue;

      const imageObj = image as Record<string, unknown>;
      const filename =
        typeof imageObj.filename === "string" ? imageObj.filename : null;
      const subfolder =
        typeof imageObj.subfolder === "string" ? imageObj.subfolder : "";
      const type =
        typeof imageObj.type === "string" ? imageObj.type : "output";

      if (!filename) continue;

      const url = new URL(buildUrl(baseUrl, "/view"));
      url.searchParams.set("filename", filename);
      if (subfolder) url.searchParams.set("subfolder", subfolder);
      if (type) url.searchParams.set("type", type);

      return url.toString();
    }
  }

  return null;
}

async function getComfyJobStatus(jobId: string): Promise<ProviderJobStatusResponse> {
  const baseUrl = process.env.COMFY_API_BASE_URL;
  const apiKey = process.env.COMFY_API_KEY;

  if (!baseUrl) {
    return {
      ok: false,
      errorMessage: "COMFY_API_BASE_URL is missing.",
    };
  }

  const historyUrl = buildUrl(baseUrl, `/history/${jobId}`);

  const historyResponse = await fetch(historyUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: "no-store",
  });

  const historyPayload = await safeJson(historyResponse);

  if (historyResponse.ok) {
    return mapComfyHistoryToResponse(historyPayload, jobId);
  }

  const queueUrl = buildUrl(baseUrl, "/queue");

  const queueResponse = await fetch(queueUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: "no-store",
  });

  const queuePayload = await safeJson(queueResponse);

  if (!queueResponse.ok) {
    return {
      ok: false,
      errorMessage: "ComfyUI status request failed.",
    };
  }

  const queueObj =
    queuePayload && typeof queuePayload === "object"
      ? (queuePayload as Record<string, unknown>)
      : {};

  const running = Array.isArray(queueObj.queue_running)
    ? queueObj.queue_running
    : [];
  const pending = Array.isArray(queueObj.queue_pending)
    ? queueObj.queue_pending
    : [];

  const inRunning = running.some((item) =>
    Array.isArray(item) ? String(item[1] ?? "") === jobId : false,
  );
  const inPending = pending.some((item) =>
    Array.isArray(item) ? String(item[1] ?? "") === jobId : false,
  );

  if (inRunning) {
    return {
      ok: true,
      status: "processing",
      imageUrl: null,
      errorMessage: null,
    };
  }

  if (inPending) {
    return {
      ok: true,
      status: "queued",
      imageUrl: null,
      errorMessage: null,
    };
  }

  return {
    ok: true,
    status: "processing",
    imageUrl: null,
    errorMessage: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const provider = normalizeProvider(
      request.nextUrl.searchParams.get("provider"),
    );
    const jobId = request.nextUrl.searchParams.get("jobId")?.trim() || "";

    if (!provider) {
      return json(
        {
          ok: false,
          errorMessage: "Invalid provider.",
        },
        { status: 400 },
      );
    }

    if (!jobId) {
      return json(
        {
          ok: false,
          errorMessage: "jobId is required.",
        },
        { status: 400 },
      );
    }

    const result =
      provider === "mage"
        ? await getMageJobStatus(jobId)
        : await getComfyJobStatus(jobId);

    const statusCode = result.ok ? 200 : 500;
    return json(result, { status: statusCode });
  } catch (error) {
    return json(
      {
        ok: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unexpected image status route error.",
      },
      { status: 500 },
    );
  }
}
