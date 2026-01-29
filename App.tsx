import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<UserInputData>(INITIAL_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handlers
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
      projects: [...prev.projects, { id: Date.now().toString(), title: '', url: '', description: '', images: [] }]
    }));
  };

  const updateProject = (id: string, field: keyof RawProject, value: any) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleProjectImageUpload = (id: string, files: FileList | null) => {
      if (!files) return;
      const fileArray = Array.from(files);
      setFormData(prev => ({
          ...prev,
          projects: prev.projects.map(p => p.id === id ? { ...p, images: [...p.images, ...fileArray] } : p)
      }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateResume(formData);
      setGeneratedResume(result);
      setCurrentStep(3);
    } catch (err) {
      setError("發生錯誤，請檢查您的 API Key 或稍後再試。");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render Functions
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
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
                  <b>💡 AI 提示：</b> 上傳專案截圖或技術架構圖，Gemini 將會自動分析圖片內容，生成更具體的技術描述。
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">上傳圖片/技術文件 (供 AI 分析)</label>
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={(e) => handleProjectImageUpload(proj.id, e.target.files)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {proj.images.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto">
                            {proj.images.map((img, i) => (
                                <div key={i} className="relative flex-shrink-0">
                                    <img src={URL.createObjectURL(img)} alt="preview" className="h-16 w-16 object-cover rounded border" />
                                </div>
                            ))}
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
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <h1 className="text-xl font-bold tracking-wide">AI 自信履歷表大師</h1>
            </div>
            <div className="text-sm opacity-80 hidden md:block">符合 104 人力銀行格式標準</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8">
        <Steps currentStep={currentStep} steps={STEPS} setStep={isGenerating ? () => {} : setCurrentStep} />

        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-700 font-bold">Error</p>
                <p className="text-red-600">{error}</p>
            </div>
        )}

        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 min-h-[500px]">
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
                    {currentStep === 0 && renderStep1()}
                    {currentStep === 1 && renderStep2()}
                    {currentStep === 2 && renderStep3()}
                    {currentStep === 3 && generatedResume && (
                        <div className="animate-fade-in">
                            <div className="flex justify-end mb-4 gap-3 no-print">
                                <button 
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center gap-2"
                                >
                                    🖨️ 列印 / 存為 PDF
                                </button>
                                <button 
                                    onClick={() => setCurrentStep(0)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                >
                                    重新編輯
                                </button>
                            </div>
                            <ResumePreview data={generatedResume} userData={formData} />
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {currentStep < 3 && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between">
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

      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm mt-auto">
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
