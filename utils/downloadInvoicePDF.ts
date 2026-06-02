// utils/downloadInvoicePDF.ts

import html2pdf from "html2pdf.js";

export interface BillData {
  invoiceNo: string;
  date: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  description: string;
  sellerName?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  productImage?: string;
}

export const downloadInvoicePDF = async (invoice: any) => {
  console.log("Invoice data:", invoice); // Debug log

  // Get product image URL - multiple fallback options
  let productImageUrl = "";
  try {
    // Check different possible image locations
    if (invoice.product?.images && Array.isArray(invoice.product.images)) {
      const firstImage = invoice.product.images[0];
      if (firstImage) {
        if (typeof firstImage === "string") {
          productImageUrl = firstImage;
        } else if (firstImage.url) {
          productImageUrl = firstImage.url;
        }
      }
    }

    // If still no image, check product.image
    if (!productImageUrl && invoice.product?.image) {
      productImageUrl = invoice.product.image;
    }

    // If still no image, check invoice.image
    if (!productImageUrl && invoice.image) {
      productImageUrl = invoice.image;
    }

    console.log("Product image URL:", productImageUrl);
  } catch (err) {
    console.error("Error getting image:", err);
  }

  const billData: BillData = {
    invoiceNo: `INV-${invoice._id.slice(-8)}`,
    date: new Date(invoice.createdAt).toLocaleString("en-PK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    productName: invoice.product?.name || "Deleted Product",
    quantity: invoice.quantity,
    totalPrice: invoice.salePrice,
    description: invoice.description || "No description",
    sellerName: invoice.soldBy?.name || "Unknown",
    shopName: "MS Traders",
    shopAddress: "Shop C15/C17, Quality Godown, Shershah",
    shopPhone: "Adnan +92 333 3424083",
    productImage: productImageUrl,
  };

  // Escape HTML special characters
  const escapeHtml = (str: string) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const safeProductName = escapeHtml(billData.productName);
  const safeDescription = escapeHtml(billData.description);
  const safeSellerName = escapeHtml(billData.sellerName || "Unknown");
  const safeShopName = escapeHtml(billData.shopName || "MS Traders");
  const safeShopAddress = escapeHtml(
    billData.shopAddress || "Shop C15/C17, Quality Godown, Shershah",
  );
  const safeShopPhone = escapeHtml(
    billData.shopPhone || "Adnan +92 333 3424083",
  );

  // Create image HTML - using img tag with proper styling
  const imageHtml = billData.productImage
    ? `
    <div style="text-align: center; margin-bottom: 15px;">
      <img 
        src="${billData.productImage}" 
        alt="${safeProductName}"
        style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;"
        onerror="this.style.display='none'"
      />
    </div>
  `
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${billData.invoiceNo}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #fff;
        }
        .invoice {
          max-width: 500px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .shop-name {
          font-size: 22px;
          font-weight: bold;
          margin: 0;
        }
        .shop-details {
          font-size: 11px;
          color: #666;
          margin: 5px 0;
        }
        .invoice-title {
          font-size: 16px;
          margin-top: 10px;
        }
        .info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 12px;
          background: #f9f9f9;
          padding: 10px;
          border-radius: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f0f0f0;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .total {
          text-align: right;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 20px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
        .memo {
          font-size: 11px;
          color: #666;
          border-top: 1px dashed #ccc;
          padding-top: 10px;
          margin-bottom: 20px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #888;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div class="shop-name">${safeShopName}</div>
          <div class="shop-details">${safeShopAddress}</div>
          <div class="shop-details">Phone: ${safeShopPhone}</div>
          <div class="invoice-title">SALES INVOICE</div>
        </div>
        
        <div class="info">
          <div><strong>Invoice No:</strong> ${billData.invoiceNo}</div>
          <div><strong>Date:</strong> ${billData.date}</div>
        </div>
        
        ${imageHtml}
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Total (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${safeProductName}</td>
              <td class="text-center">${billData.quantity}</td>
              <td class="text-right">${billData.totalPrice.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="total">
          Total Payable: PKR ${billData.totalPrice.toLocaleString()}
        </div>
        
        ${
          billData.description && billData.description !== "No description"
            ? `
        <div class="memo">
          <strong>Description:</strong> ${safeDescription}
        </div>
        `
            : ""
        }
        
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Seller: ${safeSellerName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create temporary element
  const element = document.createElement("div");
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  const options = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename: `Invoice_${billData.invoiceNo}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: true,
    },
    jsPDF: {
      unit: "in" as const,
      format: "a4" as const,
      orientation: "portrait" as const,
    },
  };

  try {
    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error("PDF Error:", error);
    throw new Error("Failed to generate PDF");
  } finally {
    document.body.removeChild(element);
  }
};
