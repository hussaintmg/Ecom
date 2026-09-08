"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Sparkles, RefreshCw, Zap, Keyboard, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface BarcodeScannerViewProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Ignored if user hasn't interacted with audio yet
  }
};

const BarcodeScannerView: React.FC<BarcodeScannerViewProps> = ({ onScan, disabled = false }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const scannerRef = useRef<any>(null);
  const scanCooldownRef = useRef<boolean>(false);
  const readerElementId = "interactive-barcode-viewfinder";

  // Handle successful scan
  const handleCodeDetected = useCallback(
    (code: string) => {
      if (disabled || scanCooldownRef.current) return;

      scanCooldownRef.current = true;
      playBeep();
      setLastScannedCode(code);
      setFlashSuccess(true);
      setTimeout(() => setFlashSuccess(false), 600);

      onScan(code.trim());

      // Prevent duplicate scan of the same barcode within 1.2s
      setTimeout(() => {
        scanCooldownRef.current = false;
      }, 1200);
    },
    [disabled, onScan]
  );

  // Start Camera
  const startCamera = async (cameraId?: string) => {
    setCameraLoading(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Stop previous instance if running
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
      }

      // Get available cameras
      try {
        const availableDevices = await Html5Qrcode.getCameras();
        if (availableDevices && availableDevices.length > 0) {
          setCameras(availableDevices);
          if (!cameraId) {
            // Prioritize back camera
            const backCam = availableDevices.find(
              (c) =>
                c.label.toLowerCase().includes("back") ||
                c.label.toLowerCase().includes("rear") ||
                c.label.toLowerCase().includes("environment")
            );
            cameraId = backCam ? backCam.id : availableDevices[0].id;
            setSelectedCameraId(cameraId);
          }
        }
      } catch (err) {
        console.warn("Could not enumerate camera devices:", err);
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.min(320, Math.floor(minEdge * 0.85)),
              height: Math.min(180, Math.floor(minEdge * 0.6)),
            };
          },
          aspectRatio: 1.6,
        },
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // Frame read non-matches are expected while aiming
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera start error:", err);
      setCameraError(
        err.message ||
          "Camera access was denied or not available. You can use manual entry or a USB scanner below."
      );
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Listen for hardware USB barcode scanner keystrokes
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing into an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const now = Date.now();
      // Hardware scanners type characters very quickly (< 45ms between keystrokes)
      if (now - lastKeyTime > 100) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleCodeDetected(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCodeDetected]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeDetected(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Scanner HUD Container */}
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-lg">
        {/* Animated Laser Scanning Overlay CSS */}
        <style jsx>{`
          @keyframes laserSweep {
            0% {
              top: 15%;
              opacity: 0.8;
            }
            50% {
              top: 85%;
              opacity: 1;
            }
            100% {
              top: 15%;
              opacity: 0.8;
            }
          }
          .laser-line {
            animation: laserSweep 2s infinite ease-in-out;
            box-shadow: 0 0 12px 2px rgba(16, 185, 129, 0.8);
          }
          .corner-bracket {
            width: 24px;
            height: 24px;
            border-color: #10b981;
          }
        `}</style>

        {/* Viewfinder Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                cameraActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <span className="text-xs font-bold tracking-tight uppercase">
              {cameraActive ? "Camera Scanner Active" : "Camera Scanner Standby"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cameras.length > 1 && cameraActive && (
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="text-xs bg-background border rounded-lg px-2 py-1 outline-none"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}

            {!cameraActive ? (
              <Button
                size="sm"
                onClick={() => startCamera(selectedCameraId)}
                disabled={cameraLoading}
                className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                {cameraLoading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Camera size={13} />
                )}
                Start Camera
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={stopCamera}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <CameraOff size={13} /> Stop Camera
              </Button>
            )}
          </div>
        </div>

        {/* Viewfinder Video Area */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[380px] bg-black/95 flex items-center justify-center overflow-hidden">
          {/* html5-qrcode video element hook */}
          <div
            id={readerElementId}
            className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Futuristic Targeting Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              {/* Aiming Reticle Box */}
              <div
                className={`relative w-[85%] max-w-[340px] h-[70%] max-h-[200px] border-2 rounded-xl transition-all duration-300 ${
                  flashSuccess
                    ? "border-emerald-400 bg-emerald-500/20 scale-105"
                    : "border-emerald-500/50 bg-black/10"
                }`}
              >
                {/* 4 Corner Targeting Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Animated Green Laser Sweep Line */}
                <div className="laser-line absolute left-2 right-2 h-0.5 bg-emerald-400 rounded-full" />

                {/* Center Crosshair Marker */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <div className="w-8 h-0.5 bg-emerald-400" />
                  <div className="h-8 w-0.5 bg-emerald-400 absolute" />
                </div>

                {/* Target Instruction Pill */}
                <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/40 tracking-wider uppercase whitespace-nowrap shadow-lg">
                  Align Barcode Inside Box
                </div>
              </div>
            </div>
          )}

          {/* Standby / Error Overlay */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-muted/10 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 border flex items-center justify-center text-primary shadow-inner">
                <Camera size={32} className="opacity-70" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Camera Scanner is Off</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Click <strong>&quot;Start Camera&quot;</strong> above to scan with your phone/webcam, or use the manual box below.
                </p>
              </div>
              {cameraError && (
                <div className="flex items-center gap-2 p-2.5 mt-2 rounded-xl bg-destructive/10 text-destructive text-xs max-w-md border border-destructive/20">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HUD Bottom Status Banner */}
        {lastScannedCode && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles size={14} /> Last Scanned:
            </span>
            <code className="bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded font-mono font-black text-xs">
              {lastScannedCode}
            </code>
          </div>
        )}
      </div>

      {/* Manual Input / USB Hardware Scanner Bar */}
      <form onSubmit={handleManualSubmit} className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Keyboard
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Type barcode or scan with USB scanner (press Enter)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-mono"
          />
        </div>
        <Button type="submit" size="sm" disabled={!manualCode.trim()} className="font-bold px-4 py-2.5 text-xs">
          Submit
        </Button>
      </form>
    </div>
  );
};

export default BarcodeScannerView;
