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

type ResultCard = {
  owner: "jessica" | "andy";
  orderNum: number;
  question: Question;
};

export default function ResultsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsById, setOptionsById] = useState<
    Record<string, QuestionOption>
  >({});
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, AnswerRow>
  >({});
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

      // Fetch ALL questions (both editions)
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
      // Index by question_id — each user answers only their edition,
      // so there's at most one answer per question.
      const aMap: Record<string, AnswerRow> = {};
      answersData?.forEach((a) => {
        aMap[a.question_id] = a;
      });
      setAnswersByQuestionId(aMap);
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

  // Group questions by order_num with her/his variants
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

  // Build a flat list of cards: Jessica's question then Andy's question for each order_num
  const cards: ResultCard[] = [];
  orderNums.forEach((orderNum) => {
    const pair = questionsByOrder[orderNum];
    if (pair.her) cards.push({ owner: "jessica", orderNum, question: pair.her });
    if (pair.his) cards.push({ owner: "andy", orderNum, question: pair.his });
  });

  // Results view — all 30 questions interleaved
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
          {cards.map((card, idx) => {
            const { owner, orderNum, question } = card;
            const isJessica = owner === "jessica";

            // Look up the paired question for the other edition at the same order_num
            const pair = questionsByOrder[orderNum];
            const herQ = pair.her;
            const hisQ = pair.his;

            // Jessica answers her edition questions; Andy answers his edition questions
            const jessicaAnswer = herQ
              ? answersByQuestionId[herQ.id]
              : undefined;
            const andyAnswer = hisQ
              ? answersByQuestionId[hisQ.id]
              : undefined;

            return (
              <div
                key={`${orderNum}-${owner}`}
                className="bg-surface rounded-2xl border border-divider p-5 sm:p-6 animate-fade-in"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Question header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">
                    {question.intensity_emoji}
                  </span>
                  <p
                    className={`text-xs font-medium uppercase tracking-wider ${
                      isJessica ? "text-platinum/30" : "text-red/40"
                    }`}
                  >
                    Q{orderNum} &middot; {question.title}
                  </p>
                </div>

                {/* Owner label */}
                <p
                  className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${
                    isJessica ? "text-platinum/50" : "text-red/50"
                  }`}
                >
                  {isJessica ? "Jessica\u2019s Question" : "Andy\u2019s Question"}
                </p>

                {/* Scenario */}
                <p className="text-sm sm:text-base text-platinum/60 mb-4 leading-relaxed">
                  {question.scenario}
                </p>

                {/* Answers — owner's answer first, then the other person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isJessica ? (
                    <>
                      <div className="p-3 rounded-xl border border-divider bg-bg">
                        <p className="text-[10px] font-semibold text-platinum/40 uppercase tracking-widest mb-1">
                          Jessica
                        </p>
                        <p className="text-platinum font-medium text-sm">
                          {getAnswerText(jessicaAnswer) || "\u2014"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border border-divider bg-bg">
                        <p className="text-[10px] font-semibold text-red/60 uppercase tracking-widest mb-1">
                          Andy
                        </p>
                        <p className="text-red font-medium text-sm">
                          {getAnswerText(andyAnswer) || "\u2014"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl border border-divider bg-bg">
                        <p className="text-[10px] font-semibold text-red/60 uppercase tracking-widest mb-1">
                          Andy
                        </p>
                        <p className="text-red font-medium text-sm">
                          {getAnswerText(andyAnswer) || "\u2014"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border border-divider bg-bg">
                        <p className="text-[10px] font-semibold text-platinum/40 uppercase tracking-widest mb-1">
                          Jessica
                        </p>
                        <p className="text-platinum font-medium text-sm">
                          {getAnswerText(jessicaAnswer) || "\u2014"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
