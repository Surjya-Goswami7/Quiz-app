"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
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

interface AnswerEntry {
  selected: string | null;
  submitted: boolean;
  isCorrect: boolean;
  gained: number;
  skipped?: boolean;
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
  const { data: session, status } = useSession();
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

  // track activated bonus for a round (bonus will be consumed at the next correct answer)
  const [bonusActive, setBonusActive] = useState<Record<number, boolean>>({});

  // which options are visible after 50/50; set per question
  const [visibleOptions, setVisibleOptions] = useState<string[] | null>(null);

  // dialog modal for round transitions / finish
  const [dialog, setDialog] = useState<Dialog | null>(null);

  // answersMap stores answers per question so users can't resubmit
  const [answersMap, setAnswersMap] = useState<Record<string, AnswerEntry>>({});

  const currentRoundQuestions = rounds[roundIdx] || [];
  const currentQuestion = currentRoundQuestions[index];
  const currentKey = currentQuestion
    ? `${roundIdx}-${currentQuestion.id}`
    : null;

  /* ------------------------- Timer reset only for unanswered ------------------------- */
  useEffect(() => {
    if (!currentQuestion) return;
    const key = currentKey!;
    if (answersMap[key]?.submitted) {
      // don't run timer for already submitted question
      setTimeLeft(0);
    } else {
      setTimeLeft(TIMER_SECONDS);
    }
    // clear visibleOptions when navigating questions
    setVisibleOptions(null);
    // set selected from answersMap if previously answered; otherwise clear
    setSelected(answersMap[key]?.selected ?? null);
  }, [index, roundIdx, currentQuestion, answersMap]); // intentionally includes answersMap so UI updates when answer is recorded

  useEffect(() => {
    if (!currentQuestion) return;
    const key = currentKey!;
    // do not start decrementing if the question is already submitted
    if (answersMap[key]?.submitted) return;

    if (timeLeft <= 0) {
      handleSubmit(null, "timeout");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, currentQuestion, answersMap]); // timer only active for unanswered questions

  /* ------------------------- Back Button Prevention (page unload) ------------------------- */
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

  // Use skip lifeline (marks question as submitted and moves forward)
  const useSkip = () => {
    if (!currentQuestion) return;
    if (!lifelines[roundIdx].skip) return toast.warn("Skip already used.");
    // route through handleSubmit so one central place handles "submitted" bookkeeping
    handleSubmit(null, "skip");
  };

  const useFifty = () => {
    if (!currentQuestion) return;
    if (!lifelines[roundIdx].fifty) return toast.warn("50/50 already used.");
    const picked = pickFifty(currentQuestion.options, currentQuestion.answer);
    setVisibleOptions(picked);
    consumeLifeline(roundIdx, "fifty");
    toast.info("50/50 applied — two options remain.");
  };

  // Activate bonus for the round (doesn't consume until used)
  const useBonus = () => {
    if (!currentQuestion) return;
    if (!lifelines[roundIdx].bonus) return toast.warn("Bonus already used.");
    setBonusActive((b) => ({ ...b, [roundIdx]: true }));
    toast.info(
      "Bonus activated — next correct answer will earn +1 extra point."
    );
  };

  /* ------------------------- Submit Logic ------------------------- */
  const handleSubmit = async (
    option: string | null,
    meta: "bonus" | "skip" | "timeout" | null = null
  ) => {
    if (!currentQuestion) return;
    const key = currentKey!;
    // prevent re-submission
    if (answersMap[key]?.submitted) {
      toast.warn("This question has already been answered.");
      return;
    }

    // Timeout handling
    if (meta === "timeout") {
      toast.error("Time’s up! Moving To Next Question");
      // record as submitted wrong
      setAnswersMap((m) => ({
        ...m,
        [key]: { selected: null, submitted: true, isCorrect: false, gained: 0 },
      }));
      const newConsec = consecutiveWrong + 1;
      setConsecutiveWrong(newConsec);
      // proceed (no lifeline consumed)
      proceedToNext(newConsec, false);
      return;
    }

    // Skip handling
    if (meta === "skip") {
      // consume skip lifeline
      if (!lifelines[roundIdx].skip) {
        return toast.warn("Skip already used.");
      }
      consumeLifeline(roundIdx, "skip");
      toast.info("Question skipped.");
      setAnswersMap((m) => ({
        ...m,
        [key]: {
          selected: null,
          submitted: true,
          isCorrect: false,
          gained: 0,
          skipped: true,
        },
      }));
      // skipping does not affect consecutive wrong count
      proceedToNext(consecutiveWrong, true);
      return;
    }

    // Normal submit / bonus submit
    const isCorrect = option === currentQuestion.answer;
    let gained = 0;

    if (isCorrect) {
      gained = 1;
      // check whether bonus should apply (either meta === 'bonus' or bonusActive for this round)
      const bonusRequested = meta === "bonus" || !!bonusActive[roundIdx];
      if (bonusRequested) {
        if (lifelines[roundIdx].bonus) {
          gained += 1;
          consumeLifeline(roundIdx, "bonus");
          // clear the activated flag for this round
          setBonusActive((b) => ({ ...b, [roundIdx]: false }));
          toast.success("Correct! Bonus point awarded!");
        } else {
          // bonus requested/active but already consumed
          toast.warn("Bonus already used for this round.");
        }
      } else {
        toast.success("Correct!");
      }
    } else {
      toast.error("Wrong answer!");
    }

    // update score and answersMap
    setScore((s) => s + gained);
    setAnswersMap((m) => ({
      ...m,
      [key]: { selected: option, submitted: true, isCorrect, gained },
    }));

    const newConsec = isCorrect ? 0 : consecutiveWrong + 1;
    setConsecutiveWrong(newConsec);

    proceedToNext(newConsec, false);
  };

  const proceedToNext = (newConsecutiveWrong: number, skipped: boolean) => {
    // check disqualification: 3 consecutive wrongs
    if (!skipped && newConsecutiveWrong >= 3) {
      toast.error("3 consecutive wrong answers — disqualified.");
      setTimeout(() => router.push("/"), 2000);
      return;
    }

    // reset visible options and selected UI (selected will be sourced from answersMap in effect above)
    setVisibleOptions(null);

    const atLastQuestion = index + 1 >= currentRoundQuestions.length;
    if (!atLastQuestion) {
      setIndex((i) => i + 1);
      // timeLeft reset handled by effect which checks answersMap for the next question
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
    if (!session?.user) { 
       signIn("google", { callbackUrl: "/" });
       return
    }
    const userId = session?.user.id;
    let prize: string | null = null;
    if (score >= 31) prize = "Trip to Switzerland (3 nights 4 days)";
    else if (score > 25) prize = "$1,000,000";
    else if (score >= 25) prize = "$80,000";
    else if (score >= 20) prize = "$50,000";

    // Save result to database via API
    try {
      await axios.post("/api/saveResult", { userId, score, prize });
    } catch (err) {
      toast.error(`Failed to save your result ${err}.`);
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
      <div className="flex items-center justify-center h-screen text-white bg-gradient-to-b from-[#08090c] to-[#071229]">
        Loading...
        <ToastContainer position="top-right" />
      </div>
    );

  // compute displayed options (50/50)
  const displayedOptions = visibleOptions
    ? currentQuestion.options.filter((o) => visibleOptions.includes(o))
    : currentQuestion.options;

  // read answered state from answersMap
  const answeredEntry = answersMap[currentKey ?? ""] ?? null;
  const isAnswered = !!answeredEntry?.submitted;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-[#071229] to-[#07131d] text-white flex flex-col items-center">
      <ToastContainer position="top-right" />

      {/* Dialog */}
      {dialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-[#0f1724] rounded-2xl p-6 max-w-md text-center border border-transparent shadow-xl">
            <h2 className="text-xl font-semibold mb-3">{dialog.title}</h2>
            <p className="mb-6 text-sm text-gray-300">{dialog.message}</p>
            <button
              className="bg-emerald-400 px-4 py-2 rounded font-semibold text-black"
              onClick={dialog.onConfirm}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Card container that matches screenshot layout */}
      <div className="w-full max-w-4xl rounded-2xl bg-[rgba(20,24,30,0.6)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.03)]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[#a5b4fc] text-sm font-semibold">
              QUIZ CONTEST
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Round {roundIdx + 1} • {currentQuestion.category}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-gray-400 text-xs">Total Score</div>
              <div className="font-bold">{score}</div>
            </div>

            {/* Timer bubble */}
            <div className="relative">
              <div className="bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold px-3 py-2 rounded-full shadow-md">
                ⏱ {timeLeft}s
              </div>
            </div>
          </div>
        </div>

        {/* Main inner panel */}
        <div className="mt-3 bg-[#0b1116] rounded-xl p-6 border border-[rgba(255,255,255,0.02)] flex gap-6">
          {/* Left: question + options */}
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-2">
              Question {index + 1} / {currentRoundQuestions.length}
            </div>
            <h3 className="text-white text-lg font-semibold mb-4">
              {currentQuestion.question}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {displayedOptions.map((opt) => {
                const wasSelected = answeredEntry?.selected === opt;
                const isCorrectOption = opt === currentQuestion.answer;

                let baseClass =
                  "px-4 py-3 cursor-pointer rounded-md shadow-inner text-left transition-colors duration-150 border ";
                if (isAnswered) {
                  // show correct green, selected-wrong red, others dark
                  if (isCorrectOption)
                    baseClass += "bg-[#06261a] border-green-500";
                  else if (wasSelected && !isCorrectOption)
                    baseClass += "bg-[#2b0b0b] border-red-500";
                  else
                    baseClass +=
                      "bg-transparent border-[rgba(255,255,255,0.03)]";
                } else {
                  // not answered yet
                  if (selected === opt)
                    baseClass += "bg-[rgba(10,20,25,0.7)] border-green-400";
                  else
                    baseClass +=
                      "bg-transparent border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]";
                }

                return (
                  <button
                    key={opt}
                    onClick={() => {
                      if (isAnswered) return;
                      setSelected(opt);
                    }}
                    disabled={isAnswered}
                    className={baseClass}
                  >
                    <div className="text-sm">{opt}</div>
                  </button>
                );
              })}
            </div>

            {/* footer small note */}
            <div className="mt-8 text-sm text-gray-400">
              Round {roundIdx + 1} • Games
            </div>
          </div>

          {/* Right column (lifelines, progress, actions) */}
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-[#071427] rounded-lg p-4 border border-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">Lifelines</span>
                  <div className="relative group">
                    <i className="text-gray-400 text-xs cursor-pointer border border-gray-600 rounded-full px-[6px] py-[1px]">i</i>
                    {/* Tooltip */}
                    <div className="absolute right-0 top-5 hidden w-56 text-[11px] text-gray-300 bg-[#0d1a2e] border border-gray-700 rounded-lg p-2 shadow-lg group-hover:block z-10">
                      <p className="mb-1"><strong>Skip</strong> – Skip the current question once per round.</p>
                      <p className="mb-1"><strong>50/50</strong> – Removes two incorrect options.</p>
                      <p><strong>Bonus</strong> – Earn +1 extra point for a correct answer.</p>
                    </div>
                  </div>
                </div>

              {/* Skip button — pink gradient pill */}
              <button
                onClick={useSkip}
                disabled={isAnswered || !lifelines[roundIdx].skip}
                className={`w-full cursor-pointer py-3 rounded-lg font-semibold mb-3 shadow-md ${
                  lifelines[roundIdx].skip
                    ? "bg-gradient-to-r from-[#ff7aa2] to-[#ff9bb3] text-black"
                    : "bg-[#1b2430] text-gray-400"
                }`}
              >
                Skip (1/round)
              </button>

              {/* 50/50 blue pill */}
              <button
                onClick={useFifty}
                disabled={isAnswered || !lifelines[roundIdx].fifty}
                className={`w-full cursor-pointer py-3 rounded-lg font-semibold mb-3 shadow-md ${
                  lifelines[roundIdx].fifty
                    ? "bg-gradient-to-r from-[#6fb7ff] to-[#bfe9ff] text-black"
                    : "bg-[#1b2430] text-gray-400"
                }`}
              >
                50 / 50
              </button>

              {/* Bonus green pill */}
              <button
                onClick={useBonus}
                disabled={isAnswered || !lifelines[roundIdx].bonus}
                className={`w-full py-3 cursor-pointer rounded-lg font-semibold ${
                  lifelines[roundIdx].bonus
                    ? "bg-gradient-to-r from-[#9dffb4] to-[#7bffb4] text-black"
                    : "bg-[#1b2430] text-gray-400"
                }`}
              >
                Bonus (+1 on correct)
              </button>
            </div>

            {/* Round Progress */}
            <div className="bg-[#071427] rounded-lg p-4 border border-[rgba(255,255,255,0.02)]">
              <div className="text-xs text-gray-400 mb-3">Round Progress</div>
              <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden mb-2">
                {/* small neon progress fill */}
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${
                      ((index + 1) / currentRoundQuestions.length) * 100
                    }%`,
                    background: "linear-gradient(90deg,#ff8ab8,#7ab0ff)",
                  }}
                />
              </div>
              <div className="text-sm text-gray-300">
                {index + 1} / {currentRoundQuestions.length}
              </div>
            </div>

            {/* Submit area styled as in screenshot */}
            <div className="bg-[#071427] rounded-lg p-4 border border-[rgba(255,255,255,0.02)] flex flex-col gap-3">
              <div className="flex flex-col items-stretch gap-3">
                <button
                  onClick={() => {
                    if (isAnswered)
                      return toast.warn(
                        "This question has already been answered."
                      );
                    if (!selected)
                      return toast.warn("Select an option first or skip.");
                    handleSubmit(selected);
                  }}
                  disabled={isAnswered}
                  className={`w-full cursor-pointer py-3 rounded-lg font-semibold text-black ${
                    isAnswered ? "bg-[#22332d]" : "bg-[#9dffb4]"
                  }`}
                >
                  Submit
                </button>

                <button
                  onClick={() => {
                    if (isAnswered)
                      return toast.warn(
                        "This question has already been answered."
                      );
                    if (!selected)
                      return toast.warn("Select an option first to use bonus.");
                    handleSubmit(selected, "bonus");
                  }}
                  disabled={isAnswered}
                  className={`w-full py-3 cursor-pointer rounded-lg font-semibold text-black ${
                    isAnswered ? "bg-[#6f5f2a]" : "bg-[#ffd86b]"
                  }`}
                >
                  Use Bonus & Submit
                </button>
              </div>

              <div className="text-xs text-gray-400 mt-1">
                3 wrongs in a row → Knockout
              </div>
            </div>

            {/* Tips */}
            <div className="text-xs text-gray-400 text-center">
              Tips: Use lifelines wisely — they reset each round.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
