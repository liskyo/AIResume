import { GoogleGenAI, Type, Schema, Chat, LiveServerMessage, Modality } from "@google/genai";
import { UserInputData, GeneratedResume } from "../types";

// Helper to convert File to Base64 for Gemini
const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'image/jpeg',
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const fileToText = async (file: File): Promise<string> => {
    // Handle PDF files
    if (file.type === 'application/pdf') {
        if (typeof window === 'undefined' || !(window as any).pdfjsLib) {
            console.warn("PDF.js not loaded, falling back to empty string");
            return "";
        }
        try {
            const pdfjs = (window as any).pdfjsLib;
            // Set worker manually to ensure it loads from CDN correctly
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
            }
            return fullText;
        } catch (e) {
            console.error("PDF Parsing Error:", e);
            return `(Error parsing PDF: ${file.name})`;
        }
    }

    // Handle Text/MD files
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const resumeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    professionalTitle: { type: Type.STRING, description: "A catchy professional headline (e.g., 'Senior Frontend Engineer | React Specialist')" },
    professionalSummary: { type: Type.STRING, description: "A strong executive summary (3-4 sentences) highlighting years of experience and key achievements." },
    skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key technical and soft skills formatted as tags." },
    experiences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          period: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 bullet points using STAR method. Quantify results." }
        },
        required: ["company", "title", "period", "highlights"]
      }
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          role: { type: Type.STRING },
          techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING, description: "Detailed description emphasizing contribution, technical challenges solved, and impact." },
          url: { type: Type.STRING }
        },
        required: ["title", "role", "techStack", "description"]
      }
    },
    education: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Formatted education details (Degree, School, Period)." },
    autobiography: { type: Type.STRING, description: "A professional autobiography suitable for Taiwan 104 Job Bank (600-1000 characters). Tone: Confident, Humble, Determined." },
    interviewTips: { type: Type.STRING, description: "Short, actionable advice for the candidate." }
  },
  required: ["professionalTitle", "professionalSummary", "skills", "experiences", "projects", "education", "autobiography", "interviewTips"]
};

// --- API Helpers ---
const getAiClient = () => {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
    if (!apiKey) {
        throw new Error("API Key is missing from environment variables (process.env.API_KEY).");
    }
    return new GoogleGenAI({ apiKey: apiKey });
};

export const generateResume = async (data: UserInputData): Promise<GeneratedResume> => {
  const ai = getAiClient();

  // 1. Prepare Text Context
  let textPrompt = `
    Role: You are a top-tier Career Consultant and Resume Writer specializing in the Taiwan market (104 Job Bank format).
    Task: Create a "Confidence Resume" that maximizes the candidate's strengths. Analyze the user's rough input, uploaded text files, and project images.
    
    User Profile:
    Name: ${data.name}
    Target Position: ${data.targetPosition}
    Rough Summary: ${data.summaryRaw}
    Rough Education: ${data.educationRaw}
    
    Work Experience (Rough):
    ${data.experiences.map(e => `- ${e.company} (${e.period}) as ${e.title}: ${e.content}`).join('\n')}
    
    Projects (Rough):
    ${data.projects.map(p => `- ${p.title} (${p.url}): ${p.description}`).join('\n')}
    
    Requirements:
    1. Language: Traditional Chinese (Taiwan).
    2. Tone: Professional, Confident, Action-oriented.
    3. Format: Optimize for readability and 104 Job Bank style.
    4. Projects: Use the images (if provided) to infer technical complexity (UI/UX, Architecture) and mention it in the description.
    5. CRITICAL: When generating the 'projects' array, you MUST use the EXACT SAME 'title' as provided in the User Profile for each project. Do not rename projects, or I cannot match the images to the text.
  `;

  // 2. Handle Text/PDF File Upload
  if (data.uploadedResumeFile) {
      try {
          const textContent = await fileToText(data.uploadedResumeFile);
          textPrompt += `\n\n[Reference Resume Content (${data.uploadedResumeFile.name})]:\n${textContent}`;
      } catch (e) {
          console.error("Error reading file", e);
      }
  }

  // 3. Prepare Image Parts & Project Text Files
  const imageParts: any[] = [];
  
  // We need to await the loop to process files
  for (const proj of data.projects) {
    if (proj.attachments && proj.attachments.length > 0) {
      textPrompt += `\n--- Attachments for Project: "${proj.title}" ---`;
      
      for (const file of proj.attachments) {
        // Handle Images
        if (file.type.startsWith("image/")) {
            try {
                const part = await fileToPart(file);
                imageParts.push(part);
                textPrompt += `\n(Image attached: ${file.name}. Analyze this image to describe the UI or Architecture.)`;
            } catch(e) {
                console.warn("Failed to process image", e);
            }
        } 
        // Handle Text/PDF Files
        else if (file.type === 'application/pdf' || file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
            try {
                const content = await fileToText(file);
                textPrompt += `\n[File Content (${file.name})]:\n${content}\n`;
            } catch (e) {
                console.warn("Failed to process text file", e);
            }
        }
      }
    }
  }

  // 4. Call Gemini
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        role: 'user',
        parts: [
            ...imageParts,
            { text: textPrompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
        systemInstruction: "You are an expert resume builder. Your goal is to rewrite the user's resume to be highly competitive on Taiwan's 104 Job Bank. Focus on achievements, clear metrics, and professional phrasing.",
      },
    });

    let jsonString = response.text || "{}";
    // Clean up potential markdown formatting from the response
    if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```(json)?\n/, "").replace(/```$/, "");
    }
    
    return JSON.parse(jsonString) as GeneratedResume;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- Standard Chat Interview Module ---

export interface InterviewSetupData {
  resumeText: string;
  jobDescription: string;
  style: 'friendly' | 'strict';
}

export const startInterviewSession = (data: InterviewSetupData): Chat => {
  const ai = getAiClient();
  
  const stylePrompt = data.style === 'strict' 
    ? "Tone: Strict, professional, digging deep into technical details and inconsistencies. Do not be easily satisfied. Pressure the candidate slightly to test resilience." 
    : "Tone: Friendly, encouraging, conversational. Focus on cultural fit and potential. Make the candidate feel comfortable.";

  const systemInstruction = `
    You are an AI Interviewer for a job interview.
    
    Context:
    1. Candidate Resume: ${data.resumeText.substring(0, 10000)}... (Truncated if too long)
    2. Target Job Description (JD): ${data.jobDescription.substring(0, 5000)}...
    
    Your Instructions:
    - ${stylePrompt}
    - Start by greeting the candidate and asking them to introduce themselves briefly.
    - Ask ONE question at a time. Wait for the user's response.
    - Ask a mix of behavioral (STAR method) and technical questions relevant to the JD and Resume.
    - If the user's answer is vague, ask follow-up questions.
    - Keep your responses concise (under 100 words usually) unless explaining a complex scenario.
    - Language: Traditional Chinese (Taiwan), unless the JD implies English is required, then adapt.
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const generateInterviewFeedback = async (chatHistory: any[]): Promise<string> => {
  const ai = getAiClient();
  
  // Format history for the prompt
  const historyText = chatHistory.map(msg => `${msg.role}: ${msg.parts[0].text}`).join('\n');

  const prompt = `
    Based on the following interview transcript, provide a detailed performance review for the candidate.
    
    Transcript:
    ${historyText}
    
    Output Requirements (in Traditional Chinese, Markdown format):
    1. **Score (0-100)**: Based on relevance, confidence, and technical accuracy.
    2. **Strengths**: What did they do well?
    3. **Weaknesses**: Where did they struggle?
    4. **Keyword Hit Rate**: Did they mention keywords from the implied JD context?
    5. **Actionable Suggestions**: Specific advice to improve for the next real interview.
    
    Make it encouraging but honest.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "無法產生回饋，請稍後再試。";
  } catch (error) {
    console.error("Feedback Generation Error:", error);
    return "發生錯誤，無法分析面試紀錄。";
  }
};

// Export helper for direct PDF parsing in App
export const parseResumeFile = async (file: File): Promise<string> => {
    return fileToText(file);
};

// --- Live API (Real-time Voice) Helpers ---

// Audio Encoding/Decoding Utilities
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const createBlob = (data: Float32Array): any => { // Using any to match API expectation loosely or simple object
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
};

export const connectToLiveSession = async (
  data: InterviewSetupData, 
  onAudioData: (buffer: AudioBuffer) => void,
  onClose: () => void
) => {
  const ai = getAiClient();
  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  
  let stream: MediaStream;
  try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
      console.error("Microphone permission denied", e);
      throw e;
  }

  const stylePrompt = data.style === 'strict' 
    ? "Tone: Strict, professional, asking follow-ups. You are a tough interviewer." 
    : "Tone: Friendly, conversational. You are a supportive interviewer.";

  const systemInstruction = `
    You are an AI Interviewer in a live voice call.
    Role: Professional Recruiter.
    Language: Traditional Chinese (Taiwan), spoken naturally.
    
    Candidate Info:
    Resume: ${data.resumeText.substring(0, 5000)}
    JD: ${data.jobDescription.substring(0, 2000)}
    
    Instructions:
    - ${stylePrompt}
    - Keep responses purely spoken and concise (1-3 sentences).
    - Do not use markdown or bullet points in speech.
    - Start by saying hello and asking for a self-introduction.
  `;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: systemInstruction,
      speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    },
    callbacks: {
      onopen: () => {
        console.log("Live Session Connected");
        // Setup Mic Stream
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
           const inputData = e.inputBuffer.getChannelData(0);
           const pcmBlob = createBlob(inputData);
           sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);
      },
      onmessage: async (msg: LiveServerMessage) => {
        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const buffer = await decodeAudioData(decode(base64Audio), outputAudioContext);
            onAudioData(buffer);
        }
      },
      onclose: () => {
        console.log("Live Session Closed");
        onClose();
      },
      onerror: (e) => {
        console.error("Live Session Error", e);
        onClose();
      }
    }
  });

  return {
    outputAudioContext,
    disconnect: () => {
        stream.getTracks().forEach(t => t.stop());
        inputAudioContext.close();
        outputAudioContext.close();
        sessionPromise.then(s => s.close());
    }
  };
};