import React from 'react';
import { GeneratedResume, UserInputData } from '../types';

interface ResumePreviewProps {
  data: GeneratedResume;
  userData: UserInputData;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ data, userData }) => {
  return (
    <div className="bg-white shadow-2xl w-full max-w-[210mm] mx-auto p-12 min-h-[297mm] text-gray-800 print:shadow-none print:w-full print:max-w-none print:p-0" id="resume-preview">
      {/* Header */}
      <div className="border-b-4 border-blue-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">{userData.name}</h1>
            <h2 className="text-xl text-blue-700 font-semibold">{data.professionalTitle}</h2>
          </div>
          <div className="text-right text-sm text-gray-600 space-y-1">
             <div className="flex items-center justify-end gap-2">
               <span>📧</span> <span>{userData.email}</span>
             </div>
             <div className="flex items-center justify-end gap-2">
               <span>📱</span> <span>{userData.phone}</span>
             </div>
             {userData.projects.some(p => p.url) && (
               <div className="flex items-center justify-end gap-2 text-blue-600 font-medium">
                 <span>🔗</span> <span>包含線上作品集 (Portfolio)</span>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <section className="mb-8 bg-gray-50 p-4 rounded-r-lg border-l-4 border-gray-400 print:bg-gray-50 print:border-gray-400">
        <h3 className="text-md font-bold text-gray-700 uppercase tracking-wider mb-2">
          專業摘要 (Summary)
        </h3>
        <p className="text-gray-700 leading-relaxed text-justify">
          {data.professionalSummary}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (Main Content) */}
        <div className="md:col-span-2 space-y-8">
            {/* Experience */}
            <section>
                <h3 className="text-xl font-bold text-blue-800 border-b-2 border-blue-100 pb-2 mb-4 flex items-center gap-2">
                  <span>💼</span> 工作經歷 (Experience)
                </h3>
                <div className="space-y-6">
                {data.experiences.map((exp, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-gray-200 ml-1">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-blue-600 rounded-full print:bg-blue-600"></div>
                    <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-lg font-bold text-gray-900">{exp.title}</h4>
                        <span className="text-sm text-gray-500 font-mono whitespace-nowrap">{exp.period}</span>
                    </div>
                    <div className="text-blue-700 font-medium mb-2">{exp.company}</div>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-gray-700 text-sm">
                        {exp.highlights.map((point, pIdx) => (
                        <li key={pIdx} className="leading-relaxed pl-1">{point}</li>
                        ))}
                    </ul>
                    </div>
                ))}
                </div>
            </section>

            {/* Projects */}
            <section>
                <h3 className="text-xl font-bold text-blue-800 border-b-2 border-blue-100 pb-2 mb-4 flex items-center gap-2">
                  <span>🚀</span> 專案成就 (Projects)
                </h3>
                <div className="space-y-8">
                {data.projects.map((proj, idx) => {
                    // Try to match the Gemini project back to User Input to get the images
                    // Match by Title (most reliable if prompt instructed Gemini to keep it) or Index
                    const originalProject = userData.projects.find(p => p.title === proj.title) || userData.projects[idx];
                    const displayImages = originalProject?.attachments?.filter(f => f.type.startsWith('image/')) || [];

                    return (
                    <div key={idx} className="bg-white rounded-lg group break-inside-avoid">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900">{proj.title}</h4>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full print:bg-blue-100 print:text-blue-800">{proj.role}</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed whitespace-pre-line">{proj.description}</p>
                        
                        {/* Tech Stack */}
                        <div className="flex flex-wrap gap-1 mb-3">
                            {proj.techStack.map((tech, tIdx) => (
                                <span key={tIdx} className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded print:border-gray-300">
                                    {tech}
                                </span>
                            ))}
                        </div>

                        {/* Beautiful Link Block */}
                        {proj.url && (
                             <a 
                                href={proj.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="block mb-4 group no-underline print:no-underline"
                             >
                                <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white text-blue-600 shadow-sm border border-blue-50">
                                         🔗
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="text-xs font-bold text-blue-800 mb-0.5 flex items-center gap-1">
                                            前往作品連結 (Visit Project)
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">↗</span>
                                        </div>
                                        <div className="text-xs text-gray-500 truncate group-hover:text-blue-600 transition-colors font-mono">{proj.url}</div>
                                    </div>
                                </div>
                             </a>
                        )}

                        {/* Inline Images - Placed directly in the project card to be "together" with content */}
                        {displayImages.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 gap-3 print:block print:space-y-3">
                                {displayImages.map((img, i) => (
                                    <div key={i} className="border border-gray-200 rounded overflow-hidden shadow-sm bg-gray-50 print:break-inside-avoid">
                                        <img 
                                            src={URL.createObjectURL(img)} 
                                            alt={`${proj.title} screenshot ${i+1}`}
                                            className="w-full h-auto object-contain max-h-[250px] mx-auto"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
                })}
                </div>
            </section>
        </div>

        {/* Right Column (Side Info) */}
        <div className="space-y-8">
            {/* Education */}
            <section>
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-2 mb-4 flex items-center gap-2">
                  <span>🎓</span> 學歷 (Education)
                </h3>
                <ul className="space-y-3">
                    {data.education.map((edu, idx) => (
                        <li key={idx} className="text-gray-700 text-sm pb-2 border-b border-gray-100 last:border-0">
                            {edu}
                        </li>
                    ))}
                </ul>
            </section>

             {/* Skills */}
            <section>
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-2 mb-4 flex items-center gap-2">
                <span>⚡</span> 技能 (Skills)
                </h3>
                <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded text-sm font-medium w-full md:w-auto text-center md:text-left print:bg-blue-50 print:text-blue-800">
                    {skill}
                    </span>
                ))}
                </div>
            </section>
        </div>
      </div>

      <div className="my-8 border-t border-gray-200"></div>

      {/* Autobiography (104 Style) */}
      <section className="break-inside-avoid">
        <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
          自傳 (Autobiography)
        </h3>
        <div className="bg-gray-50 p-6 rounded-lg text-gray-700 text-sm leading-relaxed whitespace-pre-wrap text-justify shadow-inner print:bg-gray-50 print:shadow-none">
            {data.autobiography}
        </div>
      </section>

      {/* AI Tips - Hidden in Print */}
      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg print:hidden">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
                <h4 className="font-bold text-yellow-800 mb-1">AI 面試官建議</h4>
                <p className="text-yellow-800 text-sm">{data.interviewTips}</p>
            </div>
          </div>
      </div>
    </div>
  );
};