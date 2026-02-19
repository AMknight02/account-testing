"use client";

import { useState, useEffect, useRef } from "react";
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

type AnswerRow = {
  question_id: string;
  selected_option: string;
  other_text: string | null;
  user_id: string;
};

export default function ResultsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myAnswers, setMyAnswers] = useState<Record<string, AnswerRow>>({});
  const [otherAnswers, setOtherAnswers] = useState<Record<string, AnswerRow>>(
    {}
  );
  const [otherCompleted, setOtherCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: completions } = await supabase
        .from("completion_status")
        .select("user_id");

      const myCompletion = completions?.some((c) => c.user_id === user.id);
      if (!myCompletion) {
        router.push("/questions");
        return;
      }

      const otherUserCompleted =
        completions?.some((c) => c.user_id !== user.id) ?? false;

      if (cancelled) return;
      setOtherCompleted(otherUserCompleted);

      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .order("order_num");

      if (cancelled) return;
      setQuestions(questionsData || []);

      const { data: answersData } = await supabase
        .from("answers")
        .select("*");

      if (cancelled) return;

      const myMap: Record<string, AnswerRow> = {};
      const otherMap: Record<string, AnswerRow> = {};

      answersData?.forEach((a) => {
        if (a.user_id === user.id) {
          myMap[a.question_id] = a;
        } else {
          otherMap[a.question_id] = a;
        }
      });

      setMyAnswers(myMap);
      setOtherAnswers(otherMap);
      setLoading(false);

      if (otherUserCompleted && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    fetchData();

    intervalRef.current = setInterval(fetchData, 5000);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router]);

  function getOptionText(
    question: Question,
    option: string,
    otherText?: string | null
  ) {
    if (option === "other") return otherText || "Other";
    const key = `option_${option}` as keyof Question;
    return question[key] as string;
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

  // Waiting state
  if (!otherCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
        <div className="text-center">
          {/* Pulsing red glow */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-red/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-red/30 animate-pulse-glow" />
            <div className="absolute inset-4 rounded-full bg-red/40 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-red/60 animate-pulse-glow" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-8 rounded-full bg-red" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Waiting for the other person...
          </h1>
          <p className="text-platinum/40 text-sm">
            This page will update automatically
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-12 text-sm text-platinum/30 hover:text-platinum/60 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Results view
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-lg font-bold tracking-wider uppercase">
            <span className="text-white">Red Light </span>
            <span className="text-red">District</span>
          </h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-platinum/40 hover:text-platinum transition-colors"
          >
            Sign out
          </button>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
          Results
        </h2>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const myAnswer = myAnswers[q.id];
            const otherAnswer = otherAnswers[q.id];
            const matching =
              myAnswer &&
              otherAnswer &&
              myAnswer.selected_option === otherAnswer.selected_option;

            return (
              <div
                key={q.id}
                className="bg-surface rounded-2xl border border-divider p-5 sm:p-6 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <p className="text-xs font-medium text-platinum/30 uppercase tracking-wider mb-1">
                  Question {idx + 1}
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4 leading-relaxed">
                  {q.text}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      matching
                        ? "border-red/30 bg-red/5"
                        : "border-divider bg-bg"
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-platinum/40 uppercase tracking-widest mb-1">
                      You
                    </p>
                    <p className="text-platinum font-medium">
                      {myAnswer
                        ? getOptionText(
                            q,
                            myAnswer.selected_option,
                            myAnswer.other_text
                          )
                        : "\u2014"}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      matching
                        ? "border-red/30 bg-red/5"
                        : "border-divider bg-bg"
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-red/60 uppercase tracking-widest mb-1">
                      Them
                    </p>
                    <p className="text-red font-medium">
                      {otherAnswer
                        ? getOptionText(
                            q,
                            otherAnswer.selected_option,
                            otherAnswer.other_text
                          )
                        : "\u2014"}
                    </p>
                  </div>
                </div>

                {matching && (
                  <p className="text-xs text-red/60 mt-2 text-center font-medium">
                    Match
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
