import { useState, useEffect } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type NavSection = "about" | "projects" | "contact" | null;

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>(null);
  const [waking, setWaking] = useState(false);
  const [profileConfig, setProfileConfig] = useState({
    profile_title: "Backend & AI Engineer",
    profile_subtitle: "AI ENGINEER · DEVELOPER",
    hero_description: "Building intelligent applications\nwith AI and modern technology.",
    resume_download_file: "/resume-ai.pdf",
  });

  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((res) => res.json())
      .then((data) => setProfileConfig(data))
      .catch(() => {}); // silently fall back to defaults
  }, []);

  async function askAI(customQuestion?: string) {
    const currentQuestion = (customQuestion ?? question).trim();

    if (!currentQuestion || loading) return;

    const previousMessages = messages;

    setChatStarted(true);
    setMessages((previous) => [
      ...previous,
      { role: "user", content: currentQuestion },
    ]);
    setQuestion("");
    setAnswer("");
    setError("");
    setLoading(true);

    let fullAnswer = "";

    const wakeTimer = setTimeout(() => setWaking(true), 3000);

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
          history: previousMessages,
        }),
      });

      clearTimeout(wakeTimer);
      setWaking(false);

      if (!response.ok) {
        const data: { detail?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(data.detail || "Unable to get an answer.");
      }

      if (!response.body) {
        throw new Error("The server did not provide a response stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        fullAnswer += decoder.decode(value, { stream: true });
        setAnswer(fullAnswer);
      }

      fullAnswer += decoder.decode();
      setAnswer(fullAnswer);

      if (!fullAnswer.trim()) {
        throw new Error("The AI returned an empty answer.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: fullAnswer },
      ]);
    } catch (err) {
      clearTimeout(wakeTimer);
      setWaking(false);
      console.error("AI request failed:", err);
      setMessages(previousMessages);
      setAnswer("");

      setError(
        err instanceof TypeError
          ? "Cannot connect to the AI server. Check that FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAI();
  }

  function startNewChat() {
    if (loading) return;
    setQuestion("");
    setAnswer("");
    setError("");
    setMessages([]);
    setChatStarted(false);
    setActiveSection(null);
  }

  function openSection(section: Exclude<NavSection, null>) {
    setActiveSection(section);
  }

  return (
    <div className={`app ${chatStarted ? "chat-mode" : "home-mode"}`}>
      <nav className="navbar">
        <button type="button" className="logo" onClick={startNewChat}>
          KNOW ME
        </button>

        <div className="nav-links">
          <button type="button" className="nav-item" onClick={() => openSection("about")}>
            About
          </button>
          <button type="button" className="nav-item" onClick={() => openSection("projects")}>
            Projects
          </button>
          <button type="button" className="nav-item" onClick={() => openSection("contact")}>
            Contact
          </button>

          {chatStarted && (
            <button
              type="button"
              className="new-chat-button"
              onClick={startNewChat}
              disabled={loading}
            >
              + New Chat
            </button>
          )}

          <a
            href={profileConfig.resume_download_file || "/resume-ai.pdf"}
            target="_blank"
            rel="noopener noreferrer"
            className="resume-button"
          >
            View My Resume <span>↗</span>
          </a>
        </div>
      </nav>

      {!chatStarted ? (
        <main className="hero">
          <div className="hero-content">
            <p className="hero-label">
              <span className="status-dot"></span>
              {profileConfig.profile_subtitle}
            </p>

            <h1>
              Hi, I'm <span className="highlight">Ayush Sachan.</span>
            </h1>

            <p className="hero-description">
              {profileConfig.hero_description.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </p>

            <form className="ai-input" onSubmit={handleSubmit}>
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask me anything about my profile..."
                aria-label="Ask a question about my profile"
                maxLength={1000}
                disabled={loading}
              />
              <button
                type="submit"
                aria-label="Send question"
                disabled={loading || !question.trim()}
              >
                ↗
              </button>
            </form>

            <div className="suggestions">
              <span>Try asking:</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => void askAI("What are my technical skills?")}
              >
                My Skills
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void askAI("Tell me about my projects.")}
              >
                My Projects
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void askAI("I would like to connect with Ayush for an interview.")}
              >
                Contact / Hire
              </button>
            </div>

            {error && (
              <p className="ai-error home-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </main>
      ) : (
        <main className="conversation-layout">
          <section className="conversation-messages" aria-label="Conversation">
            {messages.map((message, index) => (
              <article
                key={`${index}-${message.role}`}
                className={`chat-message ${message.role}`}
              >
                <p className="message-label">
                  {message.role === "user" ? "YOU" : "AI ASSISTANT"}
                </p>
                <div className="answer-text">
                  {message.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </article>
            ))}

            {loading && (
              <article className="chat-message assistant">
                <p className={`message-label ${waking ? "waking" : ""}`}>
                  {waking ? "SERVER COLD STARTING" : "AI ASSISTANT · GENERATING"}
                </p>
                <div className="answer-text">
                  {waking && !answer && (
                    <p className="waking-hint">
                      Waking up the AI assistant... This takes ~30 seconds on the first visit.
                    </p>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {answer}
                  </ReactMarkdown>
                  <span className="streaming-cursor">▍</span>
                </div>
              </article>
            )}

            {error && (
              <p className="ai-error conversation-error" role="alert">
                {error}
              </p>
            )}
          </section>

          <div className="composer-area">
            <form className="ai-input chat-composer" onSubmit={handleSubmit}>
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a follow-up question..."
                aria-label="Ask a follow-up question"
                maxLength={1000}
                disabled={loading}
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={loading || !question.trim()}
              >
                {loading ? "…" : "↗"}
              </button>
            </form>
            <p className="composer-disclaimer">
              AI answers are based on the profile information available to it.
            </p>
          </div>
        </main>
      )}

      {activeSection && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveSection(null);
          }}
        >
          <section
            className="portfolio-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setActiveSection(null)}
            >
              ×
            </button>

            {activeSection === "about" && (
              <>
                <p className="modal-eyebrow">A LITTLE ABOUT ME</p>
                <p>
                  I am an M.Tech student in Computer Science at NIT Durgapur with a strong foundation in backend development, data engineering, 
                  and generative AI systems.My hands-on experience centers on building scalable RESTful APIs with Fast API, architecting modern
                  data pipelines and warehouses using Medallion architecture (Bronze/Silver/Gold), and integrating 
                  LLMs via Retrieval-Augmented Generation (RAG). Whether designing vector-search pipelines with Chroma DB, building ETL workflows,
                  or training machine learning models, I focus on clean architecture, security, and performance.
                </p>
              </>
            )}

            {activeSection === "projects" && (
  <>
    <p className="modal-eyebrow">RELATED WORK</p>
    <h2 id="portfolio-modal-title">Projects</h2>
    <p className="modal-description">
      Explore my projects, the technologies I use, and the source code
      behind my work.
    </p>

    <div className="project-list">
      <article className="project-card">
        <h3>AI-Powered Task Management System</h3>
        <ul className="project-description">
          <li>
            Built a multi-tenant RAG copilot achieving &lt;7ms vector search and &lt;500ms completions via ChromaDB and Groq LPUs.
          </li>
          <li>
            Engineered real-time semantic deduplication reaching 92–96% semantic accuracy and 100% exact precision at 8–16ms latency.
          </li>
          <li>
            Architected a SaaS backend handling 800+ reads/sec (0.62ms query time) with JWT auth, Alembic migrations, and Pytest suites.
          </li>
        </ul>

        
        <p className="project-tech">
          FastAPI · Python · ChromaDB · Groq API · SQLite · JWT
        </p>
        <a
          className="source-code-link"
          href="https://github.com/Ayushsachancs-A/TaskFlow-AI-Powered-Task-Management-System"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>

      <article className="project-card">
        <h3>AYUSH AI</h3>
         <ul className="project-description">
          <li>
            Built a full-stack AI portfolio assistant using React and FastAPI, streaming real-time LLM responses via Groq API with sub-second TTFT.
          </li>
          <li>
            Automated PDF parsing into structured Pydantic models with thread-safe in-memory caching, eliminating redundant LLM extraction calls.
          </li>
          <li>
           Implemented multi-turn chat memory with strict prompt guardrails, ensuring 100% factual accuracy grounded in verified resume data.
          </li>
        </ul>
        <p className="project-tech">
          React · TypeScript · FastAPI · Python · Groq · RAG
        </p>
        <a
          className="source-code-link"
          href="https://github.com/Ayushsachancs-A/my-AI"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>

      <article className="project-card">
        <h3>SQL Data Warehouse</h3>
        <ul className="project-description">
        <li>
          Built a Medallion Data Warehouse consolidating 116K+ ERP/CRM records in &lt;3s via T-SQL BULK INSERT and SSIS.
        </li>
        <li>
          Cut analytical query latency by 70–80% (from ~5s to &lt;0.8s) by designing a Star Schema with integer surrogate keys.
        </li>
        <li>
          Delivered RFM customer and product data marts governing $29.4M in revenue using windowed queries and deduplication.
        </li>
      </ul>
        <p className="project-tech">
          SQL Server · T-SQL · SSIS · Data Warehousing · Star Schema
        </p>
        <a
          className="source-code-link"
          href="https://github.com/Ayushsachancs-A/sql-data-Warehouse"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>
      <article className="project-card">
        <h3>Crypto Market Data Lake</h3>
        <ul className="project-description">
          <li>
            Automated micro-batch ingestion for 3 crypto assets at &lt;1.2s latency using hourly Python/Boto3 scripts into AWS S3.
          </li>
          <li>
            Enabled zero-copy schema-on-read processing in Snowflake via S3 external stages and automated COPY INTO pipelines.
          </li>
          <li>
            Built a Streamlit dashboard visualizing 24h price deltas and 6-hour moving averages over 500 real-time records.
          </li>
        </ul>
        <p className="project-tech">
          Python · AWS S3 · Snowflake · Streamlit · Plotly · REST APIs
        </p>
        <a
          className="source-code-link"
          href="https://github.com/Ayushsachancs-A/Crypto-market-trends"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>
      <article className="project-card">
        <h3>Water Footprint Calculator</h3>
        <ul className="project-description">
          <li>
            Built a decoupled ML service serving predictions in &lt;25ms (0.68ms inference) using FastAPI, React, and DMatrix serialization.
          </li>
          <li>
            Trained a 1,000-tree XGBoost regressor on 100K records, achieving 98.82% accuracy (R² ≈ 0.999) under an 80/20 split.
          </li>
          <li>
            Automated instant conservation recommendations via a deterministic post-inference engine executing in 0.01ms.
          </li>
        </ul>
        <p className="project-tech">
          FastAPI · React · Python · XGBoost · Scikit-Learn · REST APIs
        </p>
        <a
          className="source-code-link"
          href="https://github.com/Ayushsachancs-A/waterfootprint-calculator"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>
      
    </div>
  </>
)}

{activeSection === "contact" && (
  <>
    <p className="modal-eyebrow">LET'S CONNECT</p>
    <h2 id="portfolio-modal-title">Contact</h2>

    <p className="modal-description">
      Have an opportunity, a project idea, or want to discuss technology?
      Feel free to reach out or connect with me.
    </p>

    <div className="contact-list">
      <a
        className="contact-card"
        href="tel:+91 9151112733"
      >
        <span className="contact-icon">☎</span>
        <span className="contact-details">
          <span className="contact-label">Phone</span>
          <span className="contact-value">+91 9151112733</span>
        </span>
        <span className="contact-arrow">↗</span>
      </a>

      <a
        className="contact-card"
        href="mailto:ayushsachan162@gmail.com"
      >
        <span className="contact-icon">✉</span>
        <span className="contact-details">
          <span className="contact-label">Email</span>
          <span className="contact-value">ayushsachan162@gmail.com</span>
        </span>
        <span className="contact-arrow">↗</span>
      </a>

      <a
        className="contact-card"
        href="https://github.com/Ayushsachancs-A"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="contact-icon">⌘</span>
        <span className="contact-details">
          <span className="contact-label">GitHub</span>
          <span className="contact-value">View my repositories</span>
        </span>
        <span className="contact-arrow">↗</span>
      </a>

      <a
        className="contact-card"
        href="https://www.linkedin.com/in/ayush-sachan-dev/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="contact-icon">in</span>
        <span className="contact-details">
          <span className="contact-label">LinkedIn</span>
          <span className="contact-value">Connect professionally</span>
        </span>
        <span className="contact-arrow">↗</span>
      </a>

      <a
        className="contact-card"
        href="https://leetcode.com/u/ayushsachan7/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="contact-icon">⌘</span>
        <span className="contact-details">
          <span className="contact-label">LeetCode</span>
          <span className="contact-value">View my coding profile</span>
        </span>
        <span className="contact-arrow">↗</span>
      </a>
    </div>
  </>
)}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
