"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

type AnswerRow = {
  question_id: string;
  selected_option_id: string | null;
  other_text: string | null;
  user_id: string;
};

export default function ResultsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsById, setOptionsById] = useState<
    Record<string, QuestionOption>
  >({});
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

      // Fetch ALL questions (both editions for comparison)
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .order("order_num");

      if (cancelled) return;
      setQuestions(questionsData || []);

      // Fetch all options and index by id
      const { data: optionsData } = await supabase
        .from("question_options")
        .select("*");

      if (cancelled) return;
      const optMap: Record<string, QuestionOption> = {};
      (optionsData || []).forEach((opt) => {
        optMap[opt.id] = opt;
      });
      setOptionsById(optMap);

      // Fetch all accessible answers (RLS handles visibility)
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

  function getAnswerText(answer: AnswerRow | undefined): string | null {
    if (!answer) return null;
    if (answer.selected_option_id && optionsById[answer.selected_option_id]) {
      const opt = optionsById[answer.selected_option_id];
      return `${opt.label}: ${opt.option_text}`;
    }
    if (answer.other_text) {
      return `Other: ${answer.other_text}`;
    }
    return null;
  }

  function answersMatch(a: AnswerRow | undefined, b: AnswerRow | undefined): boolean {
    if (!a || !b) return false;
    if (a.selected_option_id && b.selected_option_id) {
      return a.selected_option_id === b.selected_option_id;
    }
    return false;
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
            <div
              className="absolute inset-6 rounded-full bg-red/60 animate-pulse-glow"
              style={{ animationDelay: "0.5s" }}
            />
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

  // Group questions by order_num for side-by-side display
  const questionsByOrder: Record<
    number,
    { her?: Question; his?: Question }
  > = {};
  questions.forEach((q) => {
    if (!questionsByOrder[q.order_num]) questionsByOrder[q.order_num] = {};
    questionsByOrder[q.order_num][q.edition as "her" | "his"] = q;
  });

  const orderNums = Object.keys(questionsByOrder)
    .map(Number)
    .sort((a, b) => a - b);

  // Results view
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
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

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
          Results
        </h2>

        <div className="space-y-4">
          {orderNums.map((orderNum, idx) => {
            const pair = questionsByOrder[orderNum];
            // Show whichever question exists for this order_num
            const displayQuestion = pair.her || pair.his;
            if (!displayQuestion) return null;

            // Find answers: my answer is for whichever question I answered
            const myQ = pair.her
              ? myAnswers[pair.her.id]
                ? pair.her
                : pair.his
              : pair.his;
            const otherQ = pair.her
              ? otherAnswers[pair.her.id]
                ? pair.her
                : pair.his
              : pair.his;

            const myAnswer = myQ ? myAnswers[myQ.id] : undefined;
            const otherAnswer = otherQ ? otherAnswers[otherQ.id] : undefined;
            const matching = answersMatch(myAnswer, otherAnswer);

            return (
              <div
                key={orderNum}
                className="bg-surface rounded-2xl border border-divider p-5 sm:p-6 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Question header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">
                    {displayQuestion.intensity_emoji}
                  </span>
                  <p className="text-xs font-medium text-platinum/30 uppercase tracking-wider">
                    Q{orderNum} &middot; {displayQuestion.title}
                  </p>
                </div>
                <p className="text-sm sm:text-base text-platinum/60 mb-4 leading-relaxed line-clamp-3">
                  {displayQuestion.scenario}
                </p>

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
                    <p className="text-platinum font-medium text-sm">
                      {getAnswerText(myAnswer) || "\u2014"}
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
                    <p className="text-red font-medium text-sm">
                      {getAnswerText(otherAnswer) || "\u2014"}
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
