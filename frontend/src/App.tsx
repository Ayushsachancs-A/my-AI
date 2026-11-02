import { useState } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type NavSection = "about" | "projects" | "contact" | null;

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>(null);

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
            href="/resume.pdf"
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
              AI ENGINEER · DEVELOPER
            </p>

            <h1>
              Hi, I'm <span className="highlight">Ayush Sachan.</span>
            </h1>

            <p className="hero-description">
              Building intelligent applications
              <br />
              with AI and modern technology.
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
                <p className="message-label">AI ASSISTANT · GENERATING</p>
                <div className="answer-text">
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
        <h3>AI Portfolio Assistant</h3>
        <p>
          An interactive AI-powered portfolio that answers questions about
          my background and projects using a React frontend and FastAPI
          backend, with streamed responses from an LLM.
        </p>
        <p className="project-tech">
          React · TypeScript · FastAPI · Python · Groq
        </p>
        <a
          className="source-code-link"
          href="https://github.com/YOUR_USERNAME/YOUR_PORTFOLIO_REPO"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>

      <article className="project-card">
        <h3>Adaptive Multi-LLM Platform</h3>
        <p>
          An AI platform designed to route user queries to suitable language
          models, evaluate their responses, and combine results to improve
          answer quality.
        </p>
        <p className="project-tech">
          Python · FastAPI · LLM APIs · Model Routing
        </p>
        <a
          className="source-code-link"
          href="https://github.com/YOUR_USERNAME/YOUR_MULTILLM_REPO"
          target="_blank"
          rel="noopener noreferrer"
        >
          &lt;/&gt; View Source Code ↗
        </a>
      </article>

      <article className="project-card">
        <h3>Post-Quantum 5G-AKA Research</h3>
        <p>
          Research exploring post-quantum cryptographic mechanisms for
          5G authentication, with a focus on authentication overhead,
          key derivation, and communication efficiency.
        </p>
        <p className="project-tech">
          Post-Quantum Cryptography · ML-KEM · 5G Authentication
        </p>
        <a
          className="source-code-link"
          href="https://github.com/YOUR_USERNAME/YOUR_PQC_REPO"
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
