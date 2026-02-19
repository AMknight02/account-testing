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

      // Check completion status for all users
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

      // Fetch questions
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .order("order_num");

      if (cancelled) return;
      setQuestions(questionsData || []);

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

      // Stop polling once both have completed
      if (otherUserCompleted && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    fetchData();

    // Poll every 5 seconds
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Results</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        {!otherCompleted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <p className="text-yellow-800">
              Waiting for the other person to finish...
            </p>
            <p className="text-yellow-600 text-sm mt-1">
              This page will update automatically.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const myAnswer = myAnswers[q.id];
            const otherAnswer = otherAnswers[q.id];
            const matching =
              otherCompleted &&
              myAnswer &&
              otherAnswer &&
              myAnswer.selected_option === otherAnswer.selected_option;

            return (
              <div key={q.id} className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-400 mb-1">
                  Question {idx + 1}
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {q.text}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Your Answer
                    </p>
                    <p
                      className={`text-gray-800 p-2 rounded ${
                        matching ? "bg-green-50" : "bg-gray-50"
                      }`}
                    >
                      {myAnswer
                        ? getOptionText(
                            q,
                            myAnswer.selected_option,
                            myAnswer.other_text
                          )
                        : "\u2014"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Their Answer
                    </p>
                    <p
                      className={`text-gray-800 p-2 rounded ${
                        matching ? "bg-green-50" : "bg-gray-50"
                      }`}
                    >
                      {otherCompleted && otherAnswer
                        ? getOptionText(
                            q,
                            otherAnswer.selected_option,
                            otherAnswer.other_text
                          )
                        : "\u2014"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
