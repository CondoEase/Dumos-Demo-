import type { Handler } from '@netlify/functions'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getServiceClient, getUserAndRole, ok, err } from './_supabase'

async function generateReceiptPdf(params: {
  receiptNumber: string
  residentName: string
  unitNumber: string
  period: string
  amountCents: number
  method: string
  paidAt: string
  buildingName: string
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const font = await doc.embedFont(StandardFonts.Helvetica)

  const navy = rgb(0.122, 0.165, 0.267)
  const teal = rgb(0.18, 0.49, 0.42)
  const gray = rgb(0.42, 0.45, 0.5)
  const black = rgb(0.1, 0.1, 0.1)

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: navy })
  page.drawText(params.buildingName, { x: 40, y: height - 42, font: fontBold, size: 18, color: rgb(1, 1, 1) })
  page.drawText('PAYMENT RECEIPT', { x: 40, y: height - 62, font, size: 10, color: rgb(0.8, 0.85, 0.9) })

  // Receipt number (top right)
  page.drawText(`Receipt #${params.receiptNumber}`, { x: width - 180, y: height - 45, font: fontBold, size: 11, color: rgb(1, 1, 1) })
  page.drawText(new Date(params.paidAt).toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo' }), { x: width - 180, y: height - 62, font, size: 10, color: rgb(0.8, 0.85, 0.9) })

  // Teal accent line
  page.drawRectangle({ x: 0, y: height - 86, width, height: 6, color: teal })

  // Details section
  const startY = height - 130
  const lineH = 26

  function row(label: string, value: string, y: number) {
    page.drawText(label, { x: 40, y, font, size: 11, color: gray })
    page.drawText(value, { x: 200, y, font: fontBold, size: 11, color: black })
  }

  row('Resident Name:', params.residentName, startY)
  row('Unit Number:', params.unitNumber, startY - lineH)
  row('Period:', params.period, startY - lineH * 2)
  row('Payment Method:', params.method === 'payhere' ? 'Online (PayHere)' : 'Bank Transfer', startY - lineH * 3)
  row('Date Paid:', new Date(params.paidAt).toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo', year: 'numeric', month: 'long', day: 'numeric' }), startY - lineH * 4)

  // Amount box
  const boxY = startY - lineH * 6
  page.drawRectangle({ x: 40, y: boxY, width: width - 80, height: 56, color: rgb(0.97, 0.99, 0.98), borderColor: teal, borderWidth: 1.5 })
  page.drawText('Amount Paid', { x: 60, y: boxY + 34, font, size: 11, color: gray })
  const amountStr = `Rs. ${(params.amountCents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
  page.drawText(amountStr, { x: 60, y: boxY + 12, font: fontBold, size: 22, color: teal })

  // Footer
  page.drawLine({ start: { x: 40, y: 80 }, end: { x: width - 40, y: 80 }, thickness: 0.5, color: gray })
  page.drawText('This is a computer-generated receipt and does not require a signature.', {
    x: 40, y: 60, font, size: 9, color: gray,
  })
  page.drawText(`Generated: ${new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}`, {
    x: 40, y: 44, font, size: 9, color: gray,
  })

  return doc.save()
}

export const handler: Handler = async (event) => {
  const supabase = getServiceClient()
  const { user, role } = await getUserAndRole(event.headers.authorization, supabase)

  // Allow admin OR called internally (service-to-service)
  if (!user && !event.headers['x-internal-key']) return err('Unauthorized', 401) as unknown as Awaited<ReturnType<Handler>>

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body ?? '{}')
    const { payment_id } = body
    if (!payment_id) return err('payment_id is required') as unknown as Awaited<ReturnType<Handler>>

    // Check for existing receipt
    const { data: existing } = await supabase.from('receipts').select('*').eq('payment_id', payment_id).single()
    if (existing) return ok({ pdf_url: existing.pdf_url, receipt_number: existing.receipt_number }) as unknown as Awaited<ReturnType<Handler>>

    // Fetch payment + invoice + unit + profile
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*, invoice:invoice_id(*, unit:unit_id(*, owner:owner_profile_id(*)))')
      .eq('id', payment_id)
      .single()
    if (payErr || !payment) return err('Payment not found') as unknown as Awaited<ReturnType<Handler>>

    const invoice = payment.invoice as { period: string; amount_due_cents: number; unit: { unit_number: string; owner: { full_name: string } } }
    const unitNumber = invoice?.unit?.unit_number ?? 'N/A'
    const residentName = invoice?.unit?.owner?.full_name ?? 'Resident'

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`
    const buildingName = process.env.BUILDING_NAME ?? 'CondoEase Residencies'

    const period = new Date(invoice.period + '-01').toLocaleDateString('en-LK', { year: 'numeric', month: 'long' })

    const pdfBytes = await generateReceiptPdf({
      receiptNumber,
      residentName,
      unitNumber,
      period,
      amountCents: payment.amount_cents,
      method: payment.method,
      paidAt: payment.paid_at ?? new Date().toISOString(),
      buildingName,
    })

    // Upload to Supabase Storage
    const fileName = `receipts/${receiptNumber}.pdf`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: false })
    if (uploadErr) return err(`Storage upload failed: ${uploadErr.message}`) as unknown as Awaited<ReturnType<Handler>>

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)

    // Save receipt record
    const { data: receipt, error: receiptErr } = await supabase.from('receipts').insert({
      payment_id,
      pdf_url: urlData.publicUrl,
      receipt_number: receiptNumber,
    }).select().single()
    if (receiptErr) return err(receiptErr.message) as unknown as Awaited<ReturnType<Handler>>

    // Mark invoice as paid
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', (payment.invoice as { id: string }).id)

    return ok({ pdf_url: urlData.publicUrl, receipt_number: receiptNumber }) as unknown as Awaited<ReturnType<Handler>>
  }

  return err('Method not allowed', 405) as unknown as Awaited<ReturnType<Handler>>
}
