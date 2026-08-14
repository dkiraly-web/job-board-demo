import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export class ClaudeConfigError extends Error {}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeConfigError(
      "ANTHROPIC_API_KEY is not configured. Add it to .env.local to enable CV matching."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

const EXTRACTION_MODEL = "claude-haiku-4-5-20251001";
const SCORING_MODEL = "claude-sonnet-5";

export interface CvProfile {
  countryCode: string | null;
  countryName: string | null;
  confidence: "high" | "medium" | "low";
  keySkills: string[];
  seniority: string | null;
  summary: string;
}

function getToolInput<T>(message: Anthropic.Messages.Message, toolName: string): T {
  const block = message.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use" && b.name === toolName
  );
  if (!block) {
    throw new Error(`Claude did not return the expected "${toolName}" tool call.`);
  }
  return block.input as T;
}

export async function extractCvProfile(cvText: string): Promise<CvProfile> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    tools: [
      {
        name: "record_cv_profile",
        description: "Record structured facts extracted from a candidate's CV.",
        input_schema: {
          type: "object",
          properties: {
            countryCode: {
              type: ["string", "null"],
              description:
                "Best-guess ISO 3166-1 alpha-2 country code (lowercase, e.g. 'de', 'us', 'in') for the candidate's current home/base location, inferred from address, phone country code, or other contextual clues. Null if it cannot be reasonably determined.",
            },
            countryName: {
              type: ["string", "null"],
              description: "Human-readable country name matching countryCode, or null.",
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence in the countryCode guess.",
            },
            keySkills: {
              type: "array",
              items: { type: "string" },
              description:
                "12-20 short keywords/phrases summarizing the candidate's skills, tools, job functions, and industries (e.g. 'supply chain', 'embedded C++', 'project management', 'automotive').",
            },
            seniority: {
              type: ["string", "null"],
              description:
                "Best-guess seniority level, e.g. 'entry-level', 'associate', 'senior', 'manager', 'executive'. Null if unclear.",
            },
            summary: {
              type: "string",
              description: "One or two sentence summary of the candidate's professional profile.",
            },
          },
          required: ["countryCode", "countryName", "confidence", "keySkills", "seniority", "summary"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "record_cv_profile" },
    messages: [
      {
        role: "user",
        content: `Here is a candidate's CV. Extract their profile.\n\n<cv>\n${cvText}\n</cv>`,
      },
    ],
  });

  return getToolInput<CvProfile>(message, "record_cv_profile");
}

export interface JobForScoring {
  id: string;
  title: string;
  department?: string;
  function?: string;
  description: string;
}

export interface ScoredJob {
  id: string;
  score: 1 | 2 | 3 | 4 | 5;
  rationale: string;
}

export async function scoreJobMatches(
  cvText: string,
  jobs: JobForScoring[]
): Promise<ScoredJob[]> {
  if (jobs.length === 0) return [];

  const anthropic = getClient();

  const jobsBlock = jobs
    .map(
      (job) =>
        `<job id="${job.id}">\nTitle: ${job.title}\nDepartment: ${job.department ?? "n/a"}\nFunction: ${job.function ?? "n/a"}\nDescription: ${job.description}\n</job>`
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: SCORING_MODEL,
    max_tokens: 4096,
    tools: [
      {
        name: "record_job_scores",
        description:
          "Record a 1-5 skill/experience match score and short rationale for each candidate job, based purely on how well the candidate's skills and experience fit the role (ignore location entirely).",
        input_schema: {
          type: "object",
          properties: {
            scores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "The job's id, copied exactly from the <job id=...> tag." },
                  score: {
                    type: "integer",
                    minimum: 1,
                    maximum: 5,
                    description: "1 = poor fit, 5 = excellent fit, based on skills/experience/qualifications only.",
                  },
                  rationale: {
                    type: "string",
                    description: "One short sentence explaining the score.",
                  },
                },
                required: ["id", "score", "rationale"],
              },
            },
          },
          required: ["scores"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "record_job_scores" },
    messages: [
      {
        role: "user",
        content: `Candidate CV:\n<cv>\n${cvText}\n</cv>\n\nCandidate jobs to score (score skill/experience fit only, 1-5, ignore location):\n\n${jobsBlock}`,
      },
    ],
  });

  const result = getToolInput<{ scores: ScoredJob[] }>(message, "record_job_scores");
  return result.scores;
}
