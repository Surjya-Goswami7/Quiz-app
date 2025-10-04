"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { questions as allQuestions } from "@/data/questions";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import axios from "axios";

/* ------------------------- Constants ------------------------- */
const TIMER_SECONDS = 30;
const ROUND1_PASS = 6;
const ROUND2_THRESHOLD_TOTAL = 15;

/* ------------------------- Types ------------------------- */
interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  category: string;
  round: number;
}

interface Dialog {
  title: string;
  message: string;
  onConfirm: () => void;
}

/* ------------------------- Helper ------------------------- */
function pickFifty(options: string[], correct: string) {
  const correctIdx = options.findIndex((o) => o === correct);
  const wrongs = options.filter((_, i) => i !== correctIdx);
  const randomWrong = wrongs[Math.floor(Math.random() * wrongs.length)];
  return [correct, randomWrong].sort(() => Math.random() - 0.5);
}

/* ------------------------- Main Component ------------------------- */
export default function QuizPage() {
  const router = useRouter();

  const rounds = useMemo(() => {
    return [
      allQuestions.filter((q) => q.round === 1),
      allQuestions.filter((q) => q.round === 2),
      allQuestions.filter((q) => q.round === 3),
    ];
  }, []);

  const [roundIdx, setRoundIdx] = useState(0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [score, setScore] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [lifelines, setLifelines] = useState([
    { skip: true, fifty: true, bonus: true },
    { skip: true, fifty: true, bonus: true },
    { skip: true, fifty: true, bonus: true },
  ]);
  const [visibleOptions, setVisibleOptions] = useState<string[] | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const currentRoundQuestions = rounds[roundIdx];
  const currentQuestion = currentRoundQuestions[index];

  /* ------------------------- Timer ------------------------- */
  useEffect(() => setTimeLeft(TIMER_SECONDS), [index, roundIdx]);

  useEffect(() => {
    if (!currentQuestion) return;
    if (timeLeft <= 0) {
      handleSubmit(null, "timeout");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, currentQuestion]);

  /* ------------------------- Back Button Prevention ------------------------- */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      toast.error("Leaving now will disqualify you!");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  /* ------------------------- Lifelines ------------------------- */
  const consumeLifeline = (
    roundIndex: number,
    which: "skip" | "fifty" | "bonus"
  ) => {
    setLifelines((prev) =>
      prev.map((p, idx) => (idx === roundIndex ? { ...p, [which]: false } : p))
    );
  };

  const useSkip = () => {
    if (!lifelines[roundIdx].skip) return toast.warn("Skip already used.");
    consumeLifeline(roundIdx, "skip");
    proceedToNext(false, 0, true);
  };

  const useFifty = () => {
    if (!lifelines[roundIdx].fifty) return toast.warn("50/50 already used.");
    setVisibleOptions(
      pickFifty(currentQuestion.options, currentQuestion.answer)
    );
    consumeLifeline(roundIdx, "fifty");
    toast.info("50/50 applied — two options remain.");
  };

  const useBonus = () => {
    if (!lifelines[roundIdx].bonus) return toast.warn("Bonus already used.");
    toast.info(
      "Bonus activated — next correct answer will earn +1 extra point."
    );
  };

  /* ------------------------- Submit Logic ------------------------- */
  const handleSubmit = (
    option: string | null,
    meta: "bonus" | "skip" | "timeout" | null = null
  ) => {
    if (!currentQuestion) return;
    const isCorrect = option === currentQuestion.answer;

    if (meta === "timeout") {
      toast.error("⏰ Time’s up! Question marked wrong.");
      proceedToNext(false, 0, false);
      return;
    }

    if (meta === "skip") {
      toast.info("⏭ Question skipped.");
      proceedToNext(false, 0, true);
      return;
    }

    let gained = 0;
    if (isCorrect) {
      gained = 1;
      if (meta === "bonus" && lifelines[roundIdx].bonus) {
        gained += 1;
        consumeLifeline(roundIdx, "bonus");
        toast.success("💎 Correct! Bonus point awarded!");
      } else if (meta === "bonus") {
        toast.warn("Bonus already used.");
      } else {
        toast.success("✅ Correct!");
      }
      setConsecutiveWrong(0);
    } else {
      toast.error("❌ Wrong answer!");
      setConsecutiveWrong((c) => c + 1);
    }

    setScore((s) => s + gained);
    proceedToNext(isCorrect, gained, false);
  };

  const proceedToNext = (
    isCorrect: boolean,
    gained: number,
    skipped: boolean
  ) => {
    if (!skipped && consecutiveWrong + (isCorrect ? 0 : 1) >= 3) {
      toast.error("❌ 3 consecutive wrong answers — disqualified.");
      setTimeout(() => router.push("/"), 2000);
      return;
    }

    setSelected(null);
    setVisibleOptions(null);

    const atLastQuestion = index + 1 >= currentRoundQuestions.length;
    if (!atLastQuestion) {
      setIndex((i) => i + 1);
      setTimeLeft(TIMER_SECONDS);
    } else {
      handleRoundComplete();
    }
  };

  /* ------------------------- Round Completion ------------------------- */
  const handleRoundComplete = () => {
    if (roundIdx === 0) {
      if (score >= ROUND1_PASS) {
        setDialog({
          title: "🎉 Round 1 Cleared!",
          message: `You scored ${score} points. Ready for Round 2?`,
          onConfirm: () => {
            setDialog(null);
            setRoundIdx(1);
            setIndex(0);
          },
        });
      } else {
        toast.error("Round 1 not cleared. Redirecting home.");
        setTimeout(() => router.push("/"), 1500);
      }
    } else if (roundIdx === 1) {
      if (score > ROUND2_THRESHOLD_TOTAL) {
        setDialog({
          title: "🎉 Round 2 Cleared!",
          message: `Total score: ${score}. Ready for Round 3?`,
          onConfirm: () => {
            setDialog(null);
            setRoundIdx(2);
            setIndex(0);
          },
        });
      } else {
        toast.error(
          `You needed >${ROUND2_THRESHOLD_TOTAL} to enter Round 3. Redirecting home.`
        );
        setTimeout(() => router.push("/"), 1500);
      }
    } else {
      // Round 3 completed -> finish
      handleFinish();
    }
  };

  /* ------------------------- Finish ------------------------- */
  const handleFinish = async () => {
    let prize: string | null = null;
    if (score >= 31) prize = "Trip to Switzerland (3 nights 4 days)";
    else if (score > 25) prize = "$1,000,000";
    else if (score >= 25) prize = "$80,000";
    else if (score >= 20) prize = "$50,000";

    // Save result to database via API
    try {
      await axios.post("/api/saveResult", { score, prize });
    } catch (err) {
      toast.error("Failed to save your result.");
    }

    setDialog({
      title: "🏆 Quiz Finished!",
      message: prize
        ? `Congratulations! You scored ${score} points. Prize: ${prize}`
        : `You scored ${score} points. Better luck next time!`,
      onConfirm: () => {
        setDialog(null);
        router.push("/");
      },
    });
  };

  /* ------------------------- UI ------------------------- */
  if (!currentQuestion)
    return (
      <div className="flex items-center justify-center h-screen text-white bg-gray-900">
        Loading...
        <ToastContainer position="top-right" />
      </div>
    );

  const displayedOptions = visibleOptions
    ? currentQuestion.options.filter((o) => visibleOptions.includes(o))
    : currentQuestion.options;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-gray-900 to-indigo-900 text-white flex flex-col items-center">
      <ToastContainer position="top-right" />

      {/* Dialog */}
      {dialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm text-center">
            <h2 className="text-xl font-bold mb-4">{dialog.title}</h2>
            <p className="mb-6">{dialog.message}</p>
            <button
              className="bg-green-500 px-4 py-2 rounded hover:bg-green-400 font-semibold"
              onClick={dialog.onConfirm}
            >
              ✅ Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between w-full max-w-3xl mb-6">
        <div>
          <div className="text-gray-400 text-sm">Round {roundIdx + 1}</div>
          <div className="font-bold text-lg">{currentQuestion.category}</div>
        </div>
        <div className="flex gap-4 items-center">
          <div>
            <div className="text-gray-400 text-sm">Score</div>
            <div className="font-bold">{score}</div>
          </div>
          <div className="bg-purple-600 px-3 py-1 rounded">⏱ {timeLeft}s</div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl flex gap-6">
        <div className="flex-1">
          <div className="mb-4 font-semibold">
            Question {index + 1} / {currentRoundQuestions.length}
          </div>
          <h2 className="text-lg mb-4">{currentQuestion.question}</h2>

          <div className="grid grid-cols-2 gap-3">
            {displayedOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className={`p-3 rounded border ${
                  selected === opt
                    ? "border-green-400 bg-green-900"
                    : "border-gray-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Lifelines */}
        <div className="flex flex-col gap-3 min-w-[160px]">
          <button
            onClick={useSkip}
            className={`p-2 rounded ${
              lifelines[roundIdx].skip ? "bg-pink-500" : "bg-gray-600"
            }`}
          >
            Skip
          </button>
          <button
            onClick={useFifty}
            className={`p-2 rounded ${
              lifelines[roundIdx].fifty ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            50/50
          </button>
          <button
            onClick={useBonus}
            className={`p-2 rounded ${
              lifelines[roundIdx].bonus ? "bg-green-400" : "bg-gray-600"
            }`}
          >
            Bonus
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => index > 0 && setIndex((i) => i - 1)}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          ◀ Prev
        </button>
        <button
          onClick={() => {
            if (!selected) return toast.warn("Select an option first or skip.");
            handleSubmit(selected);
          }}
          className="px-4 py-2 bg-green-500 rounded"
        >
          Submit
        </button>
        <button
          onClick={() => {
            if (!selected)
              return toast.warn("Select an option first to use bonus.");
            handleSubmit(selected, "bonus");
          }}
          className="px-4 py-2 bg-yellow-400 rounded"
        >
          Bonus & Submit
        </button>
      </div>
    </div>
  );
}
