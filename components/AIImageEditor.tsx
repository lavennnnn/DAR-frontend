import React, { useState, useRef } from 'react';
import { Wand2, Upload, RefreshCw, Download, Image as ImageIcon } from 'lucide-react';
import { editImageWithGemini } from '../services/geminiService';

interface AIImageEditorProps {
  t: any;
}

const AIImageEditor: React.FC<AIImageEditorProps> = ({ t }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setMimeType(file.type);
        setGeneratedImage(null); // Reset generated image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;

    setLoading(true);
    setError(null);

    try {
      const base64Data = selectedImage.split(',')[1];
      const result = await editImageWithGemini(base64Data, mimeType, prompt);
      setGeneratedImage(result);
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
          <h2 className="text-xl font-bold theme-text-main mb-4 flex items-center">
            <Wand2 className="mr-2 text-purple-400" />
            {t.aiLab.title}
          </h2>
          <p className="theme-text-muted text-sm mb-6">
            {t.aiLab.desc}
          </p>

          <div className="space-y-4">
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed theme-border rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-700/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <Upload className="mx-auto h-10 w-10 theme-text-muted mb-2" />
              <p className="text-sm theme-text-muted font-medium">{t.aiLab.upload}</p>
              <p className="text-xs text-slate-500">{t.aiLab.supported}</p>
            </div>

            {/* Prompt Area */}
            <div>
              <label className="block text-sm font-medium theme-text-muted mb-2">
                {t.aiLab.instructionLabel}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.aiLab.placeholder}
                className="w-full h-32 theme-bg-main theme-border border rounded-md p-3 theme-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-slate-600"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedImage || !prompt || loading}
              className={`w-full py-3 px-4 rounded-md font-semibold text-white flex items-center justify-center transition-all ${
                !selectedImage || !prompt || loading
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-900/20'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin mr-2 h-5 w-5" />
                  {t.aiLab.processing}
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  {t.aiLab.generate}
                </>
              )}
            </button>
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-2 theme-bg-panel p-6 rounded-lg border theme-border shadow-xl flex flex-col">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold theme-text-muted mb-2 uppercase tracking-wider">{t.aiLab.original}</h3>
            <div className="flex-1 theme-bg-main rounded-lg border theme-border overflow-hidden flex items-center justify-center relative min-h-[300px]">
              {selectedImage ? (
                <img src={selectedImage} alt="Original" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="theme-text-muted flex flex-col items-center">
                  <ImageIcon size={48} className="mb-2 opacity-50" />
                  <span>{t.aiLab.noImage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold theme-text-muted mb-2 uppercase tracking-wider">{t.aiLab.result}</h3>
            <div className="flex-1 theme-bg-main rounded-lg border theme-border overflow-hidden flex items-center justify-center relative min-h-[300px]">
              {generatedImage ? (
                <img src={generatedImage} alt="AI Generated" className="max-w-full max-h-full object-contain" />
              ) : loading ? (
                <div className="text-slate-500 flex flex-col items-center animate-pulse">
                  <Wand2 size={48} className="mb-2 opacity-50" />
                  <span>{t.aiLab.generating}</span>
                </div>
              ) : (
                <div className="theme-text-muted flex flex-col items-center">
                  <Wand2 size={48} className="mb-2 opacity-50" />
                  <span>{t.aiLab.waiting}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {generatedImage && (
          <div className="mt-4 flex justify-end">
            <a 
              href={generatedImage} 
              download="ai-edited-resource-map.png"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center text-sm font-medium transition-colors"
            >
              <Download size={16} className="mr-2" />
              {t.aiLab.download}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIImageEditor;
