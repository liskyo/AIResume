import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Steps } from './components/Steps';
import { ResumePreview } from './components/ResumePreview';
import { generateResume, startInterviewSession, generateInterviewFeedback, parseResumeFile, connectToLiveSession } from './services/geminiService';
import { UserInputData, RawExperience, RawProject, GeneratedResume } from './types';
import { Chat } from "@google/genai";

// --- Types & Constants ---

const INITIAL_DATA: UserInputData = {
  name: '',
  email: '',
  phone: '',
  targetPosition: '',
  summaryRaw: '',
  experiences: [],
  educationRaw: '',
  projects: [],
  uploadedResumeFile: null,
};

const STEPS = ['基本資料', '經歷與學歷', '專案作品', 'AI 生成結果'];
const STORAGE_KEY = 'ai_resume_builder_data';

// --- Helper Components ---

// iOS Segmented Control
const SegmentedControl = ({ activeTab, onChange }: { activeTab: 'resume' | 'interview', onChange: (t: 'resume' | 'interview') => void }) => (
  <div className="flex justify-center mb-6">
    <div className="bg-gray-200 p-1 rounded-full flex w-full max-w-sm shadow-inner relative">
      <button 
        onClick={() => onChange('resume')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all duration-300 z-10 ${
          activeTab === 'resume' ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <span>📝</span> 履歷大師
      </button>
      <button 
        onClick={() => onChange('interview')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all duration-300 z-10 ${
          activeTab === 'interview' ? 'bg-white text-purple-700 shadow-md transform scale-100' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <span>🎙️</span> 模擬面試
      </button>
    </div>
  </div>
);

// --- Main App ---

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'resume' | 'interview'>('resume');

  // Resume Builder State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<UserInputData>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
          ...INITIAL_DATA,
          ...parsed,
          uploadedResumeFile: null,
          projects: Array.isArray(parsed.projects) 
            ? parsed.projects.map((p: any) => ({ ...p, attachments: [] }))
            : []
        };
      }
    } catch (error) {
      console.error("Failed to load saved data:", error);
    }
    return INITIAL_DATA;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Interview Module State
  const [interviewStage, setInterviewStage] = useState<'setup' | 'chat' | 'feedback'>('setup');
  const [jdText, setJdText] = useState('');
  const [interviewStyle, setInterviewStyle] = useState<'friendly' | 'strict'>('friendly');
  const [resumeTextContext, setResumeTextContext] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interviewUploadLoading, setInterviewUploadLoading] = useState(false);
  
  // Live API State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const liveDisconnectRef = useRef<() => void>(() => {});
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    try {
      const dataToSave = {
        ...formData,
        uploadedResumeFile: null,
        projects: formData.projects.map(p => ({ ...p, attachments: [] }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  }, [formData]);

  // Sync Generated Resume to Interview Context
  useEffect(() => {
    if (generatedResume) {
      const summary = `
        Name: ${formData.name}
        Title: ${generatedResume.professionalTitle}
        Summary: ${generatedResume.professionalSummary}
        Skills: ${generatedResume.skills.join(', ')}
        Experience: ${generatedResume.experiences.map(e => `${e.company} - ${e.title}`).join('; ')}
        Projects: ${generatedResume.projects.map(p => p.title).join('; ')}
      `;
      setResumeTextContext(summary);
    } else if (formData.experiences.length > 0) {
       // Fallback to raw data
       const rawSummary = `
         Name: ${formData.name}
         Exp: ${formData.experiences.map(e => `${e.company} ${e.title}`).join('\n')}
       `;
       setResumeTextContext(rawSummary);
    }
  }, [generatedResume, formData]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- Handlers (Resume Builder) ---
  const handleLoadDemoData = () => {
     const demoData: UserInputData = {
        name: '張捷敏',
        email: 'jamie.chang@example.com',
        phone: '0912-345-678',
        targetPosition: '資深前端工程師',
        summaryRaw: '我有5年網頁開發經驗，熟悉 React 和 TypeScript。曾在電商公司負責核心購物車系統，提升轉化率 20%。個性積極，喜歡研究新技術。',
        educationRaw: '國立台灣科技大學 資訊工程系 學士 (2014-2018)',
        experiences: [
          {
            id: `demo-exp-${Date.now()}-1`,
            company: '未來科技有限公司',
            title: '前端工程師',
            period: '2020/06 - 至今',
            content: '負責公司官網改版，使用 Next.js。建立內部 UI Library，減少開發時間 30%。與後端工程師協作 API 串接。'
          },
          {
            id: `demo-exp-${Date.now()}-2`,
            company: '創意數位行銷',
            title: '網頁設計師',
            period: '2018/07 - 2020/05',
            content: '切版各式活動網頁，確保 RWD 效果。使用 jQuery 與 Bootstrap。'
          }
        ],
        projects: [
          {
            id: `demo-proj-${Date.now()}-1`,
            title: '企業級後台管理系統',
            url: 'https://admin-demo.example.com',
            description: '一個提供給客戶管理訂單的後台，包含數據視覺化儀表板。使用 React Query 處理資料快取。',
            attachments: [] 
          }
        ],
        uploadedResumeFile: null
     };
     setFormData(demoData);
     setCurrentStep(0);
  };
  
  const handleInputChange = (field: keyof UserInputData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [...prev.experiences, { id: Date.now().toString(), company: '', title: '', period: '', content: '' }]
    }));
  };

  const updateExperience = (id: string, field: keyof RawExperience, value: string) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const handleAddProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { id: Date.now().toString(), title: '', url: '', description: '', attachments: [] }]
    }));
  };

  const updateProject = (id: string, field: keyof RawProject, value: any) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleProjectAttachmentUpload = (id: string, files: FileList | null) => {
      if (!files || files.length === 0) return;
      
      const fileArray = Array.from(files);
      setFormData(prev => {
          const newProjects = prev.projects.map(p => {
              if (p.id === id) {
                  return { ...p, attachments: [...p.attachments, ...fileArray] };
              }
              return p;
          });
          return { ...prev, projects: newProjects };
      });
  };

  const handleRemoveProjectAttachment = (projectId: string, index: number) => {
      setFormData(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
              if (p.id === projectId) {
                  const newAttachments = [...p.attachments];
                  newAttachments.splice(index, 1);
                  return { ...p, attachments: newAttachments };
              }
              return p;
          })
      }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateResume(formData);
      setGeneratedResume(result);
      setCurrentStep(3);
    } catch (err: any) {
      console.error("Full error:", err);
      let errorMessage = "生成失敗，請檢查 API Key 或重試。";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Handlers (Interview Module) ---
  
  const handleInterviewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setInterviewUploadLoading(true);
    try {
        const text = await parseResumeFile(e.target.files[0]);
        setResumeTextContext(text);
        // Clear generated resume to indicate manual override
        setGeneratedResume(null); 
    } catch (err) {
        console.error(err);
        alert("解析失敗，請確認檔案格式");
    } finally {
        setInterviewUploadLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (!jdText.trim()) {
      alert("請先貼上職缺描述 (JD)");
      return;
    }
    if (!resumeTextContext.trim()) {
        alert("請先產生履歷，或上傳 PDF 履歷");
        return;
    }
    
    // Check for Live Mode
    if (isLiveMode) {
      handleStartLiveInterview();
      return;
    }
    
    // Standard Chat Mode
    setInterviewStage('chat');
    setIsAiThinking(true);
    setChatMessages([]);

    try {
      chatSessionRef.current = startInterviewSession({
        resumeText: resumeTextContext,
        jobDescription: jdText,
        style: interviewStyle
      });

      // Send initial trigger (empty message or greeting prompt)
      const response = await chatSessionRef.current.sendMessage({ message: "Hello, I am ready for the interview." });
      
      setChatMessages([{ role: 'model', text: response.text || "Hello! Let's start." }]);
      
      // Speak the first message
      speakText(response.text || "Hello! Let's start.");

    } catch (err) {
      console.error(err);
      alert("無法啟動面試，請重試");
      setInterviewStage('setup');
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- Live API Handlers ---
  const handleStartLiveInterview = async () => {
     setInterviewStage('chat');
     setIsLiveConnected(true);
     setChatMessages([{ role: 'model', text: "正在連接 AI 語音通話..."}]);
     
     try {
         const { disconnect, outputAudioContext } = await connectToLiveSession(
             { resumeText: resumeTextContext, jobDescription: jdText, style: interviewStyle },
             (audioBuffer) => {
                 // Schedule Playback
                 const source = outputAudioContext.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputAudioContext.destination);
                 
                 source.onended = () => {
                    audioSourcesRef.current.delete(source);
                 };
                 
                 const now = outputAudioContext.currentTime;
                 const start = Math.max(nextStartTimeRef.current, now);
                 source.start(start);
                 nextStartTimeRef.current = start + audioBuffer.duration;
                 audioSourcesRef.current.add(source);
             },
             () => {
                 setIsLiveConnected(false);
                 handleEndInterview(); // Auto feedback when closed
             }
         );
         
         liveDisconnectRef.current = disconnect;
         setChatMessages([{ role: 'model', text: "已連線！請開始說話 (AI 將會主動向您打招呼)。"}]);

     } catch (e) {
         console.error(e);
         alert("無法啟動語音通話，請檢查麥克風權限或網路");
         setIsLiveConnected(false);
         setInterviewStage('setup');
     }
  };

  const handleDisconnectLive = () => {
      if (liveDisconnectRef.current) {
          liveDisconnectRef.current();
      }
      // Stop all playing audio
      audioSourcesRef.current.forEach(s => s.stop());
      audioSourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      setIsLiveConnected(false);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !chatSessionRef.current) return;

    const userMsg = currentMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setCurrentMessage('');
    setIsAiThinking(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userMsg });
      const aiMsg = response.text || "...";
      setChatMessages(prev => [...prev, { role: 'model', text: aiMsg }]);
      speakText(aiMsg);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: "(連線錯誤，請重試)" }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleEndInterview = async () => {
    if (isLiveMode && isLiveConnected) {
        handleDisconnectLive();
    }

    if (chatSessionRef.current) {
        // Convert Chat history for feedback
        const history = await chatSessionRef.current.getHistory();
        setInterviewStage('feedback');
        setInterviewFeedback(''); // Reset
        const feedback = await generateInterviewFeedback(history);
        setInterviewFeedback(feedback);
    } else {
        // For Live mode, we might not have text transcript easily available unless we used transcription features.
        // For now, give a generic completion message or basic feedback if available.
        setInterviewStage('feedback');
        setInterviewFeedback("語音通話模式已結束。 (目前 Live API 版本暫不支援文字逐字稿分析，請切換至文字模式以獲取詳細報告)");
    }
  };

  // --- Voice Features ---
  
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop previous
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW'; // Default to TW
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMic = () => {
    // @ts-ignore - webkitSpeechRecognition is not standard in TS types
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的瀏覽器不支援語音辨識功能 (建議使用 Chrome)");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.interimResults = true; // IMPORTANT: Real-time typing effect
    recognition.maxAlternatives = 1;
    recognition.continuous = false; // Stop after one sentence to send

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      // With interimResults, we need to handle final vs interim
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Update input. Note: We only append final, and show interim.
      // For simplicity in this text box, we just replace the pending text part or append.
      // Since this is a simple input, let's just set value.
      if (finalTranscript) {
           setCurrentMessage(prev => prev + finalTranscript);
      }
    };

    recognition.start();
  };

  // --- Render Functions (Resume) ---
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-sm text-blue-700">
            💡 系統會自動儲存您的文字輸入。若重新整理頁面，文字資料將會保留，但<b>上傳的檔案（履歷檔、圖片）需要重新上傳</b>。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    placeholder="王大明"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">目標職位</label>
                <input 
                    type="text" 
                    value={formData.targetPosition}
                    onChange={(e) => handleInputChange('targetPosition', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    placeholder="資深前端工程師"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">電話</label>
                <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
            </div>
        </div>
        
        <div>
            <label className="block text-sm font-medium text-gray-700">既有履歷檔案 (選填，支援 PDF, TXT, MD)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                <div className="space-y-1 text-center">
                    <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center text-2xl">📄</div>
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                            <span>上傳檔案</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.txt,.md" onChange={(e) => handleInputChange('uploadedResumeFile', e.target.files?.[0] || null)} />
                        </label>
                    </div>
                    {formData.uploadedResumeFile && <p className="text-xs text-green-600">已選擇: {formData.uploadedResumeFile.name}</p>}
                </div>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">自我介紹草稿 (簡單描述即可)</label>
            <textarea 
                rows={4}
                value={formData.summaryRaw}
                onChange={(e) => handleInputChange('summaryRaw', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="我擁有五年行銷經驗，擅長社群操作..."
            />
        </div>
    </div>
  );

  const renderStep2 = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
              <h3 className="font-bold text-blue-800">學歷背景</h3>
              <textarea 
                  rows={3}
                  value={formData.educationRaw}
                  onChange={(e) => handleInputChange('educationRaw', e.target.value)}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  placeholder="範例：台灣大學 資訊工程學系 學士 (2015-2019)"
              />
          </div>

          <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">工作經歷</h3>
              <button onClick={handleAddExperience} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium">
                  + 新增經歷
              </button>
          </div>
          
          {formData.experiences.map((exp, index) => (
              <div key={exp.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3 relative">
                  <div className="absolute top-2 right-2 text-xs text-gray-400">#{index + 1}</div>
                  <div className="grid grid-cols-2 gap-4">
                      <input 
                          placeholder="公司名稱" 
                          value={exp.company} 
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          className="border p-2 rounded w-full"
                      />
                      <input 
                          placeholder="職稱" 
                          value={exp.title} 
                          onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                          className="border p-2 rounded w-full"
                      />
                  </div>
                  <input 
                      placeholder="任職期間 (例如: 2020/01 - 2023/05)" 
                      value={exp.period} 
                      onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                      className="border p-2 rounded w-full"
                  />
                  <textarea 
                      placeholder="工作內容簡述 (AI 會幫您修飾成專業列點)" 
                      rows={3}
                      value={exp.content}
                      onChange={(e) => updateExperience(exp.id, 'content', e.target.value)}
                      className="border p-2 rounded w-full"
                  />
                  <button 
                    className="text-red-500 text-sm hover:underline"
                    onClick={() => setFormData(prev => ({...prev, experiences: prev.experiences.filter(e => e.id !== exp.id)}))}
                  >
                    刪除此經歷
                  </button>
              </div>
          ))}
          {formData.experiences.length === 0 && <p className="text-gray-500 text-center py-8">尚未新增工作經歷</p>}
      </div>
  );

  const renderStep3 = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <p className="text-yellow-800 text-sm">
                  <b>💡 AI 提示：</b> 請上傳專案相關檔案。
                  <ul className="list-disc ml-5 mt-1">
                      <li><b>圖片 (.jpg, .png)</b>：AI 會分析畫面，並將圖片展示在履歷中。</li>
                      <li><b>文件 (.pdf, .txt, .md)</b>：AI 會讀取內容作為專案描述參考。</li>
                  </ul>
              </p>
          </div>
          
          <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">專案作品集</h3>
              <button onClick={handleAddProject} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-sm font-medium">
                  + 新增專案
              </button>
          </div>

          {formData.projects.map((proj, index) => (
              <div key={proj.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                          placeholder="專案名稱" 
                          value={proj.title} 
                          onChange={(e) => updateProject(proj.id, 'title', e.target.value)}
                          className="border p-2 rounded w-full"
                      />
                      <input 
                          placeholder="專案連結 (URL)" 
                          value={proj.url} 
                          onChange={(e) => updateProject(proj.id, 'url', e.target.value)}
                          className="border p-2 rounded w-full"
                      />
                  </div>
                  <textarea 
                      placeholder="專案描述、使用的技術..." 
                      rows={3}
                      value={proj.description}
                      onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                      className="border p-2 rounded w-full"
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">上傳相關檔案 (圖片展示 / 文件分析)</label>
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-purple-50 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-100 text-sm font-medium transition-colors">
                            選擇檔案
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*,.txt,.md,.pdf"
                                onChange={(e) => handleProjectAttachmentUpload(proj.id, e.target.files)}
                                className="hidden"
                            />
                        </label>
                        <span className="text-xs text-gray-500">已上傳 {proj.attachments.length} 個檔案</span>
                    </div>
                    
                    {proj.attachments.length > 0 && (
                        <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
                            {proj.attachments.map((file, i) => {
                                const isImage = file.type.startsWith('image/');
                                return (
                                <div key={i} className="relative flex-shrink-0 group w-20 h-20 border border-gray-300 rounded shadow-sm bg-gray-50 flex flex-col items-center justify-center text-center p-1">
                                    {isImage ? (
                                        <img 
                                            src={URL.createObjectURL(file)} 
                                            alt={`preview-${i}`} 
                                            className="h-full w-full object-cover rounded" 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full w-full">
                                            <span className="text-2xl">📄</span>
                                            <span className="text-[10px] text-gray-600 line-clamp-2 leading-tight break-all">{file.name}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => handleRemoveProjectAttachment(proj.id, i)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="刪除"
                                    >
                                        ×
                                    </button>
                                </div>
                                );
                            })}
                        </div>
                    )}
                  </div>
                   <button 
                    className="text-red-500 text-sm hover:underline"
                    onClick={() => setFormData(prev => ({...prev, projects: prev.projects.filter(p => p.id !== proj.id)}))}
                  >
                    刪除此專案
                  </button>
              </div>
          ))}
      </div>
  );

  const renderResumeBuilderView = () => (
    <div className="animate-fade-in">
        <Steps currentStep={currentStep} steps={STEPS} setStep={isGenerating ? () => {} : setCurrentStep} />
        
        {error && (
            <div className="bg-red-50 text-red-600 p-4 mb-4 rounded border-l-4 border-red-500">
                {error}
            </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 min-h-[500px]">
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                   <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="text-xl font-bold text-gray-800">AI 正在打造您的履歷...</p>
                   <p className="text-gray-500">正在優化文字與排版，請稍候。</p>
                </div>
            ) : (
                <>
                    {currentStep === 0 && renderStep1()}
                    {currentStep === 1 && renderStep2()}
                    {currentStep === 2 && renderStep3()}
                    
                    {currentStep === 3 && generatedResume && (
                        <div className="animate-fade-in">
                            <div className="flex justify-end mb-4 gap-2 print:hidden">
                                <button id="download-btn" onClick={() => {
                                     const element = document.getElementById('resume-preview');
                                     if(element && (window as any).html2pdf) {
                                         (window as any).html2pdf().from(element).set({
                                             margin:0, filename: `${formData.name}_CV.pdf`, image: {type:'jpeg', quality:0.98}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'mm', format:'a4'}
                                         }).save();
                                     }
                                }} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition-colors">📥 下載 PDF</button>
                                <button onClick={() => setCurrentStep(0)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors">重新編輯</button>
                            </div>
                            <div className="overflow-x-auto pb-4">
                                <div id="printable-content" className="min-w-[210mm]">
                                    <ResumePreview data={generatedResume} userData={formData} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    {currentStep < 3 && (
                        <div className="mt-8 pt-6 border-t flex justify-between">
                            <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep===0} className="px-6 py-2 rounded border hover:bg-gray-50 disabled:opacity-50">上一步</button>
                            {currentStep < 2 ? (
                                <button onClick={() => setCurrentStep(currentStep + 1)} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">下一步</button>
                            ) : (
                                <button onClick={handleGenerate} className="px-8 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded font-bold shadow-lg hover:shadow-xl">✨ AI 生成履歷</button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );

  const renderInterviewView = () => (
    <div className="animate-fade-in max-w-2xl mx-auto">
       {interviewStage === 'setup' && (
         <div className="bg-white rounded-xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>🎙️</span> 設定面試情境
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. 履歷來源</label>
              
              <div className="space-y-3">
                  {generatedResume ? (
                    <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm border border-green-200 flex items-center gap-2">
                      <span>✅</span> 已自動載入您剛剛製作的 AI 履歷
                    </div>
                  ) : (
                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm border border-yellow-200">
                      尚未生成履歷，將使用暫存資料。建議您生成履歷，或直接上傳 PDF。
                    </div>
                  )}

                  <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-sm text-gray-500">或</span>
                      </div>
                  </div>

                  <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-2xl">📄</span>
                      <span className="text-gray-600 text-sm font-medium">
                          {interviewUploadLoading ? "正在解析 PDF..." : "直接上傳 PDF 履歷 (覆蓋目前資料)"}
                      </span>
                      <input type="file" accept=".pdf" className="hidden" onChange={handleInterviewFileUpload} disabled={interviewUploadLoading} />
                  </label>
                  {resumeTextContext && !generatedResume && !interviewUploadLoading && (
                      <p className="text-xs text-green-600 text-center">已成功載入外部履歷文字</p>
                  )}
              </div>

              <textarea 
                 className="mt-2 w-full border rounded-md p-2 text-sm text-gray-600 h-24 hidden" 
                 value={resumeTextContext} 
                 readOnly 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">2. 目標職缺描述 (Job Description)</label>
              <textarea 
                className="w-full border rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all h-32" 
                placeholder="請貼上您想應徵的職缺內容 (JD)...&#10;例如：我們正在尋找一位熟悉 React 的前端工程師..."
                value={jdText}
                onChange={e => setJdText(e.target.value)}
              />
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">3. 選擇面試官風格</label>
               <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setInterviewStyle('friendly')}
                   className={`p-4 rounded-lg border-2 text-left transition-all ${interviewStyle === 'friendly' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                 >
                   <div className="font-bold text-green-700 mb-1">☕ 親切友善</div>
                   <div className="text-xs text-gray-500">適合練習基本問答，建立自信，著重文化契合度。</div>
                 </button>
                 <button 
                   onClick={() => setInterviewStyle('strict')}
                   className={`p-4 rounded-lg border-2 text-left transition-all ${interviewStyle === 'strict' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                 >
                   <div className="font-bold text-red-700 mb-1">🔥 嚴格犀利</div>
                   <div className="text-xs text-gray-500">適合模擬高壓面試，會追問細節與技術難題。</div>
                 </button>
               </div>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3">
                 <div className="mt-1">
                     <input type="checkbox" id="liveMode" checked={isLiveMode} onChange={e => setIsLiveMode(e.target.checked)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                 </div>
                 <label htmlFor="liveMode" className="text-sm cursor-pointer select-none">
                     <span className="font-bold text-indigo-900 block">開啟語音通話模式 (Live)</span>
                     <span className="text-indigo-700">使用最新的 AI 即時語音技術，您可以直接用說話的方式與 AI 進行全雙工對話，體驗更真實的面試臨場感。</span>
                 </label>
            </div>

            <button 
              onClick={handleStartInterview}
              disabled={interviewUploadLoading}
              className={`w-full py-3 text-white rounded-lg font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isLiveMode ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}
            >
              {isLiveMode ? '📞 開始語音通話面試' : '🚀 開始文字/語音面試'}
            </button>
         </div>
       )}

       {interviewStage === 'chat' && (
         <div className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className={`${isLiveMode && isLiveConnected ? 'bg-indigo-600' : 'bg-purple-700'} text-white p-4 flex justify-between items-center transition-colors duration-500`}>
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
                 <span className="font-bold">
                     AI 面試官 ({interviewStyle === 'friendly' ? '親切' : '嚴格'})
                     {isLiveMode && <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-2">LIVE</span>}
                 </span>
              </div>
              <button onClick={handleEndInterview} className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded">結束並分析</button>
            </div>
            
            {/* Live Mode Visualizer / Chat Content */}
            {isLiveMode ? (
                <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 text-white relative overflow-hidden">
                    {/* Background Animation */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                         <div className={`w-64 h-64 rounded-full border-4 border-indigo-500 ${isLiveConnected ? 'animate-ping' : ''}`}></div>
                    </div>
                    
                    <div className="z-10 text-center space-y-6">
                        <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all duration-500 ${isLiveConnected ? 'bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.5)]' : 'bg-gray-700'}`}>
                             <span className="text-5xl">🎤</span>
                        </div>
                        <div>
                             <h3 className="text-2xl font-bold">{isLiveConnected ? "通話中..." : "連線中..."}</h3>
                             <p className="text-indigo-300 mt-2">請直接說話，AI 會即時回應</p>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-8 left-0 right-0 px-8 text-center">
                         <p className="text-gray-500 text-xs">建議使用耳機以獲得最佳體驗</p>
                    </div>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth">
                   {chatMessages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                         msg.role === 'user' 
                           ? 'bg-blue-600 text-white rounded-br-none' 
                           : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                       }`}>
                         {msg.text}
                       </div>
                     </div>
                   ))}
                   {isAiThinking && (
                     <div className="flex justify-start">
                       <div className="bg-gray-100 rounded-2xl px-4 py-2 flex gap-1">
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                       </div>
                     </div>
                   )}
                   <div ref={messagesEndRef} />
                </div>
            )}

            {/* Input Area (Hidden for Live Mode usually, but user might want to disconnect) */}
            {!isLiveMode && (
                <div className="p-4 bg-white border-t border-gray-100">
                   <div className="flex gap-2">
                     <button 
                       onClick={toggleMic}
                       className={`p-3 rounded-full flex-shrink-0 transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                       title="語音輸入"
                     >
                       🎤
                     </button>
                     <input 
                       type="text" 
                       value={currentMessage}
                       onChange={e => setCurrentMessage(e.target.value)}
                       onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                       placeholder="輸入回答..."
                       className="flex-grow border rounded-full px-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                     />
                     <button 
                       onClick={handleSendMessage}
                       disabled={!currentMessage.trim() || isAiThinking}
                       className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       ➤
                     </button>
                   </div>
                </div>
            )}
            
            {isLiveMode && (
                 <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-center">
                      <button 
                        onClick={handleEndInterview}
                        className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 shadow-lg flex items-center gap-2"
                      >
                         <span>❌</span> 掛斷電話
                      </button>
                 </div>
            )}
         </div>
       )}

       {interviewStage === 'feedback' && (
         <div className="bg-white rounded-xl shadow-xl p-8 space-y-6">
             <div className="text-center">
               <div className="text-5xl mb-2">📊</div>
               <h2 className="text-2xl font-bold text-gray-800">面試表現分析報告</h2>
             </div>
             
             {interviewFeedback ? (
               <div className="prose prose-purple max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200">
                 <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                    {interviewFeedback}
                 </div>
               </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-12">
                   <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                   <p className="text-gray-500">AI 正在分析您的回答邏輯與自信度...</p>
                </div>
             )}
             
             <div className="flex gap-4">
               <button 
                 onClick={() => { setInterviewStage('setup'); setChatMessages([]); setIsLiveMode(false); }}
                 className="flex-1 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
               >
                 🔄 重新開始
               </button>
               <button 
                 onClick={() => setActiveTab('resume')}
                 className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
               >
                 📝 回到履歷修改
               </button>
             </div>
         </div>
       )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* App Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                <div>
                  <h1 className="text-lg font-bold tracking-wide">CareerBoost AI</h1>
                  <p className="text-xs text-gray-400">履歷面試全攻略</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
               {/* Hidden on mobile, shown on desktop */}
               <div className="hidden md:flex gap-4 text-sm text-gray-300">
                  <span>1. 製作履歷</span>
                  <span>→</span>
                  <span>2. 模擬面試</span>
                  <span>→</span>
                  <span>3. 獲得 Offer</span>
               </div>
               <button onClick={handleLoadDemoData} id="demo-btn" className="md:hidden text-xs bg-white/10 px-2 py-1 rounded">Demo</button>
            </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-5xl mx-auto px-4 py-6 print:p-0 print:max-w-none print:w-full">
        {/* iOS Switcher */}
        <div className="print:hidden">
           <SegmentedControl activeTab={activeTab} onChange={setActiveTab} />
        </div>
        
        {/* Fix: Call these as functions, not as components, to avoid remounting */}
        {activeTab === 'resume' ? renderResumeBuilderView() : renderInterviewView()}
      </main>

      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm mt-auto print:hidden">
        <p>© 2024 CareerBoost AI. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);