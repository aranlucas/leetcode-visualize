import {
  extractEditorCode,
  extractProblem,
  getSelectedText,
} from "./extractor";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PROBLEM_PRISM_GET_PROBLEM") {
    sendResponse({ problem: extractProblem(document, window.location) });
    return;
  }

  if (message?.type === "PROBLEM_PRISM_GET_SELECTION") {
    sendResponse({ selectedText: getSelectedText(document) });
    return;
  }

  if (message?.type === "PROBLEM_PRISM_GET_CODE") {
    sendResponse({ code: extractEditorCode(document) });
  }
});
