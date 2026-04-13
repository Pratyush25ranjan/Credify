import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Sparkles, Paperclip, X, FileText, Image, Video, Mic } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerificationForm({ onSubmit, isLoading }) {
  const [claim, setClaim] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = '';
  };

  const removeFile = () => setAttachedFile(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (claim.trim() || attachedFile) onSubmit(claim.trim(), attachedFile);
  };

  const getFileIcon = (file) => {
    if (!file) return null;
    if (file.type.startsWith('image/')) return <Image className="w-3.5 h-3.5 flex-shrink-0" />;
    if (file.type.startsWith('video/')) return <Video className="w-3.5 h-3.5 flex-shrink-0" />;
    if (file.type.startsWith('audio/')) return <Mic className="w-3.5 h-3.5 flex-shrink-0" />;
    return <FileText className="w-3.5 h-3.5 flex-shrink-0" />;
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
      setAttachedFile(file);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const examples = [
    "NASA discovers new planet similar to Earth",
    "Global coffee prices expected to double by 2025",
    "New study links social media to improved mental health",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
        >
          <Sparkles className="w-4 h-4" />
          AI-Powered Verification
        </motion.div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
          Verify Any News Claim
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Enter a news headline, attach an image, video, audio, or document — our AI will cross-reference it with trusted global sources.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative">
          <Textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Enter a news claim, or attach an image / video / audio to verify..."
            className="min-h-[120px] text-base p-5 pr-5 pb-16 rounded-2xl border-2 border-border/60 focus:border-primary/50 bg-card shadow-lg shadow-black/5 resize-none"
          />

          {/* Attached file preview */}
          {attachedFile && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium max-w-[200px]">
              {getFileIcon(attachedFile)}
              <span className="truncate">{attachedFile.name}</span>
              <button type="button" onClick={removeFile} className="flex-shrink-0 hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            {/* Attach buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary"
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">Attach</span>
              </button>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-secondary'}`}
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Record Audio'}</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="submit"
              disabled={(!claim.trim() && !attachedFile) || isLoading}
              className="rounded-xl px-6 h-10 font-semibold shadow-md shadow-primary/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setClaim(ex)}
                className="text-sm px-3.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </form>
    </motion.div>
  );
}