'use client';

import React, { useState, useEffect } from 'react';
import { X, QrCode, Users, Clock, Zap, CheckCircle } from 'lucide-react';

// @ts-ignore - Fix for qrcode types
import QRCode from 'qrcode';

interface QRAttendanceModalProps {
    classId: number;
    className: string;
    totalStudents: number;
    onClose: () => void;
}

export const QRAttendanceModal: React.FC<QRAttendanceModalProps> = ({
    classId,
    className,
    totalStudents,
    onClose,
}) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [currentCode, setCurrentCode] = useState<string>('');
    const [scannedCount, setScannedCount] = useState<number>(0);
    const [rotationInterval, setRotationInterval] = useState<number>(5);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isStopping, setIsStopping] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState(rotationInterval);

    // Start QR session
    const startSession = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                alert('Please login again - no token found');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/qr/start-session`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        class_id: classId,
                        rotation_interval: rotationInterval,
                    }),
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to start session');
            }

            const data = await response.json();

            // 1) mark session active so UI switches to QR view
            setIsActive(true);
            setCurrentCode(data.session.current_code);
            setScannedCount(data.session.scanned_students?.length ?? 0);
            setTimeLeft(rotationInterval);

            // 2) generate QR image
            const qrData = JSON.stringify({
                class_id: String(classId),
                code: data.session.current_code,
            });

            const url = await QRCode.toDataURL(qrData, {
                width: 300,
                margin: 2,
                color: { dark: '#059669', light: '#ffffff' },
            });


            setQrCodeUrl(url);
        } catch (err: any) {
            console.error('Start session error:', err);
            alert(err.message || 'Error starting QR session');
        }
    };

    // Poll for session updates
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/qr/session/${classId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!res.ok) return;
                const data = await res.json();
                if (!data.active || !data.session) return;

                setScannedCount(data.session.scanned_students.length);

                if (data.session.current_code !== currentCode) {
                    // new code from backend
                    setCurrentCode(data.session.current_code);
                    setTimeLeft(rotationInterval);

                    const qrData = JSON.stringify({
                        class_id: String(classId),
                        code: data.session.current_code,
                    });

                    const url = await QRCode.toDataURL(qrData, {
                        width: 300,
                        margin: 2,
                        color: { dark: '#059669', light: '#ffffff' },
                    });

                    setQrCodeUrl(url);
                }
            } catch (e) {
                console.error('Poll error', e);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, classId, currentCode, rotationInterval]);


    // Countdown timer
    useEffect(() => {
        if (!isActive) return;

        const t = setInterval(() => {
            setTimeLeft(prev => (prev <= 1 ? rotationInterval : prev - 1));
        }, 1000);

        return () => clearInterval(t);
    }, [isActive, rotationInterval]);


    // Stop session
    const stopSession = async () => {
        setIsStopping(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                alert('Please login again - no token found');
                setIsStopping(false);
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/qr/stop-session`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ class_id: classId }),
                }
            );

            const text = await response.text();
            console.log('Stop response:', response.status, text);

            if (!response.ok) {
                throw new Error(text || 'Failed to stop QR session');
            }

            onClose();
        } catch (err: any) {
            console.error('Stop session error:', err);
            alert(err.message || 'Failed to stop session');
        } finally {
            setIsStopping(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">QR Code Attendance</h2>
                        <p className="text-emerald-50 text-sm mt-1">{className}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto">
                    {!isActive ? (
                        /* Setup Screen */
                        <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <QrCode className="w-12 h-12 text-emerald-600" />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    Start QR Attendance Session
                                </h3>
                                <p className="text-slate-600">
                                    Students will scan the QR code to mark their attendance automatically
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-6 max-w-md mx-auto">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    QR Code Rotation Interval
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="3"
                                        max="30"
                                        value={rotationInterval}
                                        onChange={(e) => setRotationInterval(Number(e.target.value))}
                                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-emerald-500">
                                        <Clock className="w-4 h-4 text-emerald-600" />
                                        <span className="font-bold text-emerald-900">{rotationInterval}s</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">
                                    The QR code will change every {rotationInterval} seconds for security
                                </p>
                            </div>

                            <button
                                onClick={startSession}
                                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 mx-auto"
                            >
                                <Zap className="w-5 h-5" />
                                Start Session
                            </button>
                        </div>
                    ) : (
                        /* Active Session Screen */
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-semibold text-emerald-700 uppercase">
                                            Scanned
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-900">{scannedCount}</p>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-4 h-4 text-slate-600" />
                                        <span className="text-xs font-semibold text-slate-700 uppercase">
                                            Total
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900">{totalStudents}</p>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-semibold text-blue-700 uppercase">
                                            Next Code
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-blue-900">{timeLeft}s</p>
                                </div>
                            </div>

                            {/* QR Code Display */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 text-center border-2 border-emerald-200">
                                {qrCodeUrl && (
                                    <div className="space-y-4">
                                        <div className="bg-white p-6 rounded-2xl inline-block shadow-lg">
                                            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 mx-auto" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 text-sm mb-2">
                                    📱 Instructions for Students
                                </h4>
                                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                    <li>Tap "Scan QR Code" in student dashboard</li>
                                    <li>Select this class from the list</li>
                                    <li>Point camera at QR code above</li>
                                    <li>Hold steady until scanned ✅</li>
                                    <li>Attendance marked as Present automatically</li>
                                </ol>
                            </div>

                            {/* Stop Button */}
                            <button
                                onClick={stopSession}
                                disabled={isStopping}
                                className="w-full px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isStopping ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Stopping Session...
                                    </>
                                ) : (
                                    <>
                                        <X className="w-5 h-5" />
                                        Stop Session & Mark Absent
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-center text-slate-500">
                                ⏰ Students who haven't scanned will be automatically marked as Absent
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
