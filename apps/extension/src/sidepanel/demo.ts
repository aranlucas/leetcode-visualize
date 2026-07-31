import type {
  AnswerFeedback,
  CodeReview,
  CurrentCode,
  DirectAnswer,
  Problem,
  TutoringSession,
  Visualization,
} from "../types";

export const demoProblem: Problem = {
  platform: "leetcode",
  title: "Two Sum",
  difficulty: "Easy",
  topics: ["Array", "Hash Table"],
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  url: "https://leetcode.com/problems/two-sum/",
};

const demoVisualization: Visualization = {
  title: "Find the matching pair",
  overview: "Track each value and the complement needed to reach the target.",
  kind: "pipeline",
  structureLabel: "nums",
  model: "demo",
  items: [
    { id: "n0", label: "0", value: "2", index: 0, row: null, column: null, x: null, y: null },
    { id: "n1", label: "1", value: "7", index: 1, row: null, column: null, x: null, y: null },
    { id: "n2", label: "2", value: "11", index: 2, row: null, column: null, x: null, y: null },
    { id: "n3", label: "3", value: "15", index: 3, row: null, column: null, x: null, y: null },
  ],
  edges: [],
  steps: [
    {
      title: "Start at the first value",
      explanation: "The target is 9. At index 0, the value is 2, so its complement is 7.",
      activeItemIds: ["n0"],
      activeEdgeIds: [],
      variables: [
        { name: "target", value: "9" },
        { name: "needed", value: "7" },
      ],
      metrics: [
        { label: "Processed", value: "1 / 4" },
        { label: "Current value", value: "2" },
        { label: "Complement", value: "7" },
        { label: "Seen values", value: "0" },
      ],
      processStages: [
        { label: "Read value", value: "2", tokens: [] },
        { label: "Compute target − value", value: "", tokens: ["9", "−", "2"] },
        { label: "Look for complement", value: "7 not seen", tokens: [] },
      ],
      buckets: [
        { key: "seen", values: ["2 → index 0"] },
      ],
      callout:
        "The complement 7 is not present yet, so remember 2 and continue.",
    },
    {
      title: "Check the next value",
      explanation: "The value 7 is exactly the complement needed by 2.",
      activeItemIds: ["n0", "n1"],
      activeEdgeIds: [],
      variables: [
        { name: "current", value: "7" },
        { name: "pair", value: "2 + 7" },
      ],
      metrics: [
        { label: "Processed", value: "2 / 4" },
        { label: "Current value", value: "7" },
        { label: "Complement", value: "2" },
        { label: "Seen values", value: "1" },
      ],
      processStages: [
        { label: "Read value", value: "7", tokens: [] },
        { label: "Compute target − value", value: "", tokens: ["9", "−", "7"] },
        { label: "Look for complement", value: "2 found", tokens: [] },
      ],
      buckets: [
        { key: "seen", values: ["2 → index 0"] },
      ],
      callout:
        "The complement 2 is already in the map, so the matching indices are known.",
    },
    {
      title: "Connect the pair",
      explanation: "Indices 0 and 1 form the pair because their values add to 9.",
      activeItemIds: ["n0", "n1"],
      activeEdgeIds: [],
      variables: [{ name: "indices", value: "[0, 1]" }],
      metrics: [
        { label: "Processed", value: "2 / 4" },
        { label: "Left index", value: "0" },
        { label: "Right index", value: "1" },
        { label: "Sum", value: "9" },
      ],
      processStages: [
        { label: "Retrieve prior index", value: "0", tokens: [] },
        { label: "Pair with current index", value: "", tokens: ["0", "+", "1"] },
        { label: "Return indices", value: "[0, 1]", tokens: [] },
      ],
      buckets: [
        { key: "answer", values: ["index 0 → 2", "index 1 → 7"] },
      ],
      callout:
        "The map connects the current value to the earlier index that completes the target.",
    },
  ],
};

export const demoSession: TutoringSession = {
  title: "Build the complement idea",
  overview:
    "Start by clarifying the contract, then use the target relationship to improve on checking every pair.",
  model: "demo",
  visualizationRecommended: true,
  visualizationReason:
    "A short array walkthrough makes the changing complement and remembered values easier to see.",
  visualization: demoVisualization,
  stages: [
    {
      id: "understand",
      title: "Understand the ask",
      objective: "Clarify the contract before choosing a data structure.",
      sections: [
        {
          title: "Say it back",
          body: "Find two different positions whose values add to the target.",
          bullets: [],
        },
        {
          title: "Clarify before coding",
          body: "Confirm the assumptions that would change your implementation.",
          bullets: [
            "Can I assume exactly one valid pair?",
            "Can I reuse the same element?",
            "Does the answer order matter?",
          ],
        },
      ],
      coachPrompt:
        "Before moving on, what information would you need to track while scanning the array?",
      coachingNote:
        "The useful relationship is not just the current value—it is the other value needed to reach the target.",
      talkTrack:
        "I want to confirm that I need two distinct indices and can assume one valid answer.",
    },
    {
      id: "notice",
      title: "Notice the relationship",
      objective: "Turn the target equation into something you can look up.",
      sections: [
        {
          title: "Read the example actively",
          body: "With target 9, seeing 2 immediately creates a new question: have I seen 7?",
          bullets: ["For each value x, the needed partner is target − x."],
        },
        {
          title: "Spot the repeated work",
          body: "Checking every later element repeats the same search for a needed partner.",
          bullets: ["The repeated operation is a membership lookup."],
        },
      ],
      coachPrompt:
        "What kind of structure makes repeated membership checks fast?",
      coachingNote:
        "A hash-based structure can remember values already seen and answer membership questions quickly.",
      talkTrack:
        "Each value determines its complement, so the key operation is checking whether that complement has appeared.",
    },
    {
      id: "explore",
      title: "Explore the options",
      objective: "Compare the obvious baseline with a more efficient direction.",
      sections: [
        {
          title: "Start with the baseline",
          body: "Try every pair. It is simple and establishes a correct reference point.",
          bullets: ["Time: O(n²)", "Extra space: O(1)"],
        },
        {
          title: "Trade space for lookup speed",
          body: "Remember earlier values so each new element can check for its complement.",
          bullets: ["Time: O(n) on average", "Extra space: O(n)"],
        },
      ],
      coachPrompt:
        "Why should the lookup happen before storing the current element?",
      coachingNote:
        "Checking first prevents one element from pairing with itself when its value is half the target.",
      talkTrack:
        "The quadratic baseline works, but I can trade linear space for constant-time average lookups.",
    },
    {
      id: "plan",
      title: "Plan the approach",
      objective: "State the invariant and the sequence before writing code.",
      sections: [
        {
          title: "Keep one invariant",
          body: "Before processing index i, the map contains the values and indices from positions before i.",
          bullets: [],
        },
        {
          title: "Walk the plan",
          body: "For each value, compute its complement, check the map, then remember the current value and index.",
          bullets: [
            "Return as soon as the complement is present.",
            "Otherwise continue with the updated map.",
          ],
        },
      ],
      coachPrompt:
        "What are the time and space costs, and what assumption makes the lookup cost average O(1)?",
      coachingNote:
        "The scan is linear; the hash table uses linear space; hash lookup is expected constant time.",
      talkTrack:
        "I will scan once while maintaining a map from seen values to their indices.",
    },
    {
      id: "explain",
      title: "Explain it clearly",
      objective: "Practice a concise, interviewer-friendly walkthrough.",
      sections: [
        {
          title: "Thirty-second explanation",
          body: "I convert the pair condition into a complement lookup and remember prior values as I scan.",
          bullets: [],
        },
        {
          title: "Call out the checkpoints",
          body: "Mention distinct indices, lookup-before-insert, early return, and O(n) time with O(n) space.",
          bullets: [
            "Test a pair near the beginning.",
            "Test duplicate values such as [3, 3] with target 6.",
          ],
        },
      ],
      coachPrompt:
        "Can you explain the invariant and complexity without referring to code?",
      coachingNote:
        "A strong explanation connects the equation, the lookup structure, the invariant, and the complexity.",
      talkTrack:
        "For each number I look for target minus that number among previously seen values, then store the current one.",
    },
  ],
  hints: [
    {
      level: 1,
      title: "Think in complements",
      content: "For each number, ask what other value would be needed to reach the target.",
    },
    {
      level: 2,
      title: "Remember what you have seen",
      content: "Can you store earlier values in a structure that supports a fast membership check?",
    },
    {
      level: 3,
      title: "One pass is enough",
      content: "As you scan, check for the complement first, then remember the current value and index.",
    },
  ],
};

export const demoAnswerFeedback: AnswerFeedback = {
  summary:
    "You found the complement relationship, but your explanation should make the lookup order and distinct-index assumption explicit.",
  strengths: [
    "You connected each number to the value needed to reach the target.",
    "You recognized that remembering earlier values avoids checking every pair.",
  ],
  improvements: [
    "State what the map stores: each previously seen value and its index.",
    "Explain that you check for the complement before inserting the current value so an element cannot match itself.",
    "Finish with the expected O(n) time and O(n) space costs.",
  ],
  improvedAnswer:
    "I would scan the array once while storing each previously seen value with its index. For the current value, I compute target minus that value and check whether the complement is already in the map. I check before inserting the current value so I always use two distinct indices. This takes O(n) expected time and O(n) extra space.",
  followUpQuestion:
    "How would your reasoning handle duplicate values such as [3, 3] with a target of 6?",
  model: "demo",
};

export const demoCurrentCode: CurrentCode = {
  code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            seen.put(nums[i], i);
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
        }
        return new int[0];
    }
}`,
};

export const demoCodeReview: CodeReview = {
  status: "bug-likely",
  summary:
    "The one-pass hash-map direction is appropriate, but the current update order can reuse the same array element as both members of the pair.",
  strengths: [
    "The code computes a complement for each value.",
    "A hash map keeps the intended average time complexity linear.",
  ],
  issues: [
    {
      title: "The current value is stored too early",
      explanation:
        "seen.put(nums[i], i) runs before the complement lookup. When nums[i] is half the target, the lookup can immediately return the same index twice.",
      hint:
        "Preserve the invariant that seen contains only indices strictly before i when you perform the lookup.",
    },
  ],
  edgeCases: [
    "A single value equal to half the target",
    "Duplicate values such as [3, 3] with target 6",
    "A valid pair whose values appear near the end",
  ],
  nextStep:
    "Reconsider the order of the lookup and insertion, then trace [3, 3] with target 6 by hand.",
  model: "demo",
};

export const demoDirectAnswer: DirectAnswer = {
  approach:
    "Scan once while mapping each previously seen value to its index. For every value, look up the complement before inserting the current value.",
  explanation:
    "At index i, compute target - nums[i]. If that complement is already in the map, its stored index and i are the answer. Looking up before inserting preserves the invariant that the map contains only earlier positions, so one element cannot match itself.",
  code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`,
  complexity: "O(n) expected time and O(n) extra space.",
  keyInsight:
    "Turn the pair equation a + b = target into a fast lookup for target - current.",
  model: "demo",
  reminderAt: Date.now() + 24 * 60 * 60 * 1_000,
};
