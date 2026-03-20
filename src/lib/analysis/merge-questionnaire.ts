import { QUESTION_IDS, type QuestionId } from "@/lib/constants/questionnaire";

export function mergeQuestionnaire(
  rows: { questionId: string; asked: boolean }[],
): { questionId: QuestionId; asked: boolean }[] {
  const map = new Map<string, boolean>();
  for (const row of rows) {
    if (QUESTION_IDS.includes(row.questionId as QuestionId)) {
      map.set(row.questionId, row.asked);
    }
  }
  return QUESTION_IDS.map((id) => ({
    questionId: id,
    asked: map.get(id) ?? false,
  }));
}
