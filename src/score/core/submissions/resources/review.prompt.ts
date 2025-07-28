export const REVIEW_PROMPT = `
      You are an English essay evaluation expert. Please evaluate the following essay and provide a structured response.

      --Essay Text Start--

      $ESSAY_TEXT$

      --Essay Text End--

      Please evaluate this essay based on:
      1. Grammar and language usage
      2. Content relevance to the topic
      3. Organization and structure
      4. Vocabulary usage
      5. Overall coherence

      Provide your response in the following JSON format:
      {
        "score": [integer from 0-10],
        "feedback": "[detailed feedback with specific comments on grammar, content, structure, etc.]",
        "highlights": ["word or sentence 1", "word or sentence 2", "..."]
      }

      Do not wrap the response in json tags.
      Bad example:
      \`\`\`json
      {
        "score": 10,
        "feedback": "...",
        "highlights": ["..."]
      }
      \`\`\`

      Good example:
      {
        "score": 10,
        "feedback": "...",
        "highlights": ["..."]
      }

      Rules:
      - Score must be an integer between 0 and 10
      - If score is not 10, include the problematic words/sentences in highlights array
      - Feedback should be constructive and specific
      - Highlights should contain exact words or sentences from the original text that need attention
      - Response must be valid JSON only, no additional text or comments
    `;
