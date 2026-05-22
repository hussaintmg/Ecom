// utils/downloadInvoicePDF.ts
import html2pdf from "html2pdf.js";
import BillTemplate, { BillData } from "@/components/BillTemplate";

export const downloadInvoicePDF = async (invoice: any) => {
  const billData: BillData = {
    invoiceNo: `INV-${invoice._id.slice(-8)}`,
    date: new Date(invoice.createdAt).toLocaleString(),
    productName: invoice.product?.name || "Deleted Product",
    quantity: invoice.quantity,
    totalPrice: invoice.salePrice,
    description: invoice.description,
    sellerName: invoice.soldBy?.name || "Unknown",
    shopName : "MS Traders",
    shopAddress : "Shop C15/C17, Quality Godown, Shershah",
    shopPhone : "+92 333 3424083",
  };

  // Create a temporary div to render the bill
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.left = "-9999px";
  document.body.appendChild(div);

  // Render React component into div
  // Since we can't easily render React outside React, we'll use a simple HTML string builder
  // OR we can create a hidden component and use ref. For simplicity, let's build HTML string manually.
  // But to reuse BillTemplate, we'd need ReactDOM.render. Instead, let's create a minimal HTML template for PDF.

  // For simplicity, I'll create a simple HTML string (we can copy the structure from BillTemplate)
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; color: #000; border: 1px solid #ddd; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <h2 style="margin: 0;">${billData.shopName}</h2>
        <p style="margin: 5px 0; font-size: 12px; color: #555;">${billData.shopAddress}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #555;">Phone: ${billData.shopPhone}</p>
        <h3 style="margin: 10px 0 0;">SALES INVOICE</h3>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;position:relative;transform:translateY(-8px)">
        <div><strong>Invoice No:</strong> ${billData.invoiceNo}</div>
        <div><strong>Date:</strong> ${billData.date}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f2f2f2; border-bottom: 1px solid #ddd;">
            <th style="padding: 8px; text-align: left;position:relative;transform:translateY(-8px)">Item</th>
            <th style="padding: 8px; text-align: right;position:relative;transform:translateY(-8px)">Qty</th>
            <th style="padding: 8px; text-align: right;position:relative;transform:translateY(-8px)">Total (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; text-align: left;position:relative;transform:translateY(-8px)">${billData.productName}</td>
            <td style="padding: 8px; text-align: right;position:relative;transform:translateY(-8px)">${billData.quantity}</td>
            <td style="padding: 8px; text-align: right;position:relative;transform:translateY(-8px)">${billData.totalPrice.toLocaleString()}</td>
           </tr>
        </tbody>
      </table>
      <div style="text-align: right; margin-bottom: 20px; font-size: 18px; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px;">
        Total Amount: PKR ${billData.totalPrice.toLocaleString()}
      </div>
      ${billData.description ? `<div style="margin-bottom: 20px; font-size: 12px; color: #555; border-top: 1px dashed #ccc; padding-top: 10px;"><strong>Memo:</strong> ${billData.description}</div>` : ""}
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
        <p>Thank you for your purchase!</p>
        <p>Seller: ${billData.sellerName}</p>
      </div>
    </div>
  `;

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename: `Invoice_${billData.invoiceNo}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
  };
  
  await html2pdf().set(opt).from(htmlContent).save();
  document.body.removeChild(div);
};