'use client';

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { X, Check, RefreshCw, Eraser, ScanLine, Maximize, AlertCircle, RotateCw } from 'lucide-react';

interface Point { x: number; y: number }

export default function ScannerModal({ imageSrc, isOpen, onClose, onScan }: { imageSrc: File | null, isOpen: boolean, onClose: () => void, onScan: (file: File) => void }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [points, setPoints] = useState<Point[]>([]); // TL, TR, BR, BL
    const [activePoint, setActivePoint] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [finalFile, setFinalFile] = useState<File | null>(null);

    useEffect(() => {
        if (imageSrc) {
            const tempUrl = URL.createObjectURL(imageSrc);
            setPoints([]); // Clear state to avoid flash or crashes
            setPreviewUrl(tempUrl);

            // Init points at corners on load
            const img = new Image();
            img.onload = () => {
                setImgDimensions({ w: img.width, h: img.height });
                // Default points: 10% in from corners
                const w = img.width;
                const h = img.height;
                setPoints([
                    { x: w * 0.1, y: h * 0.1 }, // TL
                    { x: w * 0.9, y: h * 0.1 }, // TR
                    { x: w * 0.9, y: h * 0.9 }, // BR
                    { x: w * 0.1, y: h * 0.9 }  // BL
                ]);
            };
            img.src = tempUrl;

            return () => URL.revokeObjectURL(tempUrl);
        }
    }, [imageSrc]);

    // Handle Dragging Logic (Mouse & Touch)
    const handleStart = (idx: number) => setActivePoint(idx);
    const handleEnd = () => setActivePoint(null);

    const handleMove = (clientX: number, clientY: number) => {
        if (activePoint === null || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        // Calculate aspect fit logic to map screen coords back to image coords
        // The container rect represents the display area (black bg).
        // The image is centered with "object-contain" logic simulated here.

        const { w: imgW, h: imgH } = imgDimensions;
        if (imgW === 0 || imgH === 0) return;

        const contW = rect.width;
        const contH = rect.height;

        const imgAspect = imgW / imgH;
        const contAspect = contW / contH;
        let drawW, drawH, offX, offY;

        if (imgAspect > contAspect) {
            drawW = contW;
            drawH = contW / imgAspect;
            offX = 0;
            offY = (contH - drawH) / 2;
        } else {
            drawH = contH;
            drawW = contH * imgAspect;
            offX = (contW - drawW) / 2;
            offY = 0;
        }

        // Relative to container
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;

        // Map relative screen coord to image coord
        // formula: screen = off + (img / imgDim) * drawDim
        // inverse: img = (screen - off) * imgDim / drawDim

        let x = (relX - offX) * imgW / drawW;
        let y = (relY - offY) * imgH / drawH;

        // Clamp to image bounds
        x = Math.max(0, Math.min(imgW, x));
        y = Math.max(0, Math.min(imgH, y));

        setPoints(prev => {
            const newPoints = [...prev];
            newPoints[activePoint] = { x, y };
            return newPoints;
        });
    };

    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);


    const processImage = async () => {
        if (!previewUrl || points.length !== 4) return;
        setLoading(true);

        try {
            const img = new Image();
            img.src = previewUrl;
            await new Promise(r => img.onload = r);

            // 1. Perspective Warp (Homography)
            // Destination: A4 Ratio roughly or based on average width
            const widthTop = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
            const widthBottom = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
            const maxWidth = Math.max(widthTop, widthBottom);

            const heightLeft = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
            const heightRight = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);
            const maxHeight = Math.max(heightLeft, heightRight);

            const resultCanvas = document.createElement('canvas');
            resultCanvas.width = maxWidth;
            resultCanvas.height = maxHeight;
            const ctx = resultCanvas.getContext('2d');
            if (!ctx) throw new Error('No context');

            // --- Simulating Perspective Warp via Affine Striping (Simple Approach) --- 
            // Better Approach: Use standard Homography Matrix Loop
            // Coefficients Calculation
            const src = [points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y];
            const dst = [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight];

            // Use Homography Matrix (Code adapted from open source snippets)
            const h = solveHomography(src, dst);

            // Pixel Loop (Heavy CPU) - Optimize by downscaling if super huge? 
            // For 12MP limit logic? Let's use max dimension 1600px for speed
            let processW = maxWidth;
            let processH = maxHeight;
            const MAX_DIM = 2000;
            if (processW > MAX_DIM || processH > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / processW, MAX_DIM / processH);
                processW *= ratio;
                processH *= ratio;
                resultCanvas.width = processW;
                resultCanvas.height = processH;
                // Re-calc H for scaled dest
                const dstScaled = [0, 0, processW, 0, processW, processH, 0, processH];
                // H needs to map Src -> DstScaled
                // Simple: Just scale the H-inverse mapping? 
                // Easier: Just map destination pixel (x,y) back to source pixel (u,v)
            }

            // Draw original to offscreen canvas to access data
            const origCanvas = document.createElement('canvas');
            origCanvas.width = img.width;
            origCanvas.height = img.height;
            const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
            origCtx?.drawImage(img, 0, 0);
            const srcData = origCtx?.getImageData(0, 0, img.width, img.height);
            const dstData = ctx.createImageData(resultCanvas.width, resultCanvas.height);

            // Backward Mapping: For each pixel in Dst, find Src
            // H maps Src -> Dst. We need H_inv to map Dst -> Src.
            // Actually, solveHomography usually gives Src->Dst. 
            // Let's compute H_inv directly: Map Dst points to Src points.
            const hInv = solveHomography(
                [0, 0, resultCanvas.width, 0, resultCanvas.width, resultCanvas.height, 0, resultCanvas.height],
                src
            );

            const data = dstData.data;
            const srcPixels = srcData?.data;
            if (!srcPixels) throw new Error("No src pixels");

            const w = resultCanvas.width;
            const h_canv = resultCanvas.height;
            const srcW = img.width;
            const srcH = img.height;

            for (let y = 0; y < h_canv; y++) {
                for (let x = 0; x < w; x++) {
                    // Apply Matrix HInv to (x, y)
                    const uVal = hInv[0] * x + hInv[1] * y + hInv[2];
                    const vVal = hInv[3] * x + hInv[4] * y + hInv[5];
                    const wVal = hInv[6] * x + hInv[7] * y + 1;

                    const srcX = Math.floor(uVal / wVal);
                    const srcY = Math.floor(vVal / wVal);

                    const dstIdx = (y * w + x) * 4;

                    if (srcX >= 0 && srcX < srcW && srcY >= 0 && srcY < srcH) {
                        const srcIdx = (srcY * srcW + srcX) * 4;
                        // RGB
                        const r = srcPixels[srcIdx];
                        const g = srcPixels[srcIdx + 1];
                        const b = srcPixels[srcIdx + 2];

                        // --- APPLY FILTERS HERE (Scanner Effect) ---
                        // 1. Grayscale (DISABLED for Color)
                        // const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                        // 2. High Contrast / Binarization simulation (DISABLED)
                        // Simple linear contrast: (val - 128) * contrast + 128
                        // const contrast = 1.5;
                        // let final = (gray - 128) * contrast + 128; // ...

                        // KEEP ORIGINAL COLOR
                        data[dstIdx] = r;
                        data[dstIdx + 1] = g;
                        data[dstIdx + 2] = b;
                        data[dstIdx + 3] = 255;   // Alpha
                    } else {
                        data[dstIdx + 3] = 0; // Transparent if out of bounds
                    }
                }
            }

            ctx.putImageData(dstData, 0, 0);

            // Convert to File
            // HIGH QUALITY, NO DOWNSCALING
            resultCanvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "scanned_doc.jpg", { type: "image/jpeg" });
                    const url = URL.createObjectURL(blob);
                    setScanResult(url);
                    setFinalFile(file);
                }
                setLoading(false);
            }, 'image/jpeg', 1.0); // Max Quality 1.0

        } catch (e) {
            console.error(e);
            alert("Error al procesar imagen");
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (finalFile) {
            onScan(finalFile);
            onClose();
        }
    };

    const handleRetry = () => {
        setScanResult(null);
        setFinalFile(null);
    };

    const handleRotate = async () => {
        if (!scanResult) return;

        try {
            setLoading(true);
            const img = new Image();
            img.src = scanResult;
            await new Promise(r => img.onload = r);

            const canvas = document.createElement('canvas');
            // Swap dimensions for 90deg rotation
            canvas.width = img.height;
            canvas.height = img.width;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Rotate context
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "scanned_doc_rotated.jpg", { type: "image/jpeg" });
                    const url = URL.createObjectURL(blob);

                    // Revoke old
                    URL.revokeObjectURL(scanResult);

                    setScanResult(url);
                    setFinalFile(file);
                }
                setLoading(false);
            }, 'image/jpeg', 0.85);

        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    // Math Helper: Solve Homography (Src -> Dst)
    // Maps 4 points (x,y) to 4 points (u,v). 8 equations.
    // Returns 3x3 Matrix as 8-element array (h33 = 1)
    function solveHomography(src: number[], dst: number[]) {
        // Gaussian elimination to solve H
        // ... (Simplified Linear Solver for 8 unknowns)
        // Implementation omitted for brevity, using a robust snippets logic below

        let i, j, k;
        let a: number[][] = [];
        let b: number[] = [];

        for (i = 0; i < 4; i++) {
            const x = src[2 * i];
            const y = src[2 * i + 1];
            const u = dst[2 * i];
            const v = dst[2 * i + 1];

            a.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
            a.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
            b.push(u);
            b.push(v);
        }

        // Gaussian Elimination
        const n = 8;
        for (i = 0; i < n; i++) {
            // Pivot
            let maxEl = Math.abs(a[i][i]);
            let maxRow = i;
            for (k = i + 1; k < n; k++) {
                if (Math.abs(a[k][i]) > maxEl) {
                    maxEl = Math.abs(a[k][i]);
                    maxRow = k;
                }
            }
            // Swap
            for (k = i; k < n; k++) { let tmp = a[maxRow][k]; a[maxRow][k] = a[i][k]; a[i][k] = tmp; }
            let tmp = b[maxRow]; b[maxRow] = b[i]; b[i] = tmp;

            // Normalize
            for (k = i + 1; k < n; k++) {
                const c = -a[k][i] / a[i][i];
                for (j = i; j < n; j++) {
                    if (i === j) a[k][j] = 0;
                    else a[k][j] += c * a[i][j];
                }
                b[k] += c * b[i];
            }
        }

        // Back substitution
        const xResult = new Array(n).fill(0);
        for (i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (j = i + 1; j < n; j++) sum += a[i][j] * xResult[j];
            xResult[i] = (b[i] - sum) / a[i][i];
        }

        return xResult; // h0-h7
    }


    if (!isOpen || !previewUrl) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col pt-safe">
            {/* Header */}
            <div className="p-4 flex justify-between items-center text-white bg-slate-900 border-b border-slate-800">
                <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
                    <X className="h-5 w-5" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg">Modo Scanner</span>
                    <span className="text-xs text-slate-400">Ajusta esquinas y procesa</span>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-black touch-none"
                onMouseMove={!scanResult ? onMouseMove : undefined}
                onMouseUp={!scanResult ? handleEnd : undefined}
                onMouseLeave={!scanResult ? handleEnd : undefined}
                onTouchMove={!scanResult ? onTouchMove : undefined}
                onTouchEnd={!scanResult ? handleEnd : undefined}
            >
                {/* Background Image / Result */}
                {!scanResult ? (
                    <img
                        src={previewUrl}
                        className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        alt="Scan Preview"
                        ref={(el) => {
                            if (el && canvasRef.current) { }
                        }}
                    />
                ) : (
                    <img
                        src={scanResult}
                        className="max-w-full max-h-full object-contain select-none border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                        alt="Scanned Result"
                    />
                )}

                {/* Overlay SVG/Canvas for points (Only in Edit Mode) */}
                {!scanResult && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                    >
                    </div>
                )}


                {/* Manual Visual Layer (Points) */}
                {!scanResult && (
                    <div className="absolute inset-0" ref={(el) => { if (el) containerRef.current = el; }}>
                        {previewUrl && points.length === 4 && imgDimensions.w > 0 && (
                            <CanvasOverlay
                                imgUrl={previewUrl}
                                points={points}
                                onStart={handleStart}
                                containerW={containerRef.current?.offsetWidth || 0}
                                containerH={containerRef.current?.offsetHeight || 0}
                                imgW={imgDimensions.w}
                                imgH={imgDimensions.h}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Footer Controls */}
            <div className="bg-slate-900 p-6 border-t border-slate-800 flex justify-between items-center pb-8 sticky bottom-0 z-20">
                {scanResult ? (
                    <div className="flex justify-between w-full gap-2">
                        <button
                            onClick={handleRetry}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2"
                        >
                            <Eraser className="h-5 w-5" />
                        </button>

                        <button
                            onClick={handleRotate}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                        >
                            {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <RotateCw className="h-5 w-5" />}
                            ROTAR
                        </button>

                        <button
                            onClick={handleConfirm}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 active:scale-95 transition-all flex-1 justify-center"
                        >
                            <Check className="h-5 w-5" />
                            CONFIRMAR
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-white text-xs max-w-[150px] opacity-70">
                            Arrastra los círculos naranjas a las esquinas del documento.
                        </div>
                        <button
                            onClick={processImage}
                            disabled={loading}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
                        >
                            {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
                            ESCANEAR
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// Helper Subcomponent for rendering image + points on canvas to insure sync
function CanvasOverlay({ imgUrl, points, onStart, containerW, containerH, imgW, imgH }: any) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = imgUrl; // cached
        // Wait load? usually cached
        // We assume loaded parent.

        // Calculate Aspect Fit
        const imgAspect = imgW / imgH;
        const contAspect = containerW / containerH;
        let drawW, drawH, offX, offY;

        if (imgAspect > contAspect) {
            drawW = containerW;
            drawH = containerW / imgAspect;
            offX = 0;
            offY = (containerH - drawH) / 2;
        } else {
            drawH = containerH;
            drawW = containerH * imgAspect;
            offX = (containerW - drawW) / 2;
            offY = 0;
        }

        // Draw Image
        ctx.clearRect(0, 0, containerW, containerH);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, containerW, containerH);

        ctx.drawImage(img, offX, offY, drawW, drawH);

        // Draw HUD (Mask outside poli?)
        ctx.strokeStyle = "#ea580c"; // Orange
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Map natural points -> screen points
        const map = (p: Point) => ({
            x: offX + (p.x / imgW) * drawW,
            y: offY + (p.y / imgH) * drawH
        });

        const p0 = map(points[0]);
        const p1 = map(points[1]);
        const p2 = map(points[2]);
        const p3 = map(points[3]);

        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();

        // Semi-transparent mask outside
        // ... (Optional)

        // Draw Handles
        const drawHandle = (p: Point, idx: number) => {
            const sc = map(p);
            ctx.fillStyle = "rgba(234, 88, 12, 0.5)"; // Inner
            ctx.beginPath(); arc(sc.x, sc.y, 20); ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.beginPath(); arc(sc.x, sc.y, 8); ctx.fill();
            ctx.strokeStyle = "#ea580c";
            ctx.beginPath(); arc(sc.x, sc.y, 8); ctx.stroke();
        };
        const arc = (x: number, y: number, r: number) => ctx.arc(x, y, r, 0, 2 * Math.PI);

        points.forEach(drawHandle);

    }, [imgUrl, points, containerW, containerH, imgW, imgH]);

    // Handle interactions on canvas to get correct mapping
    // We forward index to parent
    const getTouchIdx = (x: number, y: number) => {
        // Reverse map logic or simple distance check
        const canvas = canvasRef.current;
        if (!canvas) return -1;

        // Re-calc layout (ugly duplication but reliable)
        const imgAspect = imgW / imgH;
        const contAspect = containerW / containerH;
        let drawW, drawH, offX, offY;
        if (imgAspect > contAspect) {
            drawW = containerW; drawH = containerW / imgAspect; offX = 0; offY = (containerH - drawH) / 2;
        } else {
            drawH = containerH; drawW = containerH * imgAspect; offX = (containerW - drawW) / 2; offY = 0;
        }

        const map = (p: Point) => ({ x: offX + (p.x / imgW) * drawW, y: offY + (p.y / imgH) * drawH });

        let bestDist = 50; // Hit radius
        let bestIdx = -1;

        points.forEach((p: Point, i: number) => {
            const s = map(p);
            const dist = Math.hypot(s.x - x, s.y - y);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        });
        return bestIdx;
    };


    const down = (e: MouseEvent | TouchEvent) => {
        // get offset in element
        const r = (e.target as HTMLElement).getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }

        const x = clientX - r.left;
        const y = clientY - r.top;
        const idx = getTouchIdx(x, y);
        if (idx !== -1) onStart(idx);
    };

    return <canvas
        ref={canvasRef}
        width={containerW}
        height={containerH}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={down}
        onTouchStart={down}
    />
};
