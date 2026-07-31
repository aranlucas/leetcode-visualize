import type { CodeReview, CodeReviewIssue } from "../types";

const PLATFORM_BOILERPLATE_PATTERN =
  /\b(imports?|java\.util|package declaration|standalone (?:java|compil(?:e|ation|er))|auto-?imports?|judge (?:includes|provides))\b/i;

function isPlatformBoilerplateIssue(issue: CodeReviewIssue): boolean {
  return PLATFORM_BOILERPLATE_PATTERN.test(
    `${issue.title} ${issue.explanation} ${issue.hint}`,
  );
}

export function sanitizeCodeReview(review: CodeReview): CodeReview {
  const issues = review.issues.filter(
    (issue) => !isPlatformBoilerplateIssue(issue),
  );
  if (issues.length === review.issues.length) return review;

  const hasAlgorithmicIssues = issues.length > 0;
  const summary = PLATFORM_BOILERPLATE_PATTERN.test(review.summary)
    ? hasAlgorithmicIssues
      ? "The submitted logic needs attention on the algorithmic issues below."
      : "No platform-relevant correctness issue was identified in the submitted algorithm."
    : review.summary;
  const nextStep = PLATFORM_BOILERPLATE_PATTERN.test(review.nextStep)
    ? review.edgeCases[0]
      ? `Trace the code against this case: ${review.edgeCases[0]}`
      : "Trace the code against the provided examples and verify its output."
    : review.nextStep;

  return {
    ...review,
    issues,
    nextStep,
    status: hasAlgorithmicIssues ? review.status : "on-track",
    summary,
  };
}
