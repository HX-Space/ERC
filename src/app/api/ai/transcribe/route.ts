import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aiConfig, transcribe } from "@/lib/ai-server";

// Voice notes are posted here as multipart form data (field "audio", plus
// "language"). The audio is sent to OpenAI for transcription and is not stored.
const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB.

export async function POST(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only managers can transcribe voice notes." }, { status: 403 });
  }
  if (!aiConfig().enabled) {
    return NextResponse.json(
      { error: "Voice transcription needs an OpenAI key. Type the transcript instead." },
      { status: 501 },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No recording was received." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "The recording is too long. Keep voice notes under about 4 minutes." }, { status: 413 });
  }

  try {
    const result = await transcribe(audio, String(form?.get("language") ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed." },
      { status: 502 },
    );
  }
}
