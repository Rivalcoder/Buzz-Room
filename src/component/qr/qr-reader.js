import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import { X } from 'lucide-react';
import './qr-styles.css';

const QRScanner = ({ onClose, onRoomDetected }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [scanError, setScanError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeScanner = async () => {
      if (!videoRef.current) return;

      try {
        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          if (isMounted) {
            setScanError('No camera found. Please ensure your device has a camera and permissions are granted.');
          }
          return;
        }

        // Get list of cameras to prefer back camera on mobile
        const cameras = await QrScanner.listCameras(true);
        
        // Prefer back camera (environment facing) for better QR scanning
        // Look for back/rear camera, or use environment facing mode
        let preferredCamera = cameras.find(cam => {
          const label = cam.label.toLowerCase();
          return label.includes('back') || label.includes('rear') || label.includes('environment');
        });
        
        // If no back camera found, try to find one that's not front-facing
        if (!preferredCamera) {
          preferredCamera = cameras.find(cam => {
            const label = cam.label.toLowerCase();
            return !label.includes('front') && !label.includes('user');
          });
        }
        
        // Fallback to first available camera
        if (!preferredCamera && cameras.length > 0) {
          preferredCamera = cameras[0];
        }

        // Initialize the QR scanner with preferred camera
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            if (!isMounted) return;
            
            try {
              // Parse the QR code data
              const data = JSON.parse(result.data);
              
              // Check if the QR code contains valid room information
              if (data && data.room) {
                // Use the username from QR code or default to null (will be filled by user)
                const username = null;
                const room = data.room;
                
                // Stop scanning
                setScanning(false);
                
                if (username) {
                  // If username is in QR, we can proceed directly to loader/chat
                  onClose();
                  // Generate a random avatar index
                  const random = Math.floor(Math.random() * 9);
                  navigate('/loader', { state: { username, room, random } });
                } else {
                  // If only room is in QR, close scanner and fill room field
                  if (onRoomDetected) {
                    onRoomDetected(room);
                  }
                  onClose();
                }
              } else {
                setScanError('Invalid QR code format');
                // Clear error after 3 seconds
                setTimeout(() => {
                  if (isMounted) setScanError(null);
                }, 3000);
              }
            } catch (error) {
              setScanError('Could not parse QR code data');
              // Clear error after 3 seconds
              setTimeout(() => {
                if (isMounted) setScanError(null);
              }, 3000);
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 10,
            preferredCamera: preferredCamera?.id || 'environment', // Prefer back camera
            returnDetailedScanResult: true,
          }
        );

        // Set video attributes for better mobile support
        if (videoRef.current) {
          videoRef.current.setAttribute('playsinline', '');
          videoRef.current.setAttribute('webkit-playsinline', '');
          videoRef.current.setAttribute('muted', '');
        }

        // Start scanning with preferred camera (environment = back camera)
        // Use 'environment' facing mode which is the back camera on mobile devices
        const cameraId = preferredCamera?.id || 'environment';
        
        try {
          await scannerRef.current.start(cameraId);
        } catch (startError) {
          // If starting with specific camera fails, try with environment facing mode
          if (cameraId !== 'environment') {
            console.warn('Failed to start with preferred camera, trying environment mode');
            await scannerRef.current.start('environment');
          } else {
            throw startError;
          }
        }
        
        if (isMounted) {
          setCameraReady(true);
          setScanError(null);
        }
      } catch (error) {
        console.error('Scanner initialization error:', error);
        if (isMounted) {
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setScanError('Camera permission denied. Please allow camera access and try again.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setScanError('No camera found. Please check your device.');
          } else {
            setScanError(`Camera error: ${error.message || 'Unable to access camera'}`);
          }
        }
      }
    };

    initializeScanner();

    // Cleanup function
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [navigate, onClose, onRoomDetected]);

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">Scan QR Code</div>
      
      <div className="qr-scanner-frame">
        <video 
          ref={videoRef} 
          className={`qr-video ${cameraReady ? 'camera-ready' : ''}`}
          playsInline
          muted
        />
        <div className="qr-scanner-overlay"></div>
        {!cameraReady && !scanError && (
          <div className="qr-scanner-loading">
            <div className="qr-loading-spinner"></div>
            <p>Initializing camera...</p>
          </div>
        )}
      </div>
      
      {scanError ? (
        <p className="qr-scanner-instructions" style={{ color: '#ff6b6b' }}>
          {scanError}
        </p>
      ) : (
        <p className="qr-scanner-instructions">
          {scanning ? 'Position the QR code within the frame to scan and join a room' : 'QR code detected! Processing...'}
        </p>
      )}
      
      <button className="qr-scanner-close" onClick={onClose}>
        <X size={16} style={{ marginRight: '4px' }} /> Close Scanner
      </button>
    </div>
  );
};

export default QRScanner;