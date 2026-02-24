/**
 * @file CameraModal.tsx
 * @description Modal component to access the device camera and capture photos for evidence.
 * @module components/projects
 * @author Antigravity Architect
 */

import React, { useRef, useEffect } from 'react';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageSrc: string) => void;
}

/**
 * CameraModal Component
 */
const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("No se pudo acceder a la cámara. Asegúrese de haber otorgado los permisos necesarios.");
                onClose();
            }
        };

        if (isOpen) startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isOpen, onClose]);

    const handleCapture = () => {
        const video = videoRef.current;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                onCapture(canvas.toDataURL('image/jpeg'));
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] bg-black flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-10 flex gap-10 items-center">
                <button
                    onClick={onClose}
                    className="size-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold"
                >
                    &times;
                </button>
                <button
                    onClick={handleCapture}
                    className="size-24 rounded-full border-8 border-white bg-transparent"
                />
                <div className="size-16" /> {/* Spacer */}
            </div>
        </div>
    );
};

export default CameraModal;
