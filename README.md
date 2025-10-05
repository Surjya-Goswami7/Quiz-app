🎯 Quiz App

An interactive multi-round Quiz Contest Application built with Next.js + React, featuring lifelines, timers, scoring logic, and round progression. Designed with a sleek dark UI for an engaging experience.

🚀 Features

✅ Multi-round quiz system (Round 1, Round 2, Round 3)

⏱ Countdown timer per question (auto-submits on timeout)

🏆 Score tracking with bonus logic

❌ Disqualification after 3 consecutive wrong answers

🎮 Lifelines:

Skip (1 per round)

50/50 (eliminate two wrong options)

Bonus (+1 extra point on correct answer)

🔄 Round progression with pass thresholds

📊 Final results with prize allocation

🌑 Modern dark theme UI inspired by gaming quiz shows

🛠️ Tech Stack

Frontend: Next.js, React, Tailwind CSS, shadcn/ui

Backend/API: Next.js API routes, Axios

State Management: React Hooks (useState, useEffect, useMemo, useCallback)

Notifications: React Toastify

Data: External question bank (/data/questions)

Auth/Secrets: Environment variables (.env)

Setup & Installation

1)Clone the repo

git clone https://github.com/<your-username>/quiz-app.git
cd quiz-app

2)Install dependencies

npm install
3)Set up environment variables

Create a .env file in the root

4)Run the development server
npm run dev
Visit http://localhost:3000

🎮 Usage

Answer questions within the 30s timer.
Use lifelines wisely (Skip, 50/50, Bonus).
Avoid 3 consecutive wrong answers, or you’re disqualified.
Score high to unlock Round 2 & 3.
Finish all rounds to see your final score and prize.
