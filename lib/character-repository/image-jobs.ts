import { supabase } from "@/lib/supabase";
import type { CharacterImageJobRepositoryInsert } from "../image-generation/types";

export type DbCharacterImageJob = {
  id: string;
  user_id: string;
  character_id: string;

  provider: string;
  engine: string;
  model: string;
  workflow_name: string;

  status: "queued" | "processing" | "completed" | "failed";
  request_type: string;
  prompt_version: number;

  prompt_input: Record<string, unknown>;
  resolved_prompt: string | null;
  negative_prompt: string | null;

  is_adult_only: boolean;
  subject_declared_18_plus: boolean;
  consent_confirmed: boolean;
  depicts_real_person: boolean;
  depicts_public_figure: boolean;
  non_consensual_flag: boolean;
  underage_risk_flag: boolean;
  illegal_content_flag: boolean;
  moderation_status: "pending" | "approved" | "blocked";
  moderation_notes: string | null;

  prompt_id: string | null;
  generation_count: number;
  max_generation_count: number;
  error_code: string | null;
  error_message: string | null;

  style_type: "realistic" | "anime" | null;
  request_mode: "preset" | "custom_prompt" | null;
  reference_image_ids: unknown;
  variation_type: string | null;
  seed: number | null;
  started_at: string | null;
  canonical_prompt: string | null;
  external_job_id: string | null;

  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type CreateCharacterImageJobInput = CharacterImageJobRepositoryInsert;

export type UpdateCharacterImageJobStatusInput = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  externalJobId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  completedAt?: string | null;
  startedAt?: string | null;
};

export type MarkCharacterImageJobCompletedInput = {
  jobId: string;
  externalJobId?: string | null;
  completedAt?: string | null;
};

export type MarkCharacterImageJobFailedInput = {
  jobId: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  externalJobId?: string | null;
  completedAt?: string | null;
};

type UntypedSupabase = {
  from: (table: string) => {
    insert: (values: unknown) => {
      select: (columns?: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    select: (columns?: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => Promise<{ data: unknown; error: unknown }>;
      };
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<{ data: unknown; error: unknown }>;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    };
    update: (values: unknown) => {
      eq: (column: string, value: unknown) => {
        select: (columns?: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
    delete: () => {
      eq: (column: string, value: unknown) => Promise<{ error: unknown }>;
    };
  };
};

const db = supabase as unknown as UntypedSupabase;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Unknown Supabase error");
}

function mapImageJobRow(row: Record<string, unknown>): DbCharacterImageJob {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    character_id: String(row.character_id ?? ""),

    provider: String(row.provider ?? "runware"),
    engine: String(row.engine ?? "runware"),
    model: String(row.model ?? ""),
    workflow_name: String(row.workflow_name ?? "character-avatar-v1"),

    status:
      row.status === "queued" ||
      row.status === "processing" ||
      row.status === "completed" ||
      row.status === "failed"
        ? row.status
        : "queued",
    request_type: String(row.request_type ?? "avatar"),
    prompt_version:
      typeof row.prompt_version === "number" ? row.prompt_version : 1,

    prompt_input: asObject(row.prompt_input),
    resolved_prompt:
      typeof row.resolved_prompt === "string" ? row.resolved_prompt : null,
    negative_prompt:
      typeof row.negative_prompt === "string" ? row.negative_prompt : null,

    is_adult_only:
      typeof row.is_adult_only === "boolean" ? row.is_adult_only : true,
    subject_declared_18_plus:
      typeof row.subject_declared_18_plus === "boolean"
        ? row.subject_declared_18_plus
        : true,
    consent_confirmed:
      typeof row.consent_confirmed === "boolean" ? row.consent_confirmed : true,
    depicts_real_person:
      typeof row.depicts_real_person === "boolean"
        ? row.depicts_real_person
        : false,
    depicts_public_figure:
      typeof row.depicts_public_figure === "boolean"
        ? row.depicts_public_figure
        : false,
    non_consensual_flag:
      typeof row.non_consensual_flag === "boolean"
        ? row.non_consensual_flag
        : false,
    underage_risk_flag:
      typeof row.underage_risk_flag === "boolean"
        ? row.underage_risk_flag
        : false,
    illegal_content_flag:
      typeof row.illegal_content_flag === "boolean"
        ? row.illegal_content_flag
        : false,
    moderation_status:
      row.moderation_status === "pending" ||
      row.moderation_status === "approved" ||
      row.moderation_status === "blocked"
        ? row.moderation_status
        : "pending",
    moderation_notes:
      typeof row.moderation_notes === "string" ? row.moderation_notes : null,

    prompt_id: typeof row.prompt_id === "string" ? row.prompt_id : null,
    generation_count:
      typeof row.generation_count === "number" ? row.generation_count : 0,
    max_generation_count:
      typeof row.max_generation_count === "number" ? row.max_generation_count : 4,
    error_code: typeof row.error_code === "string" ? row.error_code : null,
    error_message:
      typeof row.error_message === "string" ? row.error_message : null,

    style_type:
      row.style_type === "realistic" || row.style_type === "anime"
        ? row.style_type
        : null,
    request_mode:
      row.request_mode === "preset" || row.request_mode === "custom_prompt"
        ? row.request_mode
        : null,
    reference_image_ids: row.reference_image_ids ?? [],
    variation_type:
      typeof row.variation_type === "string" ? row.variation_type : null,
    seed: typeof row.seed === "number" ? row.seed : null,
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    canonical_prompt:
      typeof row.canonical_prompt === "string" ? row.canonical_prompt : null,
    external_job_id:
      typeof row.external_job_id === "string" ? row.external_job_id : null,

    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function buildCreatePayload(input: CreateCharacterImageJobInput) {
  return {
    user_id: input.userId,
    character_id: input.characterId,
    provider: input.provider,
    engine: input.provider,
    model: input.model ?? "default",
    workflow_name:
      input.kind === "variation"
        ? "character-variation-v1"
        : "character-avatar-v1",

    status: "queued",
    request_type: input.kind,
    prompt_version: 1,

    prompt_input: input.promptInputJson,
    resolved_prompt: input.canonicalPrompt,
    negative_prompt: input.negativePrompt,

    is_adult_only: input.moderation.isAdultOnly,
    subject_declared_18_plus: input.moderation.subjectDeclared18Plus,
    consent_confirmed: input.moderation.consentConfirmed,
    depicts_real_person: input.moderation.depictsRealPerson,
    depicts_public_figure: input.moderation.depictsPublicFigure,
    non_consensual_flag: input.moderation.nonConsensualFlag,
    underage_risk_flag: input.moderation.underageRiskFlag,
    illegal_content_flag: input.moderation.illegalContentFlag,
    moderation_status: input.moderation.moderationStatus,
    moderation_notes: input.moderation.moderationNotes ?? null,

    prompt_id: null,
    generation_count: 0,
    max_generation_count: input.kind === "variation" ? 2 : 4,
    error_code: null,
    error_message: null,

    style_type: input.styleType,
    request_mode: input.requestMode,
    reference_image_ids: input.referenceImageIds ?? [],
    variation_type: input.variationType ?? null,
    seed: input.seed ?? null,
    started_at: null,
    canonical_prompt: input.canonicalPrompt,
    external_job_id: null,
  };
}

export async function createCharacterImageJob(
  input: CreateCharacterImageJobInput,
): Promise<DbCharacterImageJob> {
  const payload = buildCreatePayload(input);

  const { data, error } = await db
    .from("character_image_jobs")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    throw asError(error);
  }

  if (!data) {
    throw new Error("Failed to create character image job.");
  }

  return mapImageJobRow(data as Record<string, unknown>);
}

export async function getCharacterImageJobById(
  jobId: string,
): Promise<DbCharacterImageJob | null> {
  const { data, error } = await db
    .from("character_image_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw asError(error);
  }

  if (!data) {
    return null;
  }

  return mapImageJobRow(data as Record<string, unknown>);
}

export async function listCharacterImageJobs(
  characterId: string,
): Promise<DbCharacterImageJob[]> {
  const query = db
    .from("character_image_jobs")
    .select("*")
    .eq("character_id", characterId);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw asError(error);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => mapImageJobRow(row as Record<string, unknown>));
}

export async function updateCharacterImageJobStatus(
  input: UpdateCharacterImageJobStatusInput,
): Promise<DbCharacterImageJob> {
  const payload: Record<string, unknown> = {
    status: input.status,
  };

  if (input.externalJobId !== undefined) {
    payload.external_job_id = input.externalJobId;
  }

  if (input.errorCode !== undefined) {
    payload.error_code = input.errorCode;
  }

  if (input.errorMessage !== undefined) {
    payload.error_message = input.errorMessage;
  }

  if (input.startedAt !== undefined) {
    payload.started_at = input.startedAt;
  }

  if (input.completedAt !== undefined) {
    payload.completed_at = input.completedAt;
  }

  const { data, error } = await db
    .from("character_image_jobs")
    .update(payload)
    .eq("id", input.jobId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw asError(error);
  }

  if (!data) {
    throw new Error("Failed to update character image job.");
  }

  return mapImageJobRow(data as Record<string, unknown>);
}

export async function markCharacterImageJobProcessing(
  jobId: string,
  externalJobId?: string | null,
): Promise<DbCharacterImageJob> {
  return updateCharacterImageJobStatus({
    jobId,
    status: "processing",
    externalJobId: externalJobId ?? null,
    startedAt: new Date().toISOString(),
  });
}

export async function markCharacterImageJobCompleted(
  input: MarkCharacterImageJobCompletedInput,
): Promise<DbCharacterImageJob> {
  return updateCharacterImageJobStatus({
    jobId: input.jobId,
    status: "completed",
    externalJobId: input.externalJobId ?? null,
    completedAt: input.completedAt ?? new Date().toISOString(),
  });
}

export async function markCharacterImageJobFailed(
  input: MarkCharacterImageJobFailedInput,
): Promise<DbCharacterImageJob> {
  return updateCharacterImageJobStatus({
    jobId: input.jobId,
    status: "failed",
    externalJobId: input.externalJobId ?? null,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    completedAt: input.completedAt ?? new Date().toISOString(),
  });
}

export async function deleteCharacterImageJob(jobId: string): Promise<void> {
  const { error } = await db
    .from("character_image_jobs")
    .delete()
    .eq("id", jobId);

  if (error) {
    throw asError(error);
  }
}
