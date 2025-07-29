export interface SubmissionResult {
  message: string;
  videoUrl: string;
  audioUrl: string;
  score: number;
  feedback: string;
  highlights: string[];
  highlightedText: string;
  studentId: string;
  studentName: string;
  submitText: string;
}
