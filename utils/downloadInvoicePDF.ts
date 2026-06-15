// utils/downloadInvoicePDF.ts
import html2pdf from "html2pdf.js";

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

  const grandTotal =
    invoice.totalAmount ??
    rawItems.reduce((s: number, p: any) => s + (p.salePrice ?? 0) * (p.quantity ?? 1), 0);

  // 2. Extract image URLs
  const itemsWithUrl = rawItems.map((item: any) => {
    let imageUrl = "";
    const imgs = item.product?.images;
    if (Array.isArray(imgs) && imgs.length > 0) {
      imageUrl = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url ?? "";
    } else if (item.product?.image) {
      imageUrl = item.product.image;
    }
    return {
      productName: item.product?.name || "Deleted Product",
      quantity: item.quantity ?? 0,
      salePrice: item.salePrice ?? 0,
      description: item.description || "",
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
        ? `<div style="display:flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;background:#ffffff;flex-shrink:0;">
             <img src="${b64}" style="width:100%;height:100%;object-fit:cover;" alt="${esc(item.productName)}" />
           </div>`
        : `<div style="display:flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:10px;font-weight:500;flex-shrink:0;">No Image</div>`;

      const noteDesc = esc(item.description);

      const textBlock = `
        <div style="flex:1;margin-left:12px;">
          <div style="font-weight:600;color:#111827;font-size:13px;margin-bottom:4px;">${esc(item.productName)}</div>
          ${noteDesc && noteDesc.trim() !== "No description" && noteDesc.trim() !== "" 
            ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px;">Desc: ${noteDesc}</div>` : ""}
        </div>`;

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #f0f0f0;vertical-align:middle;">
            <div style="display:flex;align-items:center;">
              ${imgBlock}
              ${textBlock}
            </div>
           </td>
          <td style="padding:12px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:middle;font-weight:500;font-size:13px;color:#374151;">
            ${item.quantity}
           </td>
          <td style="padding:12px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:middle;font-weight:600;font-size:13px;color:#059669;">
            Rs. ${item.salePrice.toLocaleString()}
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
  const invoiceType = invoice.type || "Sell";

  // 5. Clean, centered HTML with proper sizing
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;">
      <div style="max-width:650px;width:100%;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;position:relative;">

        <!-- Watermark Background -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:90px;font-weight:900;color:rgba(0,0,0,0.03);white-space:nowrap;pointer-events:none;user-select:none;z-index:0;">
          ${invoiceType === "Repair" ? "REPAIR" : "SELL"}
        </div>

        <!-- INNER CONTENT -->
        <div style="padding:28px 32px;position:relative;z-index:1;">

          <!-- HEADER -->
          <div style="text-align:center;border-bottom:2px solid #1f2937;padding-bottom:16px;margin-bottom:24px;">
            <div style="font-size:24px;font-weight:700;color:#111827;margin-bottom:4px;">M S ELECTRIC AND ELECTRONICS</div>
            <div style="font-size:12px;color:#6b7280;margin:4px 0;">Shop C15/C17, Quality Godown, Shershah</div>
            <div style="font-size:12px;color:#6b7280;margin:4px 0;">Phone: Adnan +92 333 3424083</div>
            <div style="font-size:16px;font-weight:700;letter-spacing:3px;margin-top:12px;color:#1f2937;">
              ${invoiceType === "Repair" ? "REPAIR INVOICE" : "SALES INVOICE"}
            </div>
          </div>

          <!-- META INFO -->
          <div style="display:flex;justify-content:space-between;margin-bottom:24px;font-size:12px;background:#f9fafb;padding:12px 16px;border-radius:8px;border:1px solid #e5e7eb;">
            <div><span style="font-weight:600;color:#4b5563;">Invoice No:</span> <span style="color:#111827;">${invoiceNo}</span></div>
            <div><span style="font-weight:600;color:#4b5563;">Date:</span> <span style="color:#111827;">${dateStr}</span></div>
          </div>

          <!-- ITEMS TABLE -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#4b5563;">Item</th>
                <th style="padding:12px;text-align:center;font-size:12px;font-weight:600;color:#4b5563;width:70px;">Qty</th>
                <th style="padding:12px;text-align:right;font-size:12px;font-weight:600;color:#4b5563;width:120px;">Price</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:40px;text-align:center;color:#9ca3af;">No items found</td></tr>'}</tbody>
          </table>

          <!-- TOTAL & CUSTOMER NAME -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:2px solid #1f2937;margin-bottom:24px;">
            <div style="font-size:14px;font-weight:600;color:#374151;text-align:left;">
              Customer: <span style="font-weight:700;color:#111827;">${esc(invoice.customerName || "Walk-in Customer")}</span>
            </div>
            <div style="font-size:18px;font-weight:700;color:#111827;text-align:right;">
              Total Payable: <span style="color:#059669;">PKR ${grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <!-- FOOTER -->
          <div style="text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
            <div style="margin-bottom:4px;">Thank you for your purchase!</div>
            <div style="font-weight:500;color:#6b7280;">Seller: ${seller}</div>
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

  const opts = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename: `Invoice_${invoiceNo}.pdf`,
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