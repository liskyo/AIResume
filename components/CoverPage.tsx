import React from 'react';
import { motion } from 'framer-motion';

interface CoverPageProps {
  onStart: () => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="max-w-4xl w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 relative z-10 flex flex-col md:flex-row">
        
        {/* Left Side: Content */}
        <div className="flex-1 p-10 md:p-16 flex flex-col justify-center items-start space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              ✨ AI 驅動的職涯助手
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
              CareerBoost <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI</span>
            </h1>
            <p className="text-xl text-gray-600 font-medium">
              履歷面試全攻略
            </p>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-gray-500 leading-relaxed max-w-md"
          >
            結合最先進的 Gemini AI 技術，為您打造專業履歷，並提供真實感的模擬面試體驗。讓您的求職之路更加順暢自信。
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 w-full"
          >
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              開始使用
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </motion.div>

          <div className="pt-8 flex items-center gap-6 text-gray-400 text-sm font-medium">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              智能履歷生成
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              語音模擬面試
            </div>
          </div>
        </div>

        {/* Right Side: Visual/Image */}
        <div className="hidden md:block w-1/3 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/20 text-9xl font-bold rotate-90 select-none">AI</div>
            </div>
            
            {/* Floating Cards Visual */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute top-1/4 -left-12 bg-white p-4 rounded-xl shadow-xl w-48 rotate-12 z-20"
            >
                <div className="h-2 w-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 w-24 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                    <div className="h-1.5 w-full bg-gray-100 rounded"></div>
                    <div className="h-1.5 w-full bg-gray-100 rounded"></div>
                    <div className="h-1.5 w-3/4 bg-gray-100 rounded"></div>
                </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-1/4 -right-8 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 w-48 -rotate-6 z-10"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-400/50"></div>
                    <div className="h-2 w-20 bg-white/30 rounded"></div>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded mb-2"></div>
                <div className="h-1.5 w-2/3 bg-white/20 rounded"></div>
            </motion.div>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-gray-400 text-xs text-center w-full">
        Powered by Google Gemini
      </div>
    </div>
  );
};
