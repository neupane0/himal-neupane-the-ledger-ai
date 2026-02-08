import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../components/UI';
import {
  Mic, Camera, FileText, Check, Sparkles,
  Calendar, Tag, DollarSign, Upload as UploadIcon,
  ScanLine, Loader2,
} from 'lucide-react';
import { categorizeTransaction, parseVoiceLog } from '../services/aiService';
import { Transaction } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants/categories';
import { receipts, transactions } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'manual' | 'receipt' | 'voice';

interface FieldError {
  amount?: string;
  title?: string;
  date?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { key: TabKey; label: string; icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { key: 'manual', label: 'Manual', icon: FileText },
  { key: 'receipt', label: 'Receipt', icon: Camera },
  { key: 'voice', label: 'Voice', icon: Mic },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AddExpense: React.FC = () => {
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('manual');

  // Form state
  const [form, setForm] = useState<Partial<Transaction>>({
    title: '',
    amount: '' as any, // keep as string for display, parse on submit
    date: new Date().toISOString().split('T')[0],
    category: 'Uncategorized',
    source: 'Manual',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // AI debug (receipt / voice)
  const [receiptAiDebug, setReceiptAiDebug] = useState<{
    ollamaUsed: boolean;
    dateConfidence?: number | null;
    dateReason?: string | null;
  } | null>(null);
  const [voiceAiDebug, setVoiceAiDebug] = useState<{
    ollamaUsed: boolean;
    dateConfidence?: number | null;
    dateReason?: string | null;
  } | null>(null);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState<'en-US' | 'ne-NP'>('en-US');
  const recognitionRef = useRef<any>(null);

  // Receipt
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI suggestion flash
  const [aiSuggested, setAiSuggested] = useState(false);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /** AI auto-categorize on title blur */
  const handleTitleBlur = async () => {
    if (form.title && (!form.category || form.category === 'Uncategorized')) {
      const cat = await categorizeTransaction(form.title);
      setForm((prev) => ({ ...prev, category: cat }));
      setAiSuggested(true);
      setTimeout(() => setAiSuggested(false), 2500);
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FieldError = {};
    const amt = parseFloat(String(form.amount));
    if (!amt || amt <= 0) e.amount = 'Enter a valid amount';
    if (!form.title?.trim()) e.title = 'Description is required';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Voice ──────────────────────────────────────────────────────────────

  const handleVoiceRecord = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = voiceLanguage;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interimTranscript += result[0].transcript;
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        setIsLoading(true);
        try {
          const parsed = await parseVoiceLog(finalTranscript);
          if (parsed) {
            if (typeof parsed.ollama_used === 'boolean' || typeof parsed.ollama_date_reason === 'string') {
              setVoiceAiDebug({
                ollamaUsed: Boolean(parsed.ollama_used),
                dateConfidence: typeof parsed.ollama_date_confidence === 'number' ? parsed.ollama_date_confidence : null,
                dateReason: typeof parsed.ollama_date_reason === 'string' ? parsed.ollama_date_reason : null,
              });
            } else {
              setVoiceAiDebug(null);
            }

            setForm((prev) => ({
              ...prev,
              title: parsed.description || finalTranscript,
              amount: parsed.amount || 0,
              date: parsed.date || new Date().toISOString().split('T')[0],
              category: parsed.category || 'Other',
              source: 'Voice',
            }));
          }
        } catch {
          alert('Failed to process voice input.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── Receipt ────────────────────────────────────────────────────────────

  const processReceiptFile = async (file: File) => {
    setReceiptFile(file);

    const reader = new FileReader();
    reader.onloadend = async () => {
      setReceiptImage(reader.result as string);
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await receipts.upload(formData);
        const data = response.data;

        if (data) {
          if (typeof data.ollama_used === 'boolean' || typeof data.ollama_date_reason === 'string') {
            setReceiptAiDebug({
              ollamaUsed: Boolean(data.ollama_used),
              dateConfidence: typeof data.ollama_date_confidence === 'number' ? data.ollama_date_confidence : null,
              dateReason: typeof data.ollama_date_reason === 'string' ? data.ollama_date_reason : null,
            });
          } else {
            setReceiptAiDebug(null);
          }

          setForm({
            title: data.title || 'Unknown Merchant',
            amount: data.amount || 0,
            date: data.date || new Date().toISOString().split('T')[0],
            category: data.category || 'Other',
            source: 'Receipt',
          });

          if (data.date_detected === false) {
            setTimeout(() => alert('⚠️ Date could not be extracted from receipt. Please verify the date field.'), 500);
          }
        }
      } catch {
        alert('Failed to parse receipt. Please try again or enter details manually.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processReceiptFile(file);
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processReceiptFile(file);
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      let data: any = form;

      if (receiptFile) {
        const formData = new FormData();
        formData.append('title', form.title || '');
        formData.append('amount', String(form.amount));
        formData.append('date', String(form.date));
        formData.append('category', form.category || '');
        formData.append('source', form.source || 'Manual');
        formData.append('receipt_image', receiptFile);
        data = formData;
      }

      await transactions.create(data);
      setShowSuccess(true);
      setTimeout(() => navigate(AppRoute.TRANSACTIONS), 900);
    } catch {
      alert('Failed to save transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Category options ───────────────────────────────────────────────────
  const categoryOptions = useMemo(() => ['Uncategorized', ...TRANSACTION_CATEGORIES], []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="text-center page-enter stagger-1">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Add Expense</h1>
        <p className="text-sm text-zinc-400 mt-1">Choose a method to log your spending.</p>
      </div>

      {/* ── Segmented Control ─────────────────────────────────────────── */}
      <div className="relative flex p-1 rounded-2xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/60 page-enter stagger-2">
        {/* Sliding background indicator */}
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm shadow-zinc-900/10 ring-1 ring-inset ring-zinc-100/50 transition-all duration-300 ease-out"
          style={{
            width: `calc(${100 / TABS.length}% - 4px)`,
            left: `calc(${TABS.findIndex((t) => t.key === activeTab) * (100 / TABS.length)}% + 2px)`,
          }}
        />
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-colors duration-200 ${
              activeTab === tab.key ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <tab.icon size={15} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main Card ─────────────────────────────────────────────────── */}
      <Card className="page-enter stagger-3 !p-0 overflow-hidden">
        <form onSubmit={handleSubmit}>

          {/* ════════════ RECEIPT VIEW ════════════ */}
          {activeTab === 'receipt' && (
            <div className="p-6 pb-2">
              {!receiptImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    isDragging
                      ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]'
                      : 'border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3 py-14">
                    {/* Scanning animation container */}
                    <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isDragging ? 'bg-indigo-100 ring-1 ring-indigo-200' : 'bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/50'
                    }`}>
                      {isLoading ? (
                        <Loader2 size={24} strokeWidth={1.5} className="text-indigo-500 animate-spin" />
                      ) : (
                        <>
                          <ScanLine size={24} strokeWidth={1.5} className={isDragging ? 'text-indigo-500' : 'text-zinc-400'} />
                          {/* Scan line animation */}
                          <div className="absolute inset-x-2 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent animate-scan-line" />
                        </>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-700">
                        {isDragging ? 'Drop your receipt here' : 'Upload a receipt'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Drag & drop or click to browse — JPG, PNG
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Receipt preview with overlay */
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-zinc-200/60">
                  <img src={receiptImage} alt="Receipt" className="w-full h-auto max-h-64 object-contain bg-zinc-50" />
                  <button
                    type="button"
                    onClick={() => { setReceiptImage(null); setReceiptFile(null); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 backdrop-blur-md text-zinc-500 hover:text-zinc-800 ring-1 ring-inset ring-zinc-200/60 shadow-sm transition-colors"
                  >
                    <UploadIcon size={14} strokeWidth={1.5} />
                  </button>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 ring-1 ring-zinc-200/60 shadow-lg">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                        <span className="text-sm font-medium text-zinc-600">Scanning receipt…</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════════ VOICE VIEW ════════════ */}
          {activeTab === 'voice' && (
            <div className="flex flex-col items-center justify-center px-6 pt-10 pb-6 gap-5">
              {/* Language Toggle */}
              <div className="flex items-center gap-2">
                {[
                  { code: 'en-US' as const, label: '🇺🇸 English' },
                  { code: 'ne-NP' as const, label: '🇳🇵 नेपाली' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setVoiceLanguage(lang.code)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      voiceLanguage === lang.code
                        ? 'bg-zinc-900 text-white shadow-sm shadow-zinc-900/20'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/80'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Mic Button with pulsing rings */}
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <div className="absolute w-32 h-32 rounded-full bg-red-400/10 animate-ping-slow" />
                    <div className="absolute w-24 h-24 rounded-full bg-red-400/20 animate-ping-slower" />
                  </>
                )}
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isRecording
                      ? 'bg-red-500 shadow-red-500/30 scale-110'
                      : 'bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-zinc-900/20 hover:scale-105 hover:shadow-xl'
                  }`}
                >
                  <Mic size={28} strokeWidth={1.5} className="text-white" />
                </button>
              </div>

              {/* Status text */}
              <p className="text-sm text-zinc-400">
                {isRecording ? (
                  <span className="flex items-center gap-2 text-red-500 font-medium">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    {voiceLanguage === 'ne-NP' ? 'सुन्दैछु...' : 'Listening…'}
                  </span>
                ) : voiceLanguage === 'ne-NP' ? (
                  'बोल्न माइक्रोफोन थिच्नुहोस्'
                ) : (
                  'Tap microphone to speak'
                )}
              </p>

              {/* Live transcript */}
              {transcript && (
                <div className="w-full max-w-sm px-4 py-3 rounded-xl bg-zinc-50/80 ring-1 ring-inset ring-zinc-200/50 text-center">
                  <p className="text-sm italic text-zinc-600">"{transcript}"</p>
                </div>
              )}

              {/* Example phrases */}
              <div className="text-center mt-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  {voiceLanguage === 'ne-NP' ? 'उदाहरण वाक्यहरू' : 'Try saying'}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
                  {(voiceLanguage === 'ne-NP'
                    ? ['आज खाजामा ५०० खर्च भयो', 'बिजुलीको बिल २००० तिरें', 'पेट्रोलमा १५०० खर्च']
                    : ['Spent $50 on groceries', 'Paid 200 for electricity bill', 'Coffee at Starbucks 5 dollars']
                  ).map((phrase) => (
                    <span
                      key={phrase}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100/60 text-zinc-400 ring-1 ring-inset ring-zinc-200/40"
                    >
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════ FORM FIELDS (always shown) ════════════ */}
          <div className="px-6 pt-4 pb-6 space-y-5">

            {/* HERO AMOUNT */}
            <div className="text-center py-2">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Amount
              </label>
              <div className="relative inline-flex items-baseline justify-center">
                <span className="text-3xl font-bold text-zinc-300 mr-1 select-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="amount"
                  value={form.amount || ''}
                  onChange={(e) => {
                    // Allow only numbers and one decimal
                    const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
                    setForm((prev) => ({ ...prev, amount: v as any }));
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  placeholder="0.00"
                  className={`text-4xl font-bold text-zinc-900 bg-transparent text-center outline-none tabular-nums w-48 placeholder:text-zinc-200 transition-all duration-200 ${
                    errors.amount ? '' : ''
                  }`}
                  style={{ caretColor: '#6366f1' }}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-400 font-medium mt-2 animate-shake">{errors.amount}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-100/80" />

            {/* Description */}
            <div>
              <label className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Description</span>
                {activeTab !== 'manual' && form.title && (
                  <Badge type="success">
                    <Sparkles size={10} strokeWidth={2} className="mr-1" /> AI filled
                  </Badge>
                )}
              </label>
              <div className="relative group">
                <FileText size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors" />
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  onBlur={handleTitleBlur}
                  placeholder="e.g. Starbucks Coffee"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-300 bg-zinc-50/40 border transition-all duration-200 outline-none ${
                    errors.title
                      ? 'border-red-300 ring-2 ring-red-100 focus:border-red-400'
                      : 'border-zinc-200/80 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white focus:shadow-[0_0_15px_rgba(0,0,0,0.04)]'
                  }`}
                />
              </div>
              {errors.title && <p className="text-xs text-red-400 font-medium mt-1.5 animate-shake">{errors.title}</p>}
            </div>

            {/* Date + Category row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Date</label>
                <div className="relative group">
                  <Calendar size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors pointer-events-none" />
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-zinc-800 bg-zinc-50/40 border transition-all duration-200 outline-none ${
                      errors.date
                        ? 'border-red-300 ring-2 ring-red-100'
                        : 'border-zinc-200/80 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white focus:shadow-[0_0_15px_rgba(0,0,0,0.04)]'
                    }`}
                  />
                </div>
                {/* AI debug info */}
                {receiptAiDebug?.dateReason && activeTab === 'receipt' && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    <Sparkles size={10} className="inline mr-1" />
                    {receiptAiDebug.dateReason}
                  </p>
                )}
                {voiceAiDebug?.dateReason && activeTab === 'voice' && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    <Sparkles size={10} className="inline mr-1" />
                    {voiceAiDebug.dateReason}
                  </p>
                )}
                {errors.date && <p className="text-xs text-red-400 font-medium mt-1.5">{errors.date}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Category</label>
                <div className="relative group">
                  <Tag size={15} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-500 transition-colors pointer-events-none" />
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-zinc-800 bg-zinc-50/40 border border-zinc-200/80 appearance-none cursor-pointer transition-all duration-200 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 focus:bg-white focus:shadow-[0_0_15px_rgba(0,0,0,0.04)] ${
                      aiSuggested ? 'ring-2 ring-emerald-200 border-emerald-300' : ''
                    }`}
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {/* AI suggestion badge */}
                {aiSuggested && form.category !== 'Uncategorized' && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-emerald-500 font-medium">
                    <Sparkles size={10} strokeWidth={2} />
                    AI suggested
                  </div>
                )}
              </div>
            </div>

            {/* ── Submit Button ────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isLoading || showSuccess}
              className={`relative w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400 ${
                showSuccess
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm shadow-zinc-900/10 hover:shadow-md hover:shadow-zinc-900/15 hover:-translate-y-px border border-zinc-800'
              } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {/* Shimmer sweep */}
              {!showSuccess && !isLoading && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {showSuccess ? (
                  <>
                    <Check size={16} strokeWidth={2} />
                    Saved!
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <DollarSign size={15} strokeWidth={1.5} />
                    Save Expense
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddExpense;
