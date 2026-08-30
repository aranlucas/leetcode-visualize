import { installLeetCodeFormatter } from "./formatter-installer";

void installLeetCodeFormatter(document).catch((error: unknown) => {
  console.error("ProblemPrism could not install the LeetCode formatter", error);
});
