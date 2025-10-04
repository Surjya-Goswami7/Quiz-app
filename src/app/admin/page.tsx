// src/app/admin/page.tsx
"use client";
import { useState } from "react";

export default function AdminPage() {
  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [options, setOptions] = useState([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);
  const [msg, setMsg] = useState("");

  async function submit() {
    const resp = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, difficulty, options }),
    });
    const j = await resp.json();
    if (resp.ok) {
      setMsg("Saved question id: " + j.questionId);
      setText("");
      setOptions(options.map((o) => ({ text: "", is_correct: false })));
    } else {
      setMsg("Error: " + (j.error || resp.statusText));
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin — Add Question</h2>
      <textarea
        placeholder="Question text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%" }}
      />
      <div>
        <label>
          Difficulty:
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>
      </div>
      <div>
        {options.map((o, i) => (
          <div key={i}>
            <input
              value={o.text}
              onChange={(e) => {
                const copy = [...options];
                copy[i].text = e.target.value;
                setOptions(copy);
              }}
              placeholder={`Option ${i + 1}`}
            />
            <label>
              <input
                type="radio"
                checked={o.is_correct}
                onChange={() => {
                  const copy = options.map((item, idx) => ({
                    ...item,
                    is_correct: idx === i,
                  }));
                  setOptions(copy);
                }}
              />
              Correct
            </label>
          </div>
        ))}
      </div>
      <button onClick={submit}>Save</button>
      <div>{msg}</div>
    </div>
  );
}
