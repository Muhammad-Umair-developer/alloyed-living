// Client-only: builds a branded PDF catalog straight from live product data.
// Runs entirely in the browser via jsPDF + canvas — no server round-trip.
import { jsPDF } from "jspdf"
import type { Product } from "./data/types"

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 16
const ROW_H = 62
const ROWS_PER_PAGE = 4

interface LoadedImage {
  dataUrl: string
  width: number
  height: number
}

// Cross-origin product images (e.g. pinimg) may taint the canvas and throw on
// toDataURL — resolve(null) in that case so the catalog still renders, just
// without that one thumbnail.
function loadImageAsDataUrl(url: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0)
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.85),
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function drawCoverPage(doc: jsPDF) {
  doc.setFillColor(28, 25, 23)
  doc.rect(0, 0, PAGE_W, PAGE_H, "F")

  doc.setTextColor(214, 211, 209)
  doc.setFont("times", "italic")
  doc.setFontSize(11)
  doc.text("STEEL HOME DECOR", PAGE_W / 2, 118, { align: "center" })

  doc.setTextColor(255, 255, 255)
  doc.setFont("times", "normal")
  doc.setFontSize(36)
  doc.text("ALLOYED LIVING", PAGE_W / 2, 136, { align: "center" })

  doc.setFont("times", "italic")
  doc.setFontSize(13)
  doc.setTextColor(214, 211, 209)
  doc.text("Product Catalog", PAGE_W / 2, 150, { align: "center" })

  doc.setDrawColor(87, 83, 78)
  doc.line(PAGE_W / 2 - 12, 160, PAGE_W / 2 + 12, 160)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  doc.text(dateStr, PAGE_W / 2, 272, { align: "center" })
}

export async function generateCatalogPdf(products: Product[]): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  drawCoverPage(doc)

  const imgW = 40
  const imgH = 50
  let y = MARGIN

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    if (i % ROWS_PER_PAGE === 0) {
      doc.addPage()
      y = MARGIN
    }

    const image = await loadImageAsDataUrl(product.image)
    if (image) {
      const ratio = Math.min(imgW / image.width, imgH / image.height)
      const w = image.width * ratio
      const h = image.height * ratio
      doc.addImage(image.dataUrl, "JPEG", MARGIN + (imgW - w) / 2, y + (imgH - h) / 2, w, h)
    } else {
      doc.setDrawColor(225, 220, 214)
      doc.rect(MARGIN, y, imgW, imgH)
    }

    const textX = MARGIN + imgW + 8
    const textW = PAGE_W - textX - MARGIN

    doc.setFont("times", "normal")
    doc.setFontSize(14)
    doc.setTextColor(28, 25, 23)
    doc.text(doc.splitTextToSize(product.name, textW).slice(0, 2), textX, y + 8)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(120, 113, 108)
    doc.text(product.material.toUpperCase(), textX, y + 17)

    doc.setFontSize(9)
    doc.setTextColor(87, 83, 78)
    doc.text(doc.splitTextToSize(product.description, textW).slice(0, 3), textX, y + 24)

    doc.setFont("times", "normal")
    doc.setFontSize(12)
    doc.setTextColor(28, 25, 23)
    doc.text(`PKR ${product.price.toLocaleString()}`, textX, y + 45)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(150, 145, 140)
    doc.text(
      `H ${product.dimensions.h} · W ${product.dimensions.w} · D ${product.dimensions.d} cm`,
      textX,
      y + 51,
    )

    y += ROW_H
    if ((i + 1) % ROWS_PER_PAGE !== 0 && i !== products.length - 1) {
      doc.setDrawColor(232, 227, 221)
      doc.line(MARGIN, y - 6, PAGE_W - MARGIN, y - 6)
    }
  }

  doc.save("alloyed-living-catalog.pdf")
}
