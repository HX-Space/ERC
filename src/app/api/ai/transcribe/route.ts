import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aiConfig, transcribe } from "@/lib/ai-server";
import { getT } from "@/lib/i18n-server";

// Voice notes are posted here as multipart form data (field "audio", plus
// "language"). The audio is sent to OpenAI for transcription and is not stored.
const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB.

export async function POST(request: Request) {
  const t = await getT();
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json(
      { error: t("Only managers can transcribe voice notes.", "يقتصر تفريغ الملاحظات الصوتية على المديرين.") },
      { status: 403 },
    );
  }
  if (!aiConfig().enabled) {
    return NextResponse.json(
      {
        error: t(
          "Voice transcription needs an OpenAI key. Type the transcript instead.",
          "يتطلب تفريغ الصوت مفتاح OpenAI. اكتب النص يدوياً بدلاً من ذلك.",
        ),
      },
      { status: 501 },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: t("No recording was received.", "لم يتم استلام أي تسجيل.") },
      { status: 400 },
    );
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: t(
          "The recording is too long. Keep voice notes under about 4 minutes.",
          "التسجيل طويل جداً. اجعل الملاحظات الصوتية أقل من 4 دقائق تقريباً.",
        ),
      },
      { status: 413 },
    );
  }

  try {
    const result = await transcribe(audio, String(form?.get("language") ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t("Transcription failed.", "فشل التفريغ.") },
      { status: 502 },
    );
  }
}
