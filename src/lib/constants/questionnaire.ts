export const QUESTION_IDS = [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9",
  "Q10",
  "Q11",
  "Q12",
  "Q13",
  "Q14",
  "Q15",
] as const;

export type QuestionId = (typeof QUESTION_IDS)[number];

export type SalesQuestion = {
  id: QuestionId;
  salesQuestion: string;
};

/** Predefined discovery questions — AI marks whether each was asked or clearly addressed. */
export const SALES_QUESTIONS: readonly SalesQuestion[] = [
  {
    id: "Q1",
    salesQuestion:
      "Are you remodeling the entire kitchen or just replacing cabinets?",
  },
  {
    id: "Q2",
    salesQuestion:
      "Is this kitchen for your primary home or a rental property?",
  },
  {
    id: "Q3",
    salesQuestion: "What is the approximate size or layout of your kitchen?",
  },
  {
    id: "Q4",
    salesQuestion:
      "Are you planning to keep the same layout or redesign the kitchen?",
  },
  {
    id: "Q5",
    salesQuestion:
      "Do you have a preferred cabinet style (Shaker, flat panel, traditional)?",
  },
  {
    id: "Q6",
    salesQuestion: "Do you have a preferred cabinet color or finish?",
  },
  {
    id: "Q7",
    salesQuestion: "What budget range are you targeting for your kitchen cabinets?",
  },
  {
    id: "Q8",
    salesQuestion:
      "Would you like to schedule a design consultation or review designs?",
  },
  {
    id: "Q9",
    salesQuestion: "What are your thoughts about the design proposal we shared?",
  },
  {
    id: "Q10",
    salesQuestion: "Are you comparing quotes from other companies?",
  },
  {
    id: "Q11",
    salesQuestion: "What materials are the other companies offering?",
  },
  {
    id: "Q12",
    salesQuestion: "Would you like help reviewing the competitor quote?",
  },
  {
    id: "Q13",
    salesQuestion: "Are there any concerns about pricing or materials?",
  },
  {
    id: "Q14",
    salesQuestion:
      "Are you interested in additional features like soft-close drawers or organizers?",
  },
  {
    id: "Q15",
    salesQuestion:
      "Do you have any concerns about delivery timelines or installation?",
  },
] as const;
