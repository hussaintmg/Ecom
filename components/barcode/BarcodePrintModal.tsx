"use client";

import React, { useState } from "react";
import { X, Printer, Download, Package, RefreshCw, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { generateBarcodeLabelSVG } from "@/utils/barcodeGenerator";

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || products.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const productIds = products.map((p) => p._id);
      const res = await fetch("/api/products/barcodes/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });

      if (!res.ok) throw new Error("Failed to generate barcode ZIP archive");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `barcodes_${products.length}_items.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Error downloading barcodes ZIP");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      {/* Print-specific style block */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-barcodes-area,
          #printable-barcodes-area * {
            visibility: visible;
          }
          #printable-barcodes-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10px;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .barcode-sticker-print {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 12px;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Print / Download Barcodes</h2>
              <p className="text-xs text-muted-foreground">
                {products.length} {products.length === 1 ? "product" : "products"} selected for sticker labels
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="gap-1.5 text-xs font-bold"
            >
              {downloadingZip ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Download size={14} />
              )}
              {downloadingZip ? "Packaging..." : "Download ZIP"}
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-bold shadow-md shadow-primary/20"
            >
              <Printer size={14} /> Print Labels
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10 custom-scrollbar">
          <div
            id="printable-barcodes-area"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            {products.map((product, idx) => {
              const barcodeValue = product.barcode?.trim() || product._id.toString();
              const svgString = generateBarcodeLabelSVG({
                barcodeValue,
                productName: product.name,
                price: product.price,
                currency: "PKR",
                storeName: "MODERN ECOM",
                width: 320,
                height: 190,
                barHeight: 55,
              });

              return (
                <div
                  key={product._id || idx}
                  className="barcode-sticker-print bg-white p-3 rounded-xl border border-border shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
                >
                  <div
                    className="w-full flex justify-center"
                    dangerouslySetInnerHTML={{ __html: svgString }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Formatted for standard sticker sheets (Code 128 Standard)</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BarcodePrintModal;
