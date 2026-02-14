
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { identifyCard } from '../services/geminiService';
import { fetchCardData } from '../services/pokemonService';
import { PokemonCard } from '../types';
import Modal from './Modal';
import Loader from './Loader';

interface ScannerProps {
  onClose: () => void;
  onCardAdded: (card: PokemonCard) => void;
}

type Status = 'idle' | 'initializing' | 'scanning' | 'capturing' | 'identifying' | 'fetching' | 'result' | 'error';

const Scanner: React.FC<ScannerProps> = ({ onClose, onCardAdded }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [foundCard, setFoundCard] = useState<PokemonCard | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setStatus('initializing');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('scanning');
        }
      } else {
        throw new Error('Camera not supported');
      }
    } catch (err) {
      console.error(err);
      setError('Could not access camera. Please check permissions.');
      setStatus('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setStatus('capturing');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = imageDataUrl.split(',')[1];
        
        stopCamera();
        setStatus('identifying');
        
        try {
            const identified = await identifyCard(base64Data);
            if (identified && identified.name && identified.set) {
                setStatus('fetching');
                const cardData = await fetchCardData(identified.name, identified.set);
                if (cardData) {
                    setFoundCard(cardData);
                    setStatus('result');
                } else {
                    throw new Error(`Card '${identified.name}' from set '${identified.set}' not found.`);
                }
            } else {
                throw new Error('Could not identify the card. Please try again with a clearer image.');
            }
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
            setStatus('error');
        }
    }
  };

  const resetScanner = () => {
    setError(null);
    setFoundCard(null);
    startCamera();
  }

  const statusMessages: Record<Status, string> = {
    idle: 'Starting...',
    initializing: 'Initializing camera...',
    scanning: 'Position card and capture',
    capturing: 'Capturing photo...',
    identifying: 'Identifying card...',
    fetching: 'Fetching card data...',
    result: 'Card Found!',
    error: 'Error',
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full mx-auto text-center">
        <h2 className="text-xl font-bold mb-4">{statusMessages[status]}</h2>
        
        <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4">
          <video ref={videoRef} className={`w-full h-full object-cover ${status === 'scanning' ? 'block' : 'hidden'}`} playsInline />
          <canvas ref={canvasRef} className={`w-full h-full object-cover ${status !== 'scanning' ? 'block' : 'hidden'}`} />

          {(status === 'identifying' || status === 'fetching' || status === 'initializing') && <Loader />}
        </div>

        {status === 'scanning' && <button onClick={capturePhoto} className="w-full bg-yellow-400 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-500">Capture</button>}

        {status === 'result' && foundCard && (
          <div>
            <img src={foundCard.images.small} alt={foundCard.name} className="w-40 mx-auto rounded-lg mb-2" />
            <p className="font-bold">{foundCard.name}</p>
            <p className="text-gray-400">{foundCard.set.name}</p>
            <p className="text-yellow-400 font-semibold text-lg">€{(foundCard.cardmarket?.prices?.averageSellPrice ?? 0).toFixed(2)}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={resetScanner} className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">Scan Another</button>
              <button onClick={() => onCardAdded(foundCard)} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">Add to Collection</button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={resetScanner} className="w-full bg-yellow-400 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-500">Try Again</button>
          </div>
        )}

        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Modal>
  );
};

export default Scanner;
