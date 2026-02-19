"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEditionForEmail } from "@/lib/editions";

type Question = {
  id: string;
  edition: string;
  order_num: number;
  intensity: string;
  intensity_emoji: string;
  title: string;
  scenario: string;
};

type QuestionOption = {
  id: string;
  question_id: string;
  label: string;
  option_text: string;
  is_other: boolean;
  order_num: number;
};

type Answer = {
  question_id: string;
  selected_option_id: string | null;
  other_text: string;
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<
    Record<string, QuestionOption[]>
  >({});
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

      // Determine edition for this user
      const edition = getEditionForEmail(user.email);
      if (!edition) {
        setError("No edition assigned to your account.");
        setLoading(false);
        return;
      }

      // Fetch questions for this edition
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("edition", edition)
        .order("order_num");

      if (questionsError) {
        setError("Failed to load questions.");
        setLoading(false);
        return;
      }

      // Fetch all options for these questions
      const questionIds = (questionsData || []).map((q) => q.id);
      const { data: optionsData } = await supabase
        .from("question_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_num");

      // Group options by question_id
      const grouped: Record<string, QuestionOption[]> = {};
      (optionsData || []).forEach((opt) => {
        if (!grouped[opt.question_id]) grouped[opt.question_id] = [];
        grouped[opt.question_id].push(opt);
      });

      setQuestions(questionsData || []);
      setOptionsByQuestion(grouped);
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
  const currentOptions = currentQuestion
    ? optionsByQuestion[currentQuestion.id] || []
    : [];

  function goNext() {
    setCurrentIndex((i) => i + 1);
    setAnimKey((k) => k + 1);
  }

  function goBack() {
    setCurrentIndex((i) => i - 1);
    setAnimKey((k) => k + 1);
  }

  function selectOption(option: QuestionOption) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        question_id: currentQuestion.id,
        selected_option_id: option.is_other ? null : option.id,
        other_text: option.is_other
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

  function isOptionSelected(option: QuestionOption): boolean {
    if (!currentAnswer) return false;
    if (option.is_other) {
      return (
        currentAnswer.selected_option_id === null &&
        currentAnswer.other_text !== undefined
      );
    }
    return currentAnswer.selected_option_id === option.id;
  }

  function hasSelection(): boolean {
    if (!currentAnswer) return false;
    // Either a regular option is selected, or "other" is selected (null id with other_text defined)
    return (
      currentAnswer.selected_option_id !== null ||
      currentAnswer.other_text !== undefined
    );
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
      selected_option_id: a.selected_option_id,
      other_text:
        a.selected_option_id === null && a.other_text ? a.other_text : null,
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

  const isOtherSelected =
    currentAnswer?.selected_option_id === null &&
    currentAnswer?.other_text !== undefined;

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
          style={{ animationDuration: "0.25s" }}
        >
          <div className="bg-surface rounded-2xl border border-divider p-6 sm:p-8">
            {/* Intensity + Title */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{currentQuestion.intensity_emoji}</span>
              <span className="text-sm font-medium text-platinum/50 uppercase tracking-wider">
                {currentQuestion.title}
              </span>
            </div>

            {/* Scenario */}
            <p className="text-base sm:text-lg text-platinum/90 mb-8 leading-relaxed">
              {currentQuestion.scenario}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {currentOptions
                .filter((opt) => !opt.is_other)
                .map((option) => {
                  const selected = isOptionSelected(option);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(option)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selected
                          ? "border-red bg-red/10 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                          : "border-divider bg-bg hover:border-red-dark hover:bg-bg/80"
                      }`}
                    >
                      <div className="flex items-start">
                        <div
                          className={`w-5 h-5 mt-0.5 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                            selected
                              ? "border-red bg-red"
                              : "border-platinum/30"
                          }`}
                        >
                          {selected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <span
                            className={`text-xs font-semibold mr-2 ${
                              selected ? "text-red" : "text-platinum/40"
                            }`}
                          >
                            {option.label}
                          </span>
                          <span
                            className={`text-sm sm:text-base ${
                              selected ? "text-white" : "text-platinum/80"
                            }`}
                          >
                            {option.option_text}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

              {/* Other option */}
              {currentOptions
                .filter((opt) => opt.is_other)
                .map((option) => (
                  <div key={option.id}>
                    <button
                      type="button"
                      onClick={() => selectOption(option)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isOtherSelected
                          ? "border-red bg-red/10 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                          : "border-divider bg-bg hover:border-red-dark hover:bg-bg/80"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                            isOtherSelected
                              ? "border-red bg-red"
                              : "border-platinum/30"
                          }`}
                        >
                          {isOtherSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span
                          className={`text-sm sm:text-base ${
                            isOtherSelected
                              ? "text-white"
                              : "text-platinum/80"
                          }`}
                        >
                          Other
                        </span>
                      </div>
                    </button>

                    {isOtherSelected && (
                      <input
                        type="text"
                        value={currentAnswer?.other_text || ""}
                        onChange={(e) => setOtherText(e.target.value)}
                        placeholder="Tell us what you'd really do..."
                        className="w-full mt-3 px-4 py-3 bg-bg border border-divider rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red focus:border-transparent transition-all animate-fade-in"
                        autoFocus
                      />
                    )}
                  </div>
                ))}
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
              disabled={submitting || !hasSelection()}
              className="flex-1 sm:flex-none px-8 py-3 bg-red text-white font-semibold rounded-xl hover:bg-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!hasSelection()}
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
