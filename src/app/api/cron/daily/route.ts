import { NextResponse, type NextRequest } from "next/server";
import { runDailyJobs, type DailyJob } from "@/lib/cron/daily-jobs";

// Taeglicher Zeitplaner (Vercel Cron, siehe vercel.json, #83). Einzelne
// Aufgaben (E-Mail-Erinnerungen #84/#2/#3, Konto-Bereinigung #89, ...)
// werden hier nacheinander eingehaengt, sobald die jeweiligen Features
// umgesetzt sind - bisher noch keine.
const DAILY_JOBS: DailyJob[] = [];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runDailyJobs(DAILY_JOBS);

  return NextResponse.json({ results });
}
