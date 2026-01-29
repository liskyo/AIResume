import React from 'react';

interface StepsProps {
  currentStep: number;
  steps: string[];
  setStep: (step: number) => void;
}

export const Steps: React.FC<StepsProps> = ({ currentStep, steps, setStep }) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
                <div key={index} className="flex flex-col items-center cursor-pointer" onClick={() => index <= currentStep && setStep(index)}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 border-4 ${
                        isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                        isCurrent ? 'bg-blue-600 border-blue-200 text-white' : 'bg-white border-gray-300 text-gray-500'
                    }`}>
                        {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                        {step}
                    </span>
                </div>
            );
        })}
      </div>
    </div>
  );
};
