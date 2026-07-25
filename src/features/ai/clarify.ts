// AI-driven clarifying questions for architecture generation.
//
// Before generating an AWS architecture diagram, we ask the model whether the
// user's request is specific enough to design a properly layered architecture
// (VPC/subnets/AZs, right services, HA requirements, etc). If not, the model
// proposes a small set of short, multiple-choice follow-up questions. This
// acts like a lightweight planning agent step rather than a fixed wizard, so
// the questions actually reflect what's missing from the specific request.
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];
  /** Whether the user can select multiple options (checklist) vs exactly one (single choice). */
  multiSelect: boolean;
}

const CLARIFY_SYSTEM_PROMPT = `You are an AWS solutions architect assistant. Your job is to decide whether you have ENOUGH information to design a properly layered AWS architecture (VPC, subnets, availability zones, and the right set of AWS services) for the user's request, and if not, ask a small number of short, specific follow-up questions presented as either single-choice or checklist (multi-select) options.

BE CONSERVATIVE about asking at all:
- Most requests that already name specific services, a workload type, or a clear use case ("serverless API with API Gateway, Lambda, DynamoDB") are already clear enough — set needsClarification to false for these.
- Only ask a question if NOT knowing the answer would genuinely change which AWS services or network layers you'd include. If you could make a reasonable, defensible default assumption instead, do that silently and don't ask.
- Never ask a question whose options don't meaningfully differ in architectural impact (e.g. don't ask about a color scheme, naming convention, or anything cosmetic).
- Never ask a checklist question where realistically only one answer applies — that's a single-choice question in disguise. Use multiSelect: true ONLY when a reasonable user could pick more than one option at the same time for THIS specific request.

Examples of GOOD questions (ask these kinds of things, and only when genuinely unclear from the request):
- "What is the expected traffic scale?" (single-choice: Low/Medium/High/Enterprise) — changes whether you need multi-AZ, auto-scaling, caching.
- "Which capabilities must the application support?" (multiSelect: true — Auth, File uploads, Real-time updates, Background jobs, Admin panel) — several can genuinely apply at once.
- "Does this need a relational or NoSQL database, or neither?" (single-choice) — directly changes which database service to use.

Examples of BAD questions (never ask these):
- Anything about naming, colors, branding, or diagram styling.
- Checklist questions with only one plausible real answer (e.g. "What is the primary workload type?" should be single-choice, not multiSelect).
- Redundant questions that just restate something already stated in the request.

For each question, decide the type carefully:
- multiSelect: false — for questions with one mutually-exclusive answer (workload type, traffic scale, primary database type).
- multiSelect: true — ONLY for questions listing independent capabilities/features that could co-exist (required app capabilities, optional AWS services to include).

Other rules:
- Ask at most 4 questions. Fewer is better. Zero is often correct — don't force questions onto a clear request.
- Each question must have 3 to 7 short, concrete, mutually distinct options, plus exactly one final option literally named "Other" (do not add "Other" more than once, and do not add it if it would be a duplicate of an existing option).
- If the request is already specific and detailed enough to design a complete layered architecture, set needsClarification to false and return an empty questions array.
- Respond ONLY with JSON matching the provided schema. Never include prose, markdown, or commentary outside the JSON.`;

// Cast to `any` when passed to the SDK: the Google Generative AI SDK's Schema
// union type is deeply nested and not worth fighting for a plain data literal.
const QUESTIONS_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    needsClarification: {
      type: SchemaType.BOOLEAN,
      description:
        "Whether the request is ambiguous enough to warrant follow-up questions before generating an architecture diagram.",
    },
    questions: {
      type: SchemaType.ARRAY,
      description: "Up to 4 short follow-up questions to ask the user, only if needed.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: {
            type: SchemaType.STRING,
            description: 'Short slug id for this question, e.g. "workload_type".',
          },
          question: {
            type: SchemaType.STRING,
            description: "The question text to show the user.",
          },
          multiSelect: {
            type: SchemaType.BOOLEAN,
            description:
              "True if the user should be able to select multiple options (checklist). False if exactly one option applies (single choice).",
          },
          options: {
            type: SchemaType.ARRAY,
            description:
              '4-8 concise options the user can pick from. Always include "Other" as the last option.',
            items: { type: SchemaType.STRING },
          },
        },
        required: ["id", "question", "options", "multiSelect"],
      },
    },
  },
  required: ["needsClarification", "questions"],
};

/**
 * Asks the model whether it needs clarification for the given architecture
 * request, and if so, what to ask. Returns an empty array when no
 * clarification is needed (or on any failure — clarification is a best-effort
 * enhancement and should never block diagram generation).
 */
export async function generateClarifyingQuestions(
  apiKey: string,
  model: string,
  userInput: string
): Promise<ClarifyingQuestion[]> {
  if (!apiKey || !userInput.trim()) return [];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const mdl = genAI.getGenerativeModel({
      model,
      systemInstruction: CLARIFY_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: QUESTIONS_RESPONSE_SCHEMA as any,
        temperature: 0.2,
      },
    });

    const result = await mdl.generateContent(userInput);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (!parsed?.needsClarification || !Array.isArray(parsed.questions)) {
      return [];
    }

    return parsed.questions
      .filter(
        (q: any) =>
          q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length > 0
      )
      .slice(0, 4)
      .map((q: any, idx: number) => {
        // De-dupe and ensure "Other" appears exactly once, as the last option,
        // regardless of what the model actually returned.
        const cleanedOptions = q.options
          .filter((o: any) => typeof o === "string" && o.trim())
          .map((o: string) => o.trim())
          .filter((o: string) => o.toLowerCase() !== "other");
        cleanedOptions.push("Other");

        return {
          id: typeof q.id === "string" && q.id ? q.id : `q${idx}`,
          question: q.question,
          options: cleanedOptions,
          multiSelect: q.multiSelect === true,
        };
      })
      .filter((q: ClarifyingQuestion) => q.options.length > 1); // must have at least one real option besides "Other"
  } catch (err) {
    // Clarification is a best-effort UX enhancement. If it fails for any
    // reason (bad API key, network error, malformed JSON), fall through to
    // direct generation rather than blocking the user.
    console.error("[clarify] Failed to generate clarifying questions:", err);
    return [];
  }
}
