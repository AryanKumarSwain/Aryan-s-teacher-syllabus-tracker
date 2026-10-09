'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ReactCrop, { Crop, PixelCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Crop as CropIcon, RotateCcw, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
  imageSrc: string;
}

export function ImageCropModal({ isOpen, onClose, onCropComplete, imageSrc }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);

  // When image loads in DOM, initialize a generous 90% centered crop box immediately
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImageRef(e.currentTarget);

    const initialCrop: Crop = {
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5,
    };
    setCrop(initialCrop);
    setCompletedCrop(convertToPixelCrop(initialCrop, width, height));
  }, []);

  const setAspectPreset = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (!imageRef) return;

    if (!newAspect) {
      const freeCrop: Crop = {
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5,
      };
      setCrop(freeCrop);
      setCompletedCrop(convertToPixelCrop(freeCrop, imageRef.width, imageRef.height));
      return;
    }

    const { width, height } = imageRef;
    let cropWidth = width * 0.85;
    let cropHeight = cropWidth / newAspect;

    if (cropHeight > height * 0.85) {
      cropHeight = height * 0.85;
      cropWidth = cropHeight * newAspect;
    }

    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;

    const pixelCrop: PixelCrop = {
      unit: 'px',
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };

    setCrop(pixelCrop);
    setCompletedCrop(pixelCrop);
  };

  const getCroppedImg = (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropX = Math.round(pixelCrop.x * scaleX);
    const cropY = Math.round(pixelCrop.y * scaleY);
    const cropWidth = Math.max(Math.round(pixelCrop.width * scaleX), 1);
    const cropHeight = Math.max(Math.round(pixelCrop.height * scaleY), 1);

    // Limit maximum dimensions to 1200px for sharp exam diagrams without massive payloads
    const maxDim = 1200;
    let finalWidth = cropWidth;
    let finalHeight = cropHeight;
    if (finalWidth > maxDim || finalHeight > maxDim) {
      if (finalWidth > finalHeight) {
        finalHeight = Math.round((finalHeight * maxDim) / finalWidth);
        finalWidth = maxDim;
      } else {
        finalWidth = Math.round((finalWidth * maxDim) / finalHeight);
        finalHeight = maxDim;
      }
    }

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve('');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      finalWidth,
      finalHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve('');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.88);
    });
  };

  const handleCrop = async () => {
    if (!imageRef) return;
    setIsProcessing(true);
    try {
      // Determine final active pixel crop box
      const targetCrop = (completedCrop && completedCrop.width > 0 && completedCrop.height > 0)
        ? completedCrop
        : convertToPixelCrop(
            crop || { unit: '%', width: 100, height: 100, x: 0, y: 0 },
            imageRef.width,
            imageRef.height
          );

      const croppedImageUrl = await getCroppedImg(imageRef, targetCrop);
      if (croppedImageUrl) {
        onCropComplete(croppedImageUrl);
      }
      onClose();
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl">
        <DialogHeader className="shrink-0 pb-1">
          <div className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-base font-bold text-slate-900">Crop Image</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Drag the corner handles or edges to adjust the crop box.
          </DialogDescription>
        </DialogHeader>

        {/* Aspect Ratio Presets Toolbar */}
        <div className="flex items-center gap-2 pt-1 pb-2 shrink-0 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-600 shrink-0">Ratio:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs shrink-0">
            <button
              type="button"
              onClick={() => setAspectPreset(undefined)}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                aspect === undefined ? "bg-white text-blue-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setAspectPreset(1)}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                aspect === 1 ? "bg-white text-blue-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              )}
            >
              1:1
            </button>
            <button
              type="button"
              onClick={() => setAspectPreset(4 / 3)}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                aspect === 4 / 3 ? "bg-white text-blue-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              )}
            >
              4:3
            </button>
            <button
              type="button"
              onClick={() => setAspectPreset(16 / 9)}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                aspect === 16 / 9 ? "bg-white text-blue-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              )}
            >
              16:9
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAspectPreset(undefined)}
            className="text-xs text-slate-500 hover:text-slate-800 h-7 ml-auto shrink-0 flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>

        {/* Cropper Viewport with constrained height and overflow protection */}
        <div className="flex-1 min-h-[200px] sm:min-h-[300px] max-h-[45vh] sm:max-h-[52vh] flex justify-center items-center overflow-auto p-2 sm:p-3 bg-slate-950/5 rounded-xl border border-slate-200">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              keepSelection
              className="max-h-[43vh] sm:max-h-[48vh] max-w-full"
            >
              <img
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{
                  maxHeight: '43vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
                className="select-none mx-auto"
              />
            </ReactCrop>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3 sm:pt-4 flex items-center justify-between sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose} type="button" disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleCrop} 
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5"
            type="button"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cropping...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Crop & Save</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
