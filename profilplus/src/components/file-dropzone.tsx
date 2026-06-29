"use client";

import * as React from "react";
import { UploadCloud, X, FileText, Film, ImageIcon, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  url: string;
  filename: string;
  type: string;
  mimeType?: string;
  size?: number;
}

export function FileDropzone({
  files,
  onChange,
}: {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(list: FileList) {
    setUploading(true);
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      onChange([...files, ...data.files]);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-profil-rose bg-profil-rose/5" : "border-input hover:border-profil-blue hover:bg-accent/50",
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {uploading ? "Envoi en cours…" : "Glissez-déposez vos fichiers ici"}
        </p>
        <p className="text-xs text-muted-foreground">Photos, captures, vidéos, rapports, PDF</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-profil-blue/10 px-3 py-1 text-xs font-medium text-profil-blue">
          <Camera className="h-3.5 w-3.5" /> Prendre une photo
        </span>
      </div>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((f, i) => (
            <div key={i} className="group relative flex items-center gap-2 rounded-lg border bg-card p-2 text-sm">
              {f.type === "PHOTO" ? <ImageIcon className="h-4 w-4 shrink-0 text-profil-blue" />
                : f.type === "VIDEO" ? <Film className="h-4 w-4 shrink-0 text-profil-rose" />
                : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{f.filename}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, idx) => idx !== i)); }}
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
