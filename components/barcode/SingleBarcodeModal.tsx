"use client";

import React from "react";
import { X, Printer, Download, ScanBarcode } from "lucide-react";
import Button from "@/components/ui/Button";
import { generateBarcodeLabelSVG } from "@/utils/barcodeGenerator";

interface SingleBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
}

const SingleBarcodeModal: React.FC<SingleBarcodeModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen || !product) return null;

  const barcodeValue = product.barcode?.trim() || product._id.toString();
  const svgString = generateBarcodeLabelSVG({
    barcodeValue,
    productName: product.name,
    price: product.price,
    currency: "PKR",
    storeName: "MODERN ECOM",
    width: 380,
    height: 220,
    barHeight: 65,
  });

  const handleDownloadSVG = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode_${product.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print barcode");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${product.name}</title>
          <style>
            @page { margin: 10mm; size: auto; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
            .label-wrapper { width: 380px; }
          </style>
        </head>
        <body>
          <div class="label-wrapper">${svgString}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ScanBarcode size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">{product.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">Code: {barcodeValue}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barcode Display */}
        <div className="p-6 flex flex-col items-center justify-center bg-muted/10">
          <div
            className="w-full max-w-[340px] shadow-sm rounded-xl overflow-hidden border bg-white p-2"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={handleDownloadSVG} className="gap-1.5 text-xs font-semibold">
            <Download size={14} /> Download SVG
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-semibold">
            <Printer size={14} /> Print Label
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SingleBarcodeModal;
