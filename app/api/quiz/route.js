import { requireUser } from "@/lib/server/auth";
import { getActiveQuiz } from "@/lib/server/quiz";

export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const questions = await getActiveQuiz();
  return Response.json({ questions });
}
