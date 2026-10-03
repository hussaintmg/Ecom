// utils/downloadInvoicePDF.ts
import html2pdf from "html2pdf.js";
import { getInvoicePricing } from "@/utils/salePricing";

// ── helpers ──────────────────────────────────────────────────────────────────

const esc = (s: string) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toBase64 = async (url: string): Promise<string> => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  try {
    // Try direct fetch first (for same-origin or CORS-enabled images)
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return "";
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    // If direct fetch fails, try proxy
    try {
      const proxyUrl = `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return "";
      const blob = await res.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  }
};

// ── main export ───────────────────────────────────────────────────────────────

export const downloadInvoicePDF = async (invoice: any) => {
  // 1. Normalise items
  const rawItems: any[] = invoice.products?.length
    ? invoice.products
    : [
        {
          product: invoice.product,
          quantity: invoice.quantity,
          salePrice: invoice.salePrice,
          description: invoice.description || "",
        },
      ];

  const { items: pricedItems, totalAmount: grandTotal } = getInvoicePricing({ ...invoice, products: rawItems });

  // 2. Extract image URLs and details
  const invoiceType = invoice.type || "Sell";
  const isCredit = invoiceType === "Credit";
  const isRepair = invoiceType === "Repair";
  const isCustomerRepair = isRepair && invoice.repairSource === "customer";

  const itemsWithUrl = pricedItems.map((item: any) => {
    let imageUrl = "";
    const imgs = item.product?.images;
    if (Array.isArray(imgs) && imgs.length > 0) {
      imageUrl = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url ?? "";
    } else if (item.product?.image) {
      imageUrl = item.product.image;
    }
    return {
      productName: item.product?.name || item.productName || "Product",
      quantity: item.quantity ?? 1,
      salePrice: item.salePrice ?? 0,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      description: item.defectDescription || item.description || "",
      productDescription: item.product?.description || "",
      imageUrl,
    };
  });

  // 3. Convert all images to base64 in parallel
  const b64s = await Promise.all(itemsWithUrl.map((it) => toBase64(it.imageUrl)));

  // 4. Build table rows with better image handling
  const rows = itemsWithUrl
    .map((item, i) => {
      const b64 = b64s[i];
      const imgBlock = b64
        ? `<div style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:6px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff;flex-shrink:0;">
             <img src="${b64}" style="width:100%;height:100%;object-fit:cover;" alt="${esc(item.productName)}" />
           </div>`
        : `<div style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:6px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:9px;font-weight:500;flex-shrink:0;">No Image</div>`;

      const noteDesc = esc(item.description);

      const textBlock = `
        <div style="flex:1;margin-left:10px;">
          <div style="font-weight:600;color:#111827;font-size:12px;margin-bottom:2px;">${esc(item.productName)}</div>
          ${noteDesc && noteDesc.trim() !== "No description" && noteDesc.trim() !== "" 
            ? `<div style="font-size:10px;color:#d97706;font-weight:500;">Defect/Issue: ${noteDesc}</div>` : ""}
        </div>`;

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;vertical-align:middle;">
            <div style="display:flex;align-items:center;">
              ${imgBlock}
              ${textBlock}
            </div>
           </td>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:middle;font-weight:600;font-size:12px;color:#374151;">
            ${item.quantity}
           </td>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:middle;font-weight:600;font-size:12px;color:#059669;">
            Rs. ${item.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
           </td>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:middle;font-weight:700;font-size:12px;color:#059669;">
            Rs. ${item.lineTotal.toLocaleString()}
           </td>
        </tr>`;
    })
    .join("");

  const invoiceNo = invoice.invoiceNo || `INV-${invoice._id?.slice(-8) || "00000000"}`;
  const dateStr = invoice.createdAt 
    ? new Date(invoice.createdAt).toLocaleString("en-PK", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date().toLocaleString("en-PK", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
  const seller = esc(invoice.soldBy?.name || "M S ELECTRIC AND ELECTRONICS");

  // Extra customer lines, printed under the name — only what was filled in.
  const customerLines: string[] = [
    invoice.customerPhone ? `Phone: ${invoice.customerPhone}` : "",
    invoice.customerEmail ? `Email: ${invoice.customerEmail}` : "",
    [invoice.customerAddress, invoice.customerCity].filter(Boolean).join(", "),
  ].filter(Boolean);

  const documentTitle = isCredit
    ? "CREDIT SALE RECEIPT"
    : isRepair
      ? (isCustomerRepair ? "CUSTOMER REPAIR RECEIPT" : "REPAIR DISPATCH CHALLAN")
      : "SALES INVOICE";

  const watermarkText = isCredit 
    ? "CREDIT" 
    : isRepair 
      ? (isCustomerRepair ? "CUSTOMER REPAIR" : "CHALLAN") 
      : "INVOICE";

  // 5. Clean, centered HTML with proper sizing without 100vh stretching
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;padding:16px;display:flex;justify-content:center;align-items:flex-start;">
      <div style="max-width:650px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;position:relative;">

        <!-- Watermark Background -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(0,0,0,0.03);white-space:nowrap;pointer-events:none;user-select:none;z-index:0;letter-spacing:4px;">
          ${watermarkText}
        </div>

        <!-- INNER CONTENT -->
        <div style="padding:24px 28px;position:relative;z-index:1;">

          <!-- HEADER -->
          <div style="text-align:center;border-bottom:2px solid #1f2937;padding-bottom:14px;margin-bottom:20px;">
            <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:0.5px;margin-bottom:3px;">M S ELECTRIC AND ELECTRONICS</div>
            <div style="font-size:11px;color:#6b7280;margin:2px 0;">Shop C15/C17, Quality Godown, Shershah, Karachi</div>
            <div style="font-size:11px;color:#6b7280;margin:2px 0;">Contact: Adnan (+92 333 3424083)</div>
            <div style="font-size:14px;font-weight:800;letter-spacing:2.5px;margin-top:10px;color:#1f2937;text-transform:uppercase;">
              ${documentTitle}
            </div>
          </div>

          <!-- META INFO -->
          <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:11px;background:#f9fafb;padding:10px 14px;border-radius:8px;border:1px solid #e5e7eb;">
            <div><span style="font-weight:600;color:#4b5563;">${isRepair ? "Challan / Inv No" : isCredit ? "Receipt No" : "Invoice No"}:</span> <span style="color:#111827;font-weight:700;">${invoiceNo}</span></div>
            <div><span style="font-weight:600;color:#4b5563;">Date:</span> <span style="color:#111827;font-weight:600;">${dateStr}</span></div>
          </div>

          <!-- PARTY DETAILS (CUSTOMER / VENDOR) -->
          <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:20px;padding:12px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;">
            <div style="flex:1;">
              <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#64748b;margin-bottom:4px;">
                ${isRepair ? (isCustomerRepair ? "Customer Information" : "Sender / Store Details") : "Billed To"}
              </div>
              <div style="font-weight:700;color:#0f172a;font-size:13px;">${esc(invoice.customerName || (isCustomerRepair ? "Walk-in Customer" : "M S Electric Store Defective Stock"))}</div>
              ${customerLines.map(line => `<div style="color:#475569;margin-top:2px;font-size:11px;">${esc(line)}</div>`).join("")}
            </div>

            ${isRepair && invoice.repairVendor?.name ? `
            <div style="flex:1;text-align:right;">
              <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#64748b;margin-bottom:4px;">
                Assigned Repair Vendor
              </div>
              <div style="font-weight:700;color:#0f172a;font-size:13px;">${esc(invoice.repairVendor.name)}</div>
              ${invoice.repairVendor.phone ? `<div style="color:#475569;margin-top:2px;font-size:11px;">Ph: ${esc(invoice.repairVendor.phone)}</div>` : ""}
              ${invoice.repairVendor.address ? `<div style="color:#475569;margin-top:2px;font-size:11px;">${esc(invoice.repairVendor.address)}</div>` : ""}
            </div>` : ""}
          </div>

          <!-- ITEMS TABLE -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;">Product & Details</th>
                <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;color:#334155;width:60px;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#334155;width:95px;text-transform:uppercase;letter-spacing:0.5px;">${isRepair ? "Est. Rate" : "Rate"}</th>
                <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;color:#334155;width:110px;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="4" style="padding:30px;text-align:center;color:#9ca3af;">No items found</td></tr>'}</tbody>
          </table>

          <!-- TOTAL AMOUNT -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:2px solid #1f2937;margin-bottom:20px;">
            <div style="font-size:12px;color:#64748b;">
              Total Items: <span style="font-weight:700;color:#0f172a;">${itemsWithUrl.reduce((acc, it) => acc + (it.quantity || 1), 0)}</span>
            </div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;text-align:right;">
              ${isRepair ? "Est. Repair Total" : isCredit ? "Total Credit" : "Total Payable"}: <span style="color:#059669;">PKR ${grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <!-- FOOTER / TERMS -->
          <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;line-height:1.5;">
            <div style="margin-bottom:3px;font-weight:500;color:#64748b;">
              ${isRepair 
                ? (isCustomerRepair 
                    ? "Please present this receipt when collecting your repaired item. Diagnostic and service warranty terms apply."
                    : "Official repair dispatch challan for vendor processing. Please inspect items upon receipt.")
                : isCredit 
                  ? "This receipt records items provided on credit. Payment terms apply." 
                  : "Thank you for your purchase!"}
            </div>
            <div style="font-weight:600;color:#475569;">Authorized Signatory: ${seller}</div>
          </div>
        </div>
      </div>
    </div>`;

  // 6. Create container for PDF generation
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: white;
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  // Get the actual invoice element
  const invoiceElement = container.firstElementChild as HTMLElement;

  // Wait for images to load
  const images = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );

  // Add a small delay to ensure rendering is complete
  await new Promise(resolve => setTimeout(resolve, 100));

  const filenamePrefix = isRepair 
    ? (isCustomerRepair ? "Customer_Repair" : "Repair_Challan") 
    : (isCredit ? "Credit_Receipt" : "Invoice");

  const opts = {
    margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
    filename: `${filenamePrefix}_${invoiceNo}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
    },
    jsPDF: {
      unit: "in" as const,
      format: "a4" as const,
      orientation: "portrait" as const,
    },
  };

  try {
    await html2pdf().set(opts).from(invoiceElement).save();
  } catch (err) {
    console.error("PDF generation error:", err);
    throw err;
  } finally {
    document.body.removeChild(container);
  }
};
