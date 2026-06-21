import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Leaf, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGuest } from "@/app/providers";
import type { ProfileCore } from "@/types";
import { P, PAGE_SHELL } from "@/theme/palette";
import { BaselineLandscape } from "@/features/baseline/BaselineLandscape";
import { CarbonMemoryPreview } from "@/features/baseline/CarbonMemoryPreview";
import { SetupQuestionCard } from "@/features/baseline/SetupQuestionCard";
import {
  STEP1_QUESTIONS,
  STEP2_QUESTIONS,
  buildStep1Profile,
  countAnsweredStep1,
  countAnsweredStep2,
  fillMissingBaselineDefaults,
  parseDistanceInput,
} from "@/features/baseline/baselineQuestions";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

function CustomFieldInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: "rgba(255,255,255,0.82)",
        borderColor: P.border,
        color: P.charcoal,
        outlineColor: P.green,
      }}
    />
  );
}

export function BaselinePage() {
  const { updateProfile } = useGuest();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [answers, setAnswers] = useState<Partial<ProfileCore>>({});
  const [customCity, setCustomCity] = useState("");
  const [customDistance, setCustomDistance] = useState("");

  const step1Answered = useMemo(
    () => countAnsweredStep1(answers as Record<string, unknown>, customCity, customDistance),
    [answers, customCity, customDistance],
  );

  const step2Answered = useMemo(
    () => countAnsweredStep2(answers as Record<string, unknown>),
    [answers],
  );

  const activeQuestions = step === 1 ? STEP1_QUESTIONS : STEP2_QUESTIONS;
  const answeredCount = step === 1 ? step1Answered : step2Answered;
  const canContinue = answeredCount >= 3;

  const setField = useCallback((field: keyof ProfileCore, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveStep1 = useCallback(() => {
    const profilePatch = buildStep1Profile(
      answers as Record<string, unknown>,
      customCity,
      customDistance,
    );
    updateProfile(profilePatch as Partial<ProfileCore>);
  }, [answers, customCity, customDistance, updateProfile]);

  const saveAllAndFinish = useCallback(() => {
    const step1 = buildStep1Profile(
      answers as Record<string, unknown>,
      customCity,
      customDistance,
    );
    const merged = { ...step1, ...(answers as Record<string, unknown>) };
    const finalPatch = fillMissingBaselineDefaults(merged);
    updateProfile(finalPatch as Partial<ProfileCore>);
    navigate("/today");
  }, [answers, customCity, customDistance, navigate, updateProfile]);

  const handleContinue = () => {
    if (!canContinue) return;

    if (step === 1) {
      saveStep1();
      setStep(2);
      return;
    }

    saveAllAndFinish();
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    navigate("/welcome");
  };

  const headerTitle = step === 1 ? "Build your Carbon Memory" : "Complete your Carbon Memory";
  const headerSubtitle =
    step === 1
      ? "Answer a few basics so Panda AI can stop asking repeated questions later."
      : "A few more details help Panda estimate your daily trail more accurately.";

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: P.cream }}>
      <BaselineLandscape />

      <div className={`relative z-10 ${PAGE_SHELL} px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10`}>
        <header className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.6)", borderColor: P.border, color: P.mutedText }}>
            <Sparkles size={14} style={{ color: P.green }} aria-hidden="true" />
            Step {step} of 2 · Guest setup
          </div>
          <h1
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}
          >
            {headerTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed sm:text-base lg:mx-0" style={{ color: P.mutedText }}>
            {headerSubtitle}
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex min-w-0 flex-col gap-4 sm:gap-5" aria-label="Setup questions">
            {activeQuestions.map((question) => {
              const fieldValue = answers[question.field as keyof ProfileCore];
              const showCustom =
                question.customInput &&
                (question.customInput.optional ||
                  question.customInput.showWhenValue === undefined ||
                  fieldValue === question.customInput.showWhenValue ||
                  question.field === "usualCommuteDistanceKm");

              return (
                <SetupQuestionCard
                  key={question.field}
                  title={question.title}
                  label={question.label}
                  helperText={question.helperText}
                  Icon={question.Icon}
                  options={question.options}
                  selected={
                    question.field === "usualCommuteDistanceKm" && customDistance.trim() && fieldValue === undefined
                      ? undefined
                      : (fieldValue as string | number | undefined)
                  }
                  onSelect={(value) => {
                    setField(question.field as keyof ProfileCore, value);
                    if (question.field === "usualCommuteDistanceKm" && value !== "unknown") {
                      setCustomDistance("");
                    }
                  }}
                  customInput={
                    showCustom && question.customInput ? (
                      <CustomFieldInput
                        value={
                          question.field === "homeRegion"
                            ? customCity
                            : question.field === "usualCommuteDistanceKm"
                              ? customDistance
                              : ""
                        }
                        onChange={(text) => {
                          if (question.field === "homeRegion") {
                            setCustomCity(text);
                            return;
                          }
                          if (question.field === "usualCommuteDistanceKm") {
                            setCustomDistance(text);
                            const parsed = parseDistanceInput(text);
                            if (parsed !== undefined) {
                              setField("usualCommuteDistanceKm", parsed);
                            } else {
                              setField("usualCommuteDistanceKm", undefined);
                            }
                          }
                        }}
                        placeholder={question.customInput.placeholder}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </section>

          <div className="min-w-0 lg:sticky lg:top-8">
            {step === 1 ? (
              <CarbonMemoryPreview
                livingArea={answers.homeRegion}
                optionalRegion={customCity}
                workMode={answers.usualWorkMode}
                commuteMode={answers.usualCommuteMode}
                distance={answers.usualCommuteDistanceKm}
                customDistance={customDistance}
                answeredCount={step1Answered}
                totalQuestions={4}
              />
            ) : (
              <aside
                className="rounded-[1.5rem] border p-5 shadow-lg sm:p-6"
                style={{
                  background: "rgba(253, 250, 244, 0.92)",
                  borderColor: "rgba(255,255,255,0.75)",
                  boxShadow: "0 16px 48px rgba(42, 54, 40, 0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ background: `${P.green}14`, color: P.green }}
                  >
                    <Leaf size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
                      Almost there
                    </h2>
                    <p className="text-xs" style={{ color: P.mutedText }}>
                      These habits shape your food, energy, and delivery trail.
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: P.mutedText }}>
                  {step2Answered} of 4 answered · Panda AI learns faster when you share even rough estimates.
                </p>
              </aside>
            )}
          </div>
        </div>

        <footer className="mx-auto mt-8 max-w-3xl lg:max-w-none">
          {!canContinue ? (
            <p className="mb-4 text-center text-xs sm:text-sm lg:text-left" style={{ color: P.faintText }}>
              Answer at least 3 to build your first Carbon Memory.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
              style={{ borderColor: P.border, color: P.charcoal, outlineColor: P.green }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back
            </button>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:ml-auto sm:w-auto"
              style={{ background: P.green, fontFamily: DISPLAY_FONT, outlineColor: P.green }}
            >
              {step === 2 ? "Continue to Today" : "Continue"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
