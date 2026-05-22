// components/BillModal.tsx
import React, { useRef } from "react";
import html2pdf from "html2pdf.js";
import Button from "./ui/Button";
import BillTemplate, { BillData } from "./BillTemplate";
import { X, Download } from "lucide-react";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData: BillData;
}

const BillModal: React.FC<BillModalProps> = ({ isOpen, onClose, billData }) => {
  const billRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!billRef.current) return;
    const element = billRef.current;
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Invoice_${billData.invoiceNo}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,
        letterRendering: true,
      },

      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
      },
    } as const;
    await html2pdf().set(opt).from(element).save();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Generate Bill</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white hover:text-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Hidden bill content for PDF generation */}
          <div ref={billRef}>
            <BillTemplate data={billData} />
          </div>

          {/* Download button */}
          <div className="mt-6 flex justify-center">
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download size={16} /> Download PDF Bill
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
