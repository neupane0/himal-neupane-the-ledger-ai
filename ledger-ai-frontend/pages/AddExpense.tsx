import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '../components/UI';
import { Mic, Upload, FileText, Check, X, Camera, Sparkles } from 'lucide-react';
import { categorizeTransaction, parseVoiceLog } from '../services/aiService';
import { Transaction } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants/categories';

import { receipts, transactions } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

const AddExpense: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manual' | 'receipt' | 'voice'>('manual');
    const [isLoading, setIsLoading] = useState(false);
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
    const [form, setForm] = useState<Partial<Transaction>>({
        title: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'Uncategorized',
        source: 'Manual'
    });

    // Voice State
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [voiceLanguage, setVoiceLanguage] = useState<'en-US' | 'ne-NP'>('en-US');
    const recognitionRef = useRef<any>(null);

    // Receipt State
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // AI Categorize helper
    const handleTitleBlur = async () => {
        if (form.title && (!form.category || form.category === 'Uncategorized')) {
            const cat = await categorizeTransaction(form.title);
            setForm(prev => ({ ...prev, category: cat }));
        }
    };

    const handleVoiceRecord = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        if (isRecording) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsRecording(false);
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;  // Show live transcription
        recognition.lang = voiceLanguage;

        recognition.onstart = () => {
            setIsRecording(true);
            setTranscript('');
        };

        recognition.onresult = async (event: any) => {
            // Get the latest transcript
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            
            // Show interim results while speaking
            setTranscript(finalTranscript || interimTranscript);
            
            // Only process when we have a final result
            if (finalTranscript) {
                setIsLoading(true);
                try {
                    const parsed = await parseVoiceLog(finalTranscript);
                    if (parsed) {
                        // Store optional AI debug info (only present when backend debug is enabled)
                        if (typeof parsed.ollama_used === 'boolean' || typeof parsed.ollama_date_reason === 'string') {
                            setVoiceAiDebug({
                                ollamaUsed: Boolean(parsed.ollama_used),
                                dateConfidence: (typeof parsed.ollama_date_confidence === 'number') ? parsed.ollama_date_confidence : null,
                                dateReason: (typeof parsed.ollama_date_reason === 'string') ? parsed.ollama_date_reason : null,
                            });
                        } else {
                            setVoiceAiDebug(null);
                        }

                        setForm(prev => ({
                            ...prev,
                            title: parsed.description || finalTranscript,
                            amount: parsed.amount || 0,
                            date: parsed.date || new Date().toISOString().split('T')[0],
                            category: parsed.category || 'Other',
                            source: 'Voice'
                        }));
                    }
                } catch (error) {
                    console.error("Error parsing voice log:", error);
                    alert("Failed to process voice input.");
                } finally {
                    setIsLoading(false);
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            alert("Error occurred in recognition: " + event.error);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setReceiptFile(file);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setReceiptImage(base64);
            setIsLoading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);

                // Use shared API client (baseURL + credentials)
                const response = await receipts.upload(formData);
                const data = response.data;

                if (data) {
                    // Store optional AI debug info (only present when backend debug is enabled)
                    if (typeof data.ollama_used === 'boolean' || typeof data.ollama_date_reason === 'string') {
                        setReceiptAiDebug({
                            ollamaUsed: Boolean(data.ollama_used),
                            dateConfidence: (typeof data.ollama_date_confidence === 'number') ? data.ollama_date_confidence : null,
                            dateReason: (typeof data.ollama_date_reason === 'string') ? data.ollama_date_reason : null,
                        });
                    } else {
                        setReceiptAiDebug(null);
                    }

                    // DEBUG: Log what we received from backend
                    console.log('🔍 Receipt data from backend:', data);
                    console.log('📅 Date value received:', data.date);
                    console.log('📅 Date type:', typeof data.date);
                    console.log('📅 Date length:', data.date?.length);
                    
                    // Show warning if date wasn't detected
                    if (data.date_detected === false) {
                        console.warn("Date not detected from receipt - using today's date");
                    }
                    
                    setForm({
                        title: data.title || 'Unknown Merchant',
                        amount: data.amount || 0,
                        date: data.date || new Date().toISOString().split('T')[0],
                        category: data.category || 'Other',
                        source: 'Receipt'
                    });
                    
                    // Alert user if date wasn't detected
                    if (data.date_detected === false) {
                        setTimeout(() => {
                            alert("⚠️ Date could not be extracted from receipt. Please verify the date field.");
                        }, 500);
                    }
                }
            } catch (error) {
                console.error("Receipt parsing failed", error);
                alert("Failed to parse receipt. Please try again or enter details manually.");
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

                // Add receipt image
                formData.append('receipt_image', receiptFile);

                data = formData;
            }

            // If strictly using JSON for non-file uploads, api.ts handles it.
            // If using FormData, axios needs to know to let browser set boundary.
            // our api.ts sets application/json by default, so we might need to override it for this call if it's formData.
            // But let's try calling it. If it fails, we modify api.ts.

            // To be safe, we can manually call api.post in api.ts or modify the create method.
            // Let's modify api.ts create method to accept config.
            await transactions.create(data);

            alert("Transaction saved!");
            navigate(AppRoute.TRANSACTIONS);
        } catch (error) {
            console.error("Failed to save transaction", error);
            alert("Failed to save transaction.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900">Add Expense</h1>
                <p className="text-zinc-500 mt-1">Choose a method to log your spending.</p>
            </div>

            <div className="flex p-1 bg-zinc-200 rounded-xl w-full">
                {['manual', 'receipt', 'voice'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Dynamic Input Sections based on Tab */}
                    {activeTab === 'receipt' && (
                        <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:bg-zinc-50 transition-colors relative">
                            <input type="file" accept="image/*" onChange={handleReceiptUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-zinc-600" />
                                </div>
                                <p className="font-medium text-zinc-900">Click to upload receipt</p>
                                <p className="text-sm text-zinc-500">Supports JPG, PNG</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'voice' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-6">
                            {/* Language Selector */}
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setVoiceLanguage('en-US')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        voiceLanguage === 'en-US' 
                                            ? 'bg-black text-white' 
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                >
                                    🇺🇸 English
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVoiceLanguage('ne-NP')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        voiceLanguage === 'ne-NP' 
                                            ? 'bg-black text-white' 
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                >
                                    🇳🇵 नेपाली
                                </button>
                            </div>

                            {/* Microphone Button */}
                            <button
                                type="button"
                                onClick={handleVoiceRecord}
                                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                    isRecording 
                                        ? 'bg-red-500 animate-pulse scale-110' 
                                        : 'bg-gradient-to-br from-zinc-800 to-black hover:scale-105'
                                }`}
                            >
                                <Mic className={`w-10 h-10 text-white ${isRecording ? 'animate-bounce' : ''}`} />
                            </button>
                            
                            <p className="text-zinc-500 text-sm">
                                {isRecording ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                        {voiceLanguage === 'ne-NP' ? 'सुन्दैछु...' : 'Listening...'}
                                    </span>
                                ) : (
                                    voiceLanguage === 'ne-NP' ? 'बोल्न माइक्रोफोन थिच्नुहोस्' : 'Tap microphone to speak'
                                )}
                            </p>

                            {/* Live Transcript */}
                            {transcript && (
                                <div className="bg-zinc-50 p-4 rounded-lg text-sm italic text-zinc-600 max-w-md text-center border border-zinc-200">
                                    "{transcript}"
                                </div>
                            )}

                            {/* Example Phrases */}
                            <div className="mt-4 text-center">
                                <p className="text-xs text-zinc-400 mb-2">
                                    {voiceLanguage === 'ne-NP' ? 'उदाहरण वाक्यहरू:' : 'Try saying:'}
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                                    {voiceLanguage === 'ne-NP' ? (
                                        <>
                                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded">"आज खाजामा ५०० खर्च भयो"</span>
                                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded">"बिजुलीको बिल २००० तिरें"</span>
                                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded">"पेट्रोलमा १५०० खर्च"</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded">"Spent $50 on groceries"</span>
                                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded">"Paid 200 for electricity bill"</span>
                                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded">"Coffee at Starbucks 5 dollars"</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Standard Form Fields (Auto-filled by AI) */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Amount"
                                type="number"
                                step="0.01"
                                name="amount"
                                value={form.amount}
                                onChange={handleInputChange}
                                required
                            />
                            <div>
                                <Input
                                    label="Date"
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    onChange={handleInputChange}
                                    required
                                />
                                {receiptAiDebug?.dateReason && activeTab === 'receipt' && (
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {receiptAiDebug.ollamaUsed ? 'Ollama:' : 'AI:'} {receiptAiDebug.dateReason}
                                    </p>
                                )}
                                {voiceAiDebug?.dateReason && activeTab === 'voice' && (
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {voiceAiDebug.ollamaUsed ? 'Ollama:' : 'AI:'} {voiceAiDebug.dateReason}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <Input
                                label="Description"
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleInputChange}
                                onBlur={handleTitleBlur}
                                placeholder="e.g. Starbucks Coffee"
                                required
                            />
                            <div className="absolute top-0 right-0">
                                {activeTab !== 'manual' && <Badge type="neutral">AI Auto-filled</Badge>}
                            </div>
                        </div>

                        <Select
                            label="Category"
                            name="category"
                            value={form.category}
                            onChange={handleInputChange}
                            options={['Uncategorized', ...TRANSACTION_CATEGORIES]}
                        />

                        {form.category && form.category !== 'Uncategorized' && (
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Sparkles size={12} />
                                <span>AI Suggestion applied</span>
                            </div>
                        )}
                    </div>

                    <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                        Save Expense
                    </Button>
                </form>
            </Card>

            {/* Receipt Preview */}
            {receiptImage && (
                <Card title="Receipt Preview">
                    <img src={receiptImage} alt="Receipt" className="w-full h-auto rounded-lg border border-zinc-200" />
                </Card>
            )}
        </div>
    );
};

export default AddExpense;