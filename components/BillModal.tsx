// components/BillModal.tsx (Advanced version with loading state)
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
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      filename: `${billData.type === "Credit" ? "Credit_Receipt" : "Invoice"}_${billData.invoiceNo}.pdf`,
      image: {
        type: "jpeg" as const,
        quality: 0.98,
      },
      html2canvas: {
        scale: 2,
        letterRendering: true,
        useCORS: true,
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
    
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${billData.invoiceNo}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.onafterprint = () => {
        setPrinting(false);
        printWindow.close();
      };
      printWindow.print();
    } else {
      setPrinting(false);
      alert("Please allow pop-ups to print the invoice.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b dark:border-gray-700 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {billData.type === "Credit" ? "Credit Receipt Preview" : "Invoice Preview"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
              className="gap-2 text-white"
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
              className="gap-2 text-white"
              variant="outline"
              disabled={downloading || printing}
            >
              {printing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              {printing ? "Preparing..." : "Print Invoice"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
