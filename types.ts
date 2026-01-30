// Input Types (Raw data from user)
export interface RawProject {
  id: string;
  title: string;
  url: string;
  description: string;
  attachments: File[]; // Can be images (for display & analysis) or text (for analysis only)
}

export interface RawExperience {
  id: string;
  company: string;
  title: string;
  period: string;
  content: string; // Rough text
}

export interface UserInputData {
  name: string;
  email: string;
  phone: string;
  targetPosition: string;
  summaryRaw: string; // Rough intro
  experiences: RawExperience[];
  educationRaw: string; // Rough education text
  projects: RawProject[];
  uploadedResumeFile: File | null; // Optional upload of existing text resume
}

// Output Types (Structured data from Gemini)
export interface OptimizedExperience {
  company: string;
  title: string;
  period: string;
  highlights: string[]; // Bullet points
}

export interface OptimizedProject {
  title: string;
  role: string;
  techStack: string[];
  description: string; // STAR method description
  url?: string;
}

export interface GeneratedResume {
  professionalTitle: string;
  professionalSummary: string; // Executive summary
  skills: string[]; // Hard & Soft skills
  experiences: OptimizedExperience[];
  projects: OptimizedProject[];
  education: string[];
  autobiography: string; // 104 style autobiography
  interviewTips: string; // Bonus advice for the candidate
}
