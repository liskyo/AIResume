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
          mimeType: file.type,
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
    professionalTitle: { type: Type.STRING, description: "A catchy professional headline" },
    professionalSummary: { type: Type.STRING, description: "A strong executive summary (3-4 sentences)" },
    skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key technical and soft skills" },
    experiences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          period: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Action-oriented achievements using numbers where possible" }
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
          description: { type: Type.STRING, description: "Detailed description emphasizing contribution and impact" },
          url: { type: Type.STRING }
        },
        required: ["title", "role", "techStack", "description"]
      }
    },
    education: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Formatted education details" },
    autobiography: { type: Type.STRING, description: "A professional autobiography suitable for Taiwan 104 Job Bank (min 500 words)" },
    interviewTips: { type: Type.STRING, description: "Short advice for the candidate based on their profile to impress interviewers" }
  },
  required: ["professionalTitle", "professionalSummary", "skills", "experiences", "projects", "education", "autobiography", "interviewTips"]
};

export const generateResume = async (data: UserInputData): Promise<GeneratedResume> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Prepare Text Context
  let textPrompt = `
    Role: You are an expert HR Consultant and Resume Writer specializing in the Taiwan market (104 Job Bank format).
    Task: Analyze the user's rough input, uploaded text files, and project images. Transform them into a highly professional, competitive resume that would excite a hiring manager.
    
    User Profile:
    Name: ${data.name}
    Target Position: ${data.targetPosition}
    Rough Summary: ${data.summaryRaw}
    Rough Education: ${data.educationRaw}
    
    Work Experience (Rough):
    ${data.experiences.map(e => `- ${e.company} (${e.period}) as ${e.title}: ${e.content}`).join('\n')}
    
    Projects (Rough):
    ${data.projects.map(p => `- ${p.title} (${p.url}): ${p.description}`).join('\n')}
  `;

  // 2. Handle Text File Upload
  if (data.uploadedResumeFile) {
      try {
          const textContent = await fileToText(data.uploadedResumeFile);
          textPrompt += `\n\nAdditional Uploaded Resume Content:\n${textContent}`;
      } catch (e) {
          console.error("Error reading text file", e);
      }
  }

  // 3. Prepare Image Parts (Project Screenshots / Tech Docs)
  const imageParts: any[] = [];
  for (const proj of data.projects) {
    if (proj.images && proj.images.length > 0) {
      textPrompt += `\n(Note: I have attached images for project "${proj.title}". Analyze them to infer technical complexity and visual quality to enhance the project description.)`;
      for (const img of proj.images) {
        try {
            const part = await fileToPart(img);
            imageParts.push(part);
        } catch(e) {
            console.error("Failed to process image", e);
        }
      }
    }
  }

  // 4. Call Gemini
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
            role: 'user',
            parts: [
                ...imageParts,
                { text: textPrompt }
            ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
        systemInstruction: "You are a professional resume rewriter. Use professional business Traditional Chinese (Taiwan). Use the STAR method (Situation, Task, Action, Result) for bullet points. Be specific, quantify results, and use action verbs.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedResume;
    } else {
      throw new Error("No response text generated");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
