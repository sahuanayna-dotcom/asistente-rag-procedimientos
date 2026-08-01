"use client";

import { useState } from "react";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!apiKey.trim() || !question.trim()) {
      setError("Completa la API Key y la consulta.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ocurrió un error inesperado.");
        return;
      }

      setAnswer(data.answer ?? "");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12 font-sans">
      <main className="w-full max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Asistente IA para Procedimientos Administrativos
          </h1>
          <p className="mt-3 text-lg text-zinc-600">
            Responde tus preguntas utilizando los manuales administrativos de la
            organización.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <label htmlFor="apiKey" className="mb-1 block text-sm font-medium text-zinc-700">
            API Key de OpenRouter
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="mb-5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <label htmlFor="question" className="mb-1 block text-sm font-medium text-zinc-700">
            Consulta
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            rows={5}
            className="mb-5 block w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                Consultando...
              </>
            ) : (
              "Consultar"
            )}
          </button>
        </form>

        {loading && (
          <p role="status" className="mt-6 text-center text-sm text-zinc-500">
            Buscando en los manuales y generando la respuesta...
          </p>
        )}

        {error && !loading && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {answer && !loading && (
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-zinc-700">Respuesta</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">{answer}</p>
          </section>
        )}
      </main>
    </div>
  );
}
