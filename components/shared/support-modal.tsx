"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
}

export function SupportModal({ isOpen, onClose, userEmail, userName }: SupportModalProps) {
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setFeedback("Escribe un mensaje antes de enviarlo.");
      return;
    }

    setIsSending(true);

    const { error } = await supabase.from("support_messages").insert({
      user_email: userEmail,
      user_name: userName,
      message: trimmedMessage,
    });

    setIsSending(false);

    if (error) {
      setFeedback("No pudimos enviar tu mensaje. Intenta nuevamente.");
      return;
    }

    setMessage("");
    setFeedback("Mensaje enviado.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--tazki-slate-200)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tazki-slate-950)]">Soporte interno</h2>
            <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">
              Cuentanos brevemente el problema o solicitud que quieres reportar.
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-[var(--tazki-slate-500)] transition hover:text-[var(--tazki-blue-900)]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-xl bg-[var(--tazki-slate-50)] px-4 py-3 text-sm text-[var(--tazki-slate-700)]">
            <p className="font-medium text-[var(--tazki-slate-950)]">{userName}</p>
            <p>{userEmail}</p>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe el problema o la ayuda que necesitas..."
            rows={5}
            className="w-full rounded-xl border border-[var(--tazki-slate-200)] px-3 py-3 text-sm text-[var(--tazki-slate-950)] shadow-sm outline-none transition placeholder:text-[var(--tazki-slate-500)] focus:ring-2 focus:ring-[var(--tazki-blue-600)]"
          />

          {feedback ? <p className="text-sm text-[var(--tazki-blue-700)]">{feedback}</p> : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
