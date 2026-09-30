// components/BillModal.tsx
"use client";
import React, { useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import Button from "./ui/Button";
import BillTemplate, { BillData } from "./BillTemplate";
import { X, Download, Printer, Loader2 } from "lucide-react";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData: BillData;
}

const BillModal: React.FC<BillModalProps> = ({ isOpen, onClose, billData }) => {
  const billRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleDownloadPDF = async () => {
    if (!billRef.current) return;
    
    setDownloading(true);
    
    const element = billRef.current;
    const filePrefix = billData.type === "Credit"
      ? "Credit_Receipt"
      : billData.type === "Repair"
      ? (billData.repairSource === "customer" ? "Customer_Repair_Receipt" : "Repair_Challan")
      : "Invoice";

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
      filename: `${filePrefix}_${billData.invoiceNo}.pdf`,
      image: {
        type: "jpeg" as const,
        quality: 0.98,
      },
      html2canvas: {
        scale: 2,
        letterRendering: true,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      },
      jsPDF: {
        unit: "in" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
    };
    
    try {
      // Wait for all images inside the element to finish loading before saving PDF
      const images = Array.from(element.getElementsByTagName("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = billRef.current;
    if (!printContent) return;
    
    setPrinting(true);

    try {
      // Remove any existing print iframe
      const oldIframe = document.getElementById("bill-print-iframe");
      if (oldIframe) oldIframe.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "bill-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not access iframe document");

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${billData.invoiceNo || "Invoice"}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                margin: 0;
                padding: 0;
                background: #ffffff;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #bill-content {
                padding: 0 !important;
                margin: 0 !important;
                background: #ffffff !important;
              }
              #bill-card-container {
                box-shadow: none !important;
                border: none !important;
                max-width: 100% !important;
                width: 100% !important;
                border-radius: 0 !important;
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setPrinting(false);
        setTimeout(() => {
          iframe.remove();
        }, 2000);
      }, 350);
    } catch (e) {
      console.error("Print error, using window popup fallback:", e);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      setPrinting(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle = billData.type === "Credit"
    ? "Credit Receipt Preview"
    : billData.type === "Repair"
    ? (billData.repairSource === "customer" ? "Customer Repair Receipt Preview" : "Repair Challan Preview")
    : "Invoice Preview";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b dark:border-gray-700 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>{modalTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
              {billData.invoiceNo}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            disabled={downloading || printing}
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Bill Content */}
        <div className="p-6">
          <div ref={billRef}>
            <BillTemplate data={billData} />
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center gap-3">
            <Button 
              onClick={handleDownloadPDF} 
              className="gap-2 text-white font-bold cursor-pointer"
              variant="primary"
              disabled={downloading || printing}
            >
              {downloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {downloading ? "Generating PDF..." : "Download PDF"}
            </Button>
            
            <Button 
              onClick={handlePrint} 
              className="gap-2 text-white font-bold cursor-pointer"
              variant="outline"
              disabled={downloading || printing}
            >
              {printing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              {printing ? "Preparing Print..." : "Print Challan / Bill"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
