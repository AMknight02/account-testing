"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: string;
  order_num: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type Answer = {
  question_id: string;
  selected_option: string;
  other_text: string;
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [animKey, setAnimKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: completion } = await supabase
        .from("completion_status")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (completion) {
        router.push("/results");
        return;
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .order("order_num");

      if (questionsError) {
        setError("Failed to load questions.");
        setLoading(false);
        return;
      }

      setQuestions(questionsData || []);
      setLoading(false);
    }

    init();
  }, [router]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLast = currentIndex === totalQuestions - 1;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  function goNext() {
    setCurrentIndex((i) => i + 1);
    setAnimKey((k) => k + 1);
  }

  function goBack() {
    setCurrentIndex((i) => i - 1);
    setAnimKey((k) => k + 1);
  }

  function selectOption(option: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        question_id: currentQuestion.id,
        selected_option: option,
        other_text:
          option === "other"
            ? prev[currentQuestion.id]?.other_text || ""
            : "",
      },
    }));
  }

  function setOtherText(text: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        other_text: text,
      },
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const answerRows = Object.values(answers).map((a) => ({
      user_id: user.id,
      question_id: a.question_id,
      selected_option: a.selected_option,
      other_text: a.selected_option === "other" ? a.other_text : null,
    }));

    const { error: answersError } = await supabase
      .from("answers")
      .insert(answerRows);

    if (answersError) {
      setError("Failed to submit answers. Please try again.");
      setSubmitting(false);
      return;
    }

    const { error: statusError } = await supabase
      .from("completion_status")
      .insert({ user_id: user.id });

    if (statusError) {
      setError("Failed to record completion. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/results");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-red animate-fade-in">{error}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-platinum/60">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-title italic text-2xl tracking-[0.04em] text-red">
            Red Dressed
          </h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-platinum/40 hover:text-platinum transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-platinum/60">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <p className="text-sm font-semibold text-red">
            {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
          </p>
        </div>
        <div className="w-full bg-divider rounded-full h-1.5 mb-8">
          <div
            className="bg-red h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>

        {/* Question Card */}
        <div
          key={animKey}
          className="animate-fade-in"
          style={{
            animationDuration: "0.25s",
          }}
        >
          <div className="bg-surface rounded-2xl border border-divider p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>

            <div className="space-y-3">
              {(["a", "b", "c", "d"] as const).map((option) => {
                const optionText = currentQuestion[
                  `option_${option}` as keyof Question
                ] as string;
                const isSelected = currentAnswer?.selected_option === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectOption(option)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? "border-red bg-red/10 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                        : "border-divider bg-bg hover:border-red-dark hover:bg-bg/80"
                    }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? "border-red bg-red"
                            : "border-platinum/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span
                        className={`text-base ${
                          isSelected ? "text-white" : "text-platinum/80"
                        }`}
                      >
                        {optionText}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Other option */}
              <button
                type="button"
                onClick={() => selectOption("other")}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  currentAnswer?.selected_option === "other"
                    ? "border-red bg-red/10 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                    : "border-divider bg-bg hover:border-red-dark hover:bg-bg/80"
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                      currentAnswer?.selected_option === "other"
                        ? "border-red bg-red"
                        : "border-platinum/30"
                    }`}
                  >
                    {currentAnswer?.selected_option === "other" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={`text-base ${
                      currentAnswer?.selected_option === "other"
                        ? "text-white"
                        : "text-platinum/80"
                    }`}
                  >
                    Other
                  </span>
                </div>
              </button>

              {currentAnswer?.selected_option === "other" && (
                <input
                  type="text"
                  value={currentAnswer.other_text || ""}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Please specify..."
                  className="w-full px-4 py-3 bg-bg border border-divider rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red focus:border-transparent transition-all animate-fade-in"
                  autoFocus
                />
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red text-sm mt-4 animate-fade-in">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-4">
          <button
            onClick={goBack}
            disabled={currentIndex === 0}
            className="px-6 py-3 text-platinum/60 bg-surface border border-divider rounded-xl hover:border-red-dark hover:text-platinum disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            Back
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !currentAnswer?.selected_option}
              className="flex-1 sm:flex-none px-8 py-3 bg-red text-white font-semibold rounded-xl hover:bg-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!currentAnswer?.selected_option}
              className="flex-1 sm:flex-none px-8 py-3 bg-red text-white font-semibold rounded-xl hover:bg-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
