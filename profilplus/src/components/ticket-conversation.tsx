"use client";

import * as React from "react";
import { Send, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone, type UploadedFile } from "@/components/file-dropzone";
import { cn, formatDate, initials } from "@/lib/utils";

interface Msg {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
  attachments: { url: string; filename: string; type: string }[];
}

export function TicketConversation({
  ticketId,
  currentUserId,
  initial,
}: {
  ticketId: string;
  currentUserId: string;
  initial: Msg[];
}) {
  const [messages, setMessages] = React.useState<Msg[]>(initial);
  const [body, setBody] = React.useState("");
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [showFiles, setShowFiles] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  // "temps reel" par polling leger
  React.useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (res.ok) setMessages(await res.json());
    }, 5000);
    return () => clearInterval(id);
  }, [ticketId]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim() && !files.length) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: body.trim() || "(pièce jointe)", attachments: files }),
    });
    setSending(false);
    if (res.ok) {
      const m = await res.json();
      setMessages((prev) => [...prev, m]);
      setBody("");
      setFiles([]);
      setShowFiles(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Démarrez la conversation avec le support.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.author.id === currentUserId;
          const isSupport = m.author.role !== "GARAGE";
          return (
            <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                isSupport ? "bg-profil-rose" : "bg-profil-blue")}>
                {initials(m.author.name)}
              </div>
              <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                mine ? "bg-profil-blue text-white" : "bg-muted")}>
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-xs font-semibold opacity-90">{m.author.name}</span>
                  {isSupport && <span className="rounded bg-profil-rose/20 px-1 text-[10px] font-medium text-profil-rose">Support</span>}
                </div>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {m.attachments.map((a, i) =>
                      a.type === "PHOTO" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={i} href={a.url} target="_blank" rel="noreferrer">
                          <img src={a.url} alt={a.filename} className="h-24 w-full rounded-lg object-cover" />
                        </a>
                      ) : (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-background/40 px-2 py-1 text-xs underline">
                          <Paperclip className="h-3 w-3" /> {a.filename}
                        </a>
                      ),
                    )}
                  </div>
                )}
                <p className="mt-1 text-[10px] opacity-60">{formatDate(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {showFiles && (
        <div className="border-t p-3">
          <FileDropzone files={files} onChange={setFiles} />
        </div>
      )}

      <div className="flex items-end gap-2 border-t p-3">
        <Button variant="ghost" size="icon" onClick={() => setShowFiles((s) => !s)} aria-label="Pièces jointes">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrivez un message…"
          className="max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
        />
        <Button onClick={send} disabled={sending} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
