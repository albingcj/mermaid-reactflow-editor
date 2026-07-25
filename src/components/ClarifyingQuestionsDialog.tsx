import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, SkipForward, Check } from "lucide-react";
import type { ClarifyingQuestion } from "@/features/ai/clarify";

const OTHER_OPTION = "Other";

// Each answer is stored as an array of selected option strings, whether the
// question is single-choice (array with 0-1 entries) or a checklist
// (array with 0-N entries). This keeps the data model uniform. If "Other"
// was selected, the free-text value is stored separately and substituted
// in when the answers are folded back into the prompt.
export interface ClarifyingAnswers {
  [questionId: string]: string[];
}

interface ClarifyingQuestionsInlineProps {
  questions: ClarifyingQuestion[];
  onComplete: (answers: ClarifyingAnswers) => void;
  onSkip: () => void;
  onBackToPrompt: () => void;
}

/**
 * Inline clarifying-questions wizard rendered directly inside the AI side panel.
 * Replaces the input area temporarily while the user answers 1–4 AI-generated
 * questions to help produce a better architecture diagram.
 *
 * Supports two question types:
 * - Single choice: exactly one option (radio-style selection).
 * - Checklist (multiSelect): any number of options (checkbox-style selection).
 *
 * Both types require an explicit Next/Generate click to advance — no
 * auto-advance on selection. An earlier version auto-advanced single-choice
 * questions after a short delay, but that made the flow feel like it was
 * skipping ahead unpredictably. Explicit confirmation is slightly slower but
 * predictable, which matters more here.
 *
 * "Other" is always treated as a special option: selecting it reveals a
 * free-text field so the user isn't limited to the AI-generated choices.
 *
 * UX principles applied:
 * - One question at a time to reduce cognitive load
 * - Large tap targets for options (full-width buttons)
 * - Clear progress indicator (step X of N)
 * - Keyboard accessible (Ctrl/Cmd+Enter to proceed)
 * - Minimal chrome: no modal, no overlay, stays in-context
 */
export function ClarifyingQuestionsInline({
  questions,
  onComplete,
  onSkip,
  onBackToPrompt,
}: ClarifyingQuestionsInlineProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ClarifyingAnswers>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});

  // Reset when questions change (new generation attempt)
  useEffect(() => {
    setStep(0);
    setAnswers({});
    setOtherText({});
  }, [questions]);

  if (questions.length === 0) return null;

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const selectedOptions = answers[current.id] ?? [];
  const otherIsSelected = selectedOptions.includes(OTHER_OPTION);

  // Resolve the answer(s) to submit for a question, substituting the free-text
  // value in place of the literal "Other" placeholder.
  const resolveAnswer = (all: ClarifyingAnswers, text: Record<string, string>): ClarifyingAnswers => {
    const resolved: ClarifyingAnswers = {};
    for (const [qid, opts] of Object.entries(all)) {
      resolved[qid] = opts.map((o) =>
        o === OTHER_OPTION ? (text[qid]?.trim() ? text[qid].trim() : OTHER_OPTION) : o
      );
    }
    return resolved;
  };

  const goNext = () => {
    if (isLast) {
      onComplete(resolveAnswer(answers, otherText));
    } else {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step === 0) {
      onBackToPrompt();
    } else {
      setStep((s) => s - 1);
    }
  };

  const toggleOption = (option: string) => {
    setAnswers((prev) => {
      const existing = prev[current.id] ?? [];
      if (current.multiSelect) {
        const next = existing.includes(option)
          ? existing.filter((o) => o !== option)
          : [...existing, option];
        return { ...prev, [current.id]: next };
      }
      // Single choice: selecting a new option replaces the previous selection.
      // Deselecting by clicking the same option again is allowed too.
      const next = existing.includes(option) ? [] : [option];
      return { ...prev, [current.id]: next };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {step + 1} / {questions.length}
        </span>
      </div>

      {/* Question */}
      <div>
        <h3 className="text-sm font-medium leading-snug">{current.question}</h3>
        {current.multiSelect && (
          <p className="text-[11px] text-muted-foreground mt-0.5">Select all that apply</p>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-1.5">
        {current.options.map((option) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-md border text-sm transition-all hover:bg-accent/60 focus:outline-none focus:ring-1 focus:ring-primary ${
                isSelected
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border bg-card"
              }`}
            >
              {current.multiSelect ? (
                <span
                  className={`flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
              ) : (
                <span
                  className={`flex-shrink-0 h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
              )}
              {option}
            </button>
          );
        })}

        {/* Free-text field revealed when "Other" is selected */}
        {otherIsSelected && (
          <Input
            autoFocus
            placeholder="Type your answer..."
            value={otherText[current.id] ?? ""}
            onChange={(e) =>
              setOtherText((prev) => ({ ...prev, [current.id]: e.target.value }))
            }
            className="mt-1 h-8 text-sm"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          {step === 0 ? "Edit prompt" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="h-3 w-3" />
            Skip all
          </button>
          <Button size="sm" className="h-7 text-xs px-3" onClick={goNext}>
            {isLast ? "Generate" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Keep the old export name for backward compat with any existing imports
export { ClarifyingQuestionsInline as ClarifyingQuestionsDialog };
