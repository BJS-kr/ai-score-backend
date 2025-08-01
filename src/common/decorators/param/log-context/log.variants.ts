export type ReviewLogInfo = {
  submissionId: string;
  videoSasUrl?: string;
  audioSasUrl?: string;
  reviewPrompt?: string;
  reviewResponse?: string;
  score?: number;
  feedback?: string;
  highlights?: string[];
  highlightedText?: string;
};

export type NewSubmissionLogInfo = ReviewLogInfo & {
  localVideoPath?: string;
  localAudioPath?: string;
  videoFileUrl?: string;
  audioFileUrl?: string;
};
