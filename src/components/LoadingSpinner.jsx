
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className={`${sizeClasses[size]} text-amber-600 animate-spin`} />
      <p className="text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center items-center py-10">{spinner}</div>;
}
