import React from 'react';
import { GeneratedResume, UserInputData } from '../types';

interface ResumePreviewProps {
  data: GeneratedResume;
  userData: UserInputData;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ data, userData }) => {
  return (
    <div className="bg-white shadow-2xl w-full max-w-[210mm] mx-auto p-12 min-h-[297mm] text-gray-800" id="resume-preview">
      {/* Header */}
      <div className="border-b-2 border-blue-600 pb-6 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{userData.name}</h1>
            <h2 className="text-xl text-blue-600 font-medium">{data.professionalTitle}</h2>
          </div>
          <div className="text-right text-sm text-gray-600">
             <p>{userData.email}</p>
             <p>{userData.phone}</p>
             {userData.projects.some(p => p.url) && <p className="text-blue-500">Portfolio Available</p>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <section className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3 uppercase tracking-wider">
          專業摘要 (Professional Summary)
        </h3>
        <p className="text-gray-700 leading-relaxed text-justify">
          {data.professionalSummary}
        </p>
      </section>

      {/* Skills */}
      <section className="mb-8">
         <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3 uppercase tracking-wider">
          核心技能 (Key Skills)
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill, idx) => (
            <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3 uppercase tracking-wider">
          工作經歷 (Work Experience)
        </h3>
        <div className="space-y-6">
          {data.experiences.map((exp, idx) => (
            <div key={idx} className="relative pl-4 border-l border-gray-200 ml-2">
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="text-lg font-bold text-gray-900">{exp.title}</h4>
                <span className="text-sm text-gray-500 font-mono">{exp.period}</span>
              </div>
              <div className="text-blue-700 font-semibold mb-2">{exp.company}</div>
              <ul className="list-disc list-outside ml-4 space-y-1 text-gray-700 text-sm">
                {exp.highlights.map((point, pIdx) => (
                  <li key={pIdx} className="leading-relaxed">{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3 uppercase tracking-wider">
          專案成就 (Project Highlights)
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {data.projects.map((proj, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <h4 className="font-bold text-gray-900">{proj.title}</h4>
                   <p className="text-xs text-blue-600 font-medium">{proj.role}</p>
                </div>
                {proj.url && (
                    <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center">
                        View Project ↗
                    </a>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3">{proj.description}</p>
              <div className="flex flex-wrap gap-1">
                  {proj.techStack.map((tech, tIdx) => (
                      <span key={tIdx} className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                          {tech}
                      </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3 uppercase tracking-wider">
          學歷 (Education)
        </h3>
        <ul className="space-y-1">
            {data.education.map((edu, idx) => (
                <li key={idx} className="text-gray-700">{edu}</li>
            ))}
        </ul>
      </section>

      {/* Autobiography (104 Style) */}
      <section className="mb-8 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3 uppercase tracking-wider">
          自傳 (Autobiography)
        </h3>
        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap columns-1 md:columns-2 gap-8 text-justify">
            {data.autobiography}
        </div>
      </section>

      {/* AI Tips (Display only on screen, maybe hide in print) */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-lg print:hidden">
          <h4 className="font-bold text-yellow-800 mb-2">💡 AI 面試官建議 (Interview Tips)</h4>
          <p className="text-yellow-800 text-sm">{data.interviewTips}</p>
      </div>
    </div>
  );
};
