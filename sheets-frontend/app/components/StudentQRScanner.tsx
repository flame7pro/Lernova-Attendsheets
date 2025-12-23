'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ClassInfo {
    classid: string;
    classname: string;
    teachername: string;
}

interface StudentQRScannerProps {
    onClose: () => void;
    classes: ClassInfo[];
}

export const StudentQRScanner: React.FC<StudentQRScannerProps> = ({
    onClose,
    classes,
}) => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [scanning, setScanning] = useState<boolean>(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const html5QrRef = useRef<Html5Qrcode | null>(null);

    // Clean up on unmount
    useEffect(() => {
        const setupScanner = async () => {
            if (!scanning) return;

            try {
                // ensure container exists
                const regionId = 'qr-reader';
                const elem = document.getElementById(regionId);
                if (!elem) {
                    console.error('qr-reader element not found');
                    return;
                }

                // ensure permission prompt if needed
                await navigator.mediaDevices.getUserMedia({ video: true });

                if (!html5QrRef.current) {
                    html5QrRef.current = new Html5Qrcode(regionId);
                }

                await html5QrRef.current.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onScanSuccess,
                    onScanFailure
                );
            } catch (err: any) {
                console.error('Camera start error:', err);
                setResult({
                    success: false,
                    message:
                        'Cannot access camera. Please allow camera permission and reload.',
                });
                setScanning(false);
            }
        };

        setupScanner();

        // no cleanup here; stopScanning handles it
    }, [scanning]);


    const stopScanning = async () => {
        setScanning(false);
        setProcessing(false);
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop();
                await html5QrRef.current.clear();
            } catch {
                // ignore
            }
            html5QrRef.current = null;
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        if (processing) return;
        setProcessing(true);

        try {
            let class_id: string;
            let code: string;

            // Try JSON first
            try {
                const parsed = JSON.parse(decodedText);
                class_id = parsed.class_id;
                code = parsed.code;
            } catch {
                // Fallback: assume format "classId|code"
                const parts = decodedText.split('|');
                if (parts.length === 2) {
                    class_id = parts[0];
                    code = parts[1];
                } else {
                    throw new Error('Invalid QR content');
                }
            }

            if (class_id !== selectedClass) {
                setResult({
                    success: false,
                    message: 'This QR code is for a different class!',
                });
                setProcessing(false);
                return;
            }

            const token = typeof window !== 'undefined'
                ? localStorage.getItem('accesstoken')
                : null;

            if (!token) {
                setResult({
                    success: false,
                    message: 'Please login again.',
                });
                setProcessing(false);
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/qr/scan?class_id=${class_id}&qr_code=${code}`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to mark attendance');

            setResult({ success: true, message: data.message });

            await stopScanning();
            setTimeout(onClose, 3000);
        } catch (error: any) {
            console.error('Scan error:', error);
            setResult({
                success: false,
                message: error.message || 'Failed to scan QR code',
            });
            setProcessing(false);
        }
    };


    const onScanFailure = (_error: string) => {
        // ignore continuous decode failures
    };

    const startScanning = async () => {
        if (!selectedClass) {
            alert('Please select a class first');
            return;
        }

        setResult(null);
        setScanning(true); // just flip state; camera will start in useEffect
    };


    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Scan QR Code</h2>
                        <p className="text-teal-50 text-sm mt-1">Mark your attendance</p>
                    </div>
                    <button
                        onClick={async () => {
                            await stopScanning();
                            onClose();
                        }}
                        className="p-2 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Result */}
                    {result && (
                        <div
                            className={`rounded-xl p-4 border-2 ${result.success
                                ? 'bg-emerald-50 border-emerald-500'
                                : 'bg-rose-50 border-rose-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {result.success ? (
                                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                                )}
                                <div>
                                    <p
                                        className={`font-semibold ${result.success ? 'text-emerald-900' : 'text-rose-900'
                                            }`}
                                    >
                                        {result.success ? 'Success!' : 'Error'}
                                    </p>
                                    <p
                                        className={`text-sm ${result.success ? 'text-emerald-700' : 'text-rose-700'
                                            }`}
                                    >
                                        {result.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!scanning ? (
                        // Class selection view
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Select Class to Mark Attendance
                                </label>

                                {classes.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl">
                                        <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                        <p className="text-slate-600">No classes enrolled</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Enroll in a class first to scan attendance
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {classes.map((cls) => (
                                            <button
                                                key={cls.classid}
                                                onClick={() => setSelectedClass(cls.classid)}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedClass === cls.classid
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-900 truncate">
                                                            {cls.classname}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {cls.teachername}
                                                        </p>
                                                    </div>
                                                    {selectedClass === cls.classid && (
                                                        <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 ml-2" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {classes.length > 0 && (
                                <button
                                    onClick={startScanning}
                                    disabled={!selectedClass}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-5 h-5" />
                                    Start Scanning
                                </button>
                            )}
                        </div>
                    ) : (
                        // Scanner view
                        <div className="space-y-4">
                            <div className="bg-slate-900 rounded-xl overflow-hidden">
                                <div id="qr-reader" className="w-full" />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 text-sm mb-2">
                                    Scanning Instructions
                                </h4>
                                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                                    <li>Point your camera at the teacher&apos;s QR code</li>
                                    <li>Make sure the QR code is clearly visible</li>
                                    <li>Hold steady until the code is scanned</li>
                                    <li>Your attendance will be marked automatically</li>
                                </ul>
                            </div>

                            <button
                                onClick={stopScanning}
                                className="w-full px-6 py-3 bg-slate-600 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <X className="w-5 h-5" />
                                Cancel Scanning
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
