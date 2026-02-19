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

      // Check if already completed
      const { data: completion } = await supabase
        .from("completion_status")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (completion) {
        router.push("/results");
        return;
      }

      // Fetch questions
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <p className="text-sm text-gray-500">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {(["a", "b", "c", "d"] as const).map((option) => {
              const optionText = currentQuestion[
                `option_${option}` as keyof Question
              ] as string;
              return (
                <label
                  key={option}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentAnswer?.selected_option === option
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    checked={currentAnswer?.selected_option === option}
                    onChange={() => selectOption(option)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-gray-800">{optionText}</span>
                </label>
              );
            })}

            <label
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                currentAnswer?.selected_option === "other"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="option"
                checked={currentAnswer?.selected_option === "other"}
                onChange={() => selectOption("other")}
                className="mr-3 text-blue-600"
              />
              <span className="text-gray-800">Other</span>
            </label>

            {currentAnswer?.selected_option === "other" && (
              <input
                type="text"
                value={currentAnswer.other_text || ""}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Please specify..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
              />
            )}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            disabled={currentIndex === 0}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !currentAnswer?.selected_option}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              disabled={!currentAnswer?.selected_option}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
