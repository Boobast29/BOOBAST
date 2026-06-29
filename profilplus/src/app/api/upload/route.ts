import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

function typeFromMime(mime: string): string {
  if (mime.startsWith("image/")) return "PHOTO";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime === "application/pdf") return "PDF";
  return "AUTRE";
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "NO_FILES" }, { status: 400 });

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const results = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const name = `${randomUUID()}.${ext}`;
    await writeFile(join(dir, name), bytes);
    results.push({
      url: `/uploads/${name}`,
      filename: file.name,
      type: typeFromMime(file.type),
      mimeType: file.type,
      size: file.size,
    });
  }
  return NextResponse.json({ files: results });
}
