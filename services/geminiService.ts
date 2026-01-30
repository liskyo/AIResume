import { GoogleGenAI, Type, Schema } from "@google/genai";
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

const fileToText = (file: File): Promise<string> => {
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

export const generateResume = async (data: UserInputData): Promise<GeneratedResume> => {
  // Safe Access to API Key
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
  if (!apiKey) {
      throw new Error("API Key is missing from environment variables (process.env.API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

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

  // 2. Handle Text File Upload
  if (data.uploadedResumeFile) {
      try {
          const textContent = await fileToText(data.uploadedResumeFile);
          textPrompt += `\n\n[Reference Resume Content]:\n${textContent}`;
      } catch (e) {
          console.error("Error reading text file", e);
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
        // Handle Text Files
        else if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
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
