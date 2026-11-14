import { NextResponse } from "next/server";
import { parseIntelligencePrompt } from "@/lib/dashboardData";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required to parse an intelligence request." },
        { status: 400 },
      );
    }

    const parsed = parseIntelligencePrompt(prompt);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse intelligence prompt", detail: String(error) },
      { status: 400 },
    );
  }
}
