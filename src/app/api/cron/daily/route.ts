import { NextResponse, type NextRequest } from "next/server";
import { runDailyJobs, type DailyJob } from "@/lib/cron/daily-jobs";
import { deleteUnconfirmedAccounts } from "@/lib/cron/delete-unconfirmed-accounts";
import { convertPastGifts } from "@/lib/cron/convert-past-gifts";
import { sendBirthdayReminders } from "@/lib/cron/send-birthday-reminders";
import { sendChristmasStatusOverview } from "@/lib/cron/send-christmas-status";

// Taeglicher Zeitplaner (Vercel Cron, siehe vercel.json, #83). Einzelne
// Aufgaben werden hier nacheinander eingehaengt, sobald die jeweiligen
// Features umgesetzt sind.
const DAILY_JOBS: DailyJob[] = [
  { name: "delete-unconfirmed-accounts", run: deleteUnconfirmedAccounts },
  { name: "convert-past-gifts", run: convertPastGifts },
  { name: "send-birthday-reminders", run: sendBirthdayReminders },
  { name: "send-christmas-status", run: sendChristmasStatusOverview },
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runDailyJobs(DAILY_JOBS);

  return NextResponse.json({ results });
}
