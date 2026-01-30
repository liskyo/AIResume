import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Steps } from './components/Steps';
import { ResumePreview } from './components/ResumePreview';
import { generateResume } from './services/geminiService';
import { UserInputData, RawExperience, RawProject, GeneratedResume } from './types';

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

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initialize state from localStorage if available
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
            ? parsed.projects.map((p: any) => ({ ...p, attachments: [] })) // Reset attachments on reload
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

  // Save to localStorage whenever formData changes
  useEffect(() => {
    try {
      const dataToSave = {
        ...formData,
        uploadedResumeFile: null,
        projects: formData.projects.map(p => ({
          ...p,
          attachments: [] 
        }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  }, [formData]);

  // Handlers
  const handleClearData = () => {
    // Sandbox friendly: Direct action without confirm dialog
    localStorage.removeItem(STORAGE_KEY);
    setFormData(INITIAL_DATA);
    setGeneratedResume(null);
    setCurrentStep(0);
  };

  const handleLoadDemoData = () => {
     // Sandbox friendly: Direct action without confirm dialog
     // Defined inline to ensure deep new references and avoid stale state
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
     setCurrentStep(0); // Jump to first step to show data
     
     // Visual feedback
     const btn = document.getElementById('demo-btn');
     if(btn) {
         const originalText = btn.innerText;
         btn.innerText = "已載入！";
         btn.classList.add('bg-green-100', 'text-green-800');
         setTimeout(() => {
             btn.innerText = originalText;
             btn.classList.remove('bg-green-100', 'text-green-800');
         }, 1000);
     }
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
      let errorMessage = "發生錯誤，請稍後再試。";
      if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
        if (err.message.includes("400")) errorMessage += " (Request Rejected)";
        if (err.message.includes("401") || err.message.includes("403")) errorMessage += " (API Key Invalid)";
      }
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
      const element = document.getElementById('resume-preview');
      if (!element) return;
      
      // Visual feedback
      const btn = document.getElementById('download-btn');
      let originalText = '';
      if (btn) {
        originalText = btn.innerText;
        btn.innerText = "⏳ 產生中...";
        // @ts-ignore
        btn.disabled = true;
      }

      // Temporarily remove shadow for cleaner PDF
      const hasShadow = element.classList.contains('shadow-2xl');
      if (hasShadow) element.classList.remove('shadow-2xl');

      const opt = {
          margin: 0,
          filename: `${formData.name || 'Resume'}_CV.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // @ts-ignore
      if (window.html2pdf) {
          // @ts-ignore
          window.html2pdf().from(element).set(opt).save()
          .then(() => {
              if (hasShadow) element.classList.add('shadow-2xl');
              if (btn) {
                  btn.innerText = originalText;
                  // @ts-ignore
                  btn.disabled = false;
              }
          })
          .catch((err: any) => {
              console.error("PDF generation failed:", err);
              if (hasShadow) element.classList.add('shadow-2xl');
              if (btn) {
                  btn.innerText = "❌ 失敗";
                  setTimeout(() => {
                      btn.innerText = originalText;
                      // @ts-ignore
                      btn.disabled = false;
                  }, 2000);
              }
          });
      } else {
          console.error("html2pdf library not loaded");
          if (hasShadow) element.classList.add('shadow-2xl');
          if (btn) {
              btn.innerText = "❌ 套件載入失敗";
              // @ts-ignore
              btn.disabled = false;
          }
      }
  };

  // Render Functions
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
            <label className="block text-sm font-medium text-gray-700">既有履歷文字檔 (選填，AI 將參考內容)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                            <span>上傳文字檔 (.txt, .md)</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".txt,.md" onChange={(e) => handleInputChange('uploadedResumeFile', e.target.files?.[0] || null)} />
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
      <div className="space-y-6">
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
      <div className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <p className="text-yellow-800 text-sm">
                  <b>💡 AI 提示：</b> 請上傳專案相關檔案。
                  <ul className="list-disc ml-5 mt-1">
                      <li><b>圖片 (.jpg, .png)</b>：AI 會分析畫面，並將圖片展示在履歷中。</li>
                      <li><b>文字檔 (.txt, .md)</b>：AI 會讀取內容作為專案描述參考，但不會直接顯示在履歷上。</li>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">上傳相關檔案 (圖片展示 / 文字檔分析)</label>
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-purple-50 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-100 text-sm font-medium transition-colors">
                            選擇檔案
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*,.txt,.md"
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <h1 className="text-xl font-bold tracking-wide">AI 自信履歷表大師</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <div className="text-sm opacity-80 hidden md:block">符合 104 人力銀行格式標準</div>
                <button 
                  id="demo-btn"
                  onClick={handleLoadDemoData}
                  className="text-xs bg-white text-blue-800 hover:bg-blue-50 px-3 py-1 rounded transition-colors font-medium border border-blue-200"
                >
                  帶入範例
                </button>
                <button 
                  onClick={handleClearData} 
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  title="清除暫存資料"
                >
                  清除暫存
                </button>
            </div>
        </div>
      </header>

      {/* Main Content - Outer wrapper that gets hidden during print except for the ID below */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none print:w-full">
        <div className="print:hidden">
            <Steps currentStep={currentStep} steps={STEPS} setStep={isGenerating ? () => {} : setCurrentStep} />
        </div>

        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow-sm print:hidden">
                <p className="text-red-700 font-bold mb-1">發生錯誤 (Error Occurred)</p>
                <p className="text-red-600 text-sm font-mono break-all">{error}</p>
                <p className="text-red-500 text-xs mt-2">請確認您的 API Key 是否正確，或嘗試減少上傳的圖片數量。</p>
            </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 min-h-[500px] print:shadow-none print:p-0 print:min-h-0">
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-gray-800">AI 正在施展魔法...</h3>
                        <p className="text-gray-500">正在分析您的經歷、優化文字、並閱讀您的專案圖片。</p>
                        <p className="text-sm text-blue-500 animate-pulse">這可能需要 30-60 秒，請稍候。</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Render content based on step */}
                    <div className="print:hidden">
                        {currentStep === 0 && renderStep1()}
                        {currentStep === 1 && renderStep2()}
                        {currentStep === 2 && renderStep3()}
                    </div>

                    {currentStep === 3 && generatedResume && (
                        <div className="animate-fade-in">
                            <div className="flex justify-end mb-4 gap-3 print:hidden">
                                <button 
                                    id="download-btn"
                                    type="button"
                                    onClick={handleDownloadPDF}
                                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center gap-2"
                                >
                                    📥 下載 PDF (Download)
                                </button>
                                <button 
                                    onClick={() => setCurrentStep(0)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                >
                                    重新編輯
                                </button>
                            </div>
                            
                            {/* This ID is targeted by @media print */}
                            {/* ADDED WRAPPER: overflow-x-auto to allow horizontal scroll on mobile for A4 width */}
                            <div className="overflow-x-auto pb-4">
                                <div id="printable-content" className="min-w-[210mm]">
                                    <ResumePreview data={generatedResume} userData={formData} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {currentStep < 3 && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between print:hidden">
                            <button 
                                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                                disabled={currentStep === 0}
                                className={`px-6 py-2 rounded-md font-medium transition-colors ${currentStep === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                上一步
                            </button>
                            
                            {currentStep < 2 ? (
                                <button 
                                    onClick={() => setCurrentStep(prev => Math.min(2, prev + 1))}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-md transition-all hover:shadow-lg"
                                >
                                    下一步
                                </button>
                            ) : (
                                <button 
                                    onClick={handleGenerate}
                                    className="px-8 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-md hover:from-green-700 hover:to-green-600 font-bold shadow-md transition-all hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    ✨ AI 生成履歷
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm mt-auto print:hidden">
        <p>© 2024 AI Confidence Resume Master. Powered by Google Gemini.</p>
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