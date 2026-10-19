import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import qrcode

def generate_pdf_receipt(booking_data):
    """
    Generate an official, itemised laboratory tax invoice and payment receipt.
    booking_data is a dict containing all booking, patient, test, and verified payment fields.
    Returns bytes in a BytesIO buffer.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F294A')
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#5A6E85')
    )
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#133E6E')
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1C2833')
    )
    bold_body = ParagraphStyle(
        'BodyDarkBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1C2833')
    )
    right_body = ParagraphStyle(
        'BodyRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#1C2833')
    )
    right_bold = ParagraphStyle(
        'BodyRightBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#0F294A')
    )
    status_paid_style = ParagraphStyle(
        'StatusPaid',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0F5132')
    )

    elements = []

    # 1. Header with Lab / Tenant Details
    company_name = booking_data.get('company_name_snapshot') or 'Apollo Diagnostics'
    brand_color_hex = booking_data.get('brand_color') or '#1769AA'

    header_data = [
        [
            Paragraph(f"<b>BLOODLAB DIAGNOSTIC SERVICES</b><br/><font size='8' color='#5A6E85'>Accredited Clinical Pathology & Diagnostic Network<br/>Laboratory Partner: <b>{company_name}</b><br/>Reg Address: Central Reference Lab, Anna Salai, Chennai 600002<br/>Helpline: +91 1800-425-0011 | Email: support@bloodlab.com</font>", body_style),
            Paragraph(f"<font size='16' color='{brand_color_hex}'><b>TAX INVOICE & RECEIPT</b></font><br/><font size='8' color='#5A6E85'>GSTIN: 33AAAAA0000A1Z5<br/>Original for Recipient</font>", right_body)
        ]
    ]
    header_table = Table(header_data, colWidths=[105 * mm, 77 * mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor(brand_color_hex), spaceAfter=8, spaceBefore=4))

    # 2. Invoice & Patient Info Box
    invoice_id = booking_data.get('invoice_id') or f"INV-{booking_data.get('id', 1):06d}"
    booking_ref = booking_data.get('booking_reference') or f"BL-{booking_data.get('id', 1):04d}"
    booking_date = booking_data.get('appointment_date') or str(datetime.now().date())
    patient_name = booking_data.get('patient_name') or 'N/A'
    phone = booking_data.get('phone') or 'N/A'
    email = booking_data.get('patient_email') or 'N/A'
    address = booking_data.get('collection_address') or 'Home Collection'
    slot = booking_data.get('appointment_slot') or 'Morning Slot'

    meta_data = [
        [
            Paragraph("<b>PATIENT & COLLECTION DETAILS</b>", h2_style),
            Paragraph("<b>INVOICE & BOOKING METADATA</b>", h2_style)
        ],
        [
            Paragraph(f"<b>Patient Name:</b> {patient_name}<br/><b>Mobile:</b> {phone}<br/><b>Email:</b> {email}<br/><b>Collection Address:</b> {address}<br/><b>Appointment Slot:</b> {slot} ({booking_date})", body_style),
            Paragraph(f"<b>Invoice Number:</b> {invoice_id}<br/><b>Booking Reference:</b> {booking_ref}<br/><b>Booking Date:</b> {booking_data.get('created_at', booking_date)[:10]}<br/><b>Diagnostic Provider:</b> {company_name}<br/><b>Collection Status:</b> {booking_data.get('collection_status', 'Booked')}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[92 * mm, 90 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 3. Itemized Test Table
    test_name = booking_data.get('test_name_snapshot') or 'Diagnostic Test'
    category = booking_data.get('test_category_snapshot') or 'Pathology'
    sample_type = booking_data.get('sample_type_snapshot') or 'Blood'
    base_price = float(booking_data.get('base_price_snapshot') or 0.0)
    discount_pct = float(booking_data.get('discount_percent_snapshot') or 0.0)
    discount_amt = float(booking_data.get('discount_amount_snapshot') or 0.0)
    final_amt = float(booking_data.get('final_amount_snapshot') or (base_price - discount_amt))

    items_data = [
        [
            Paragraph("<b>#</b>", bold_body),
            Paragraph("<b>Test Name & Diagnostic Details</b>", bold_body),
            Paragraph("<b>Sample Type</b>", bold_body),
            Paragraph("<b>Price (INR)</b>", right_bold),
            Paragraph("<b>Disc.</b>", right_bold),
            Paragraph("<b>Total (INR)</b>", right_bold)
        ],
        [
            Paragraph("1", body_style),
            Paragraph(f"<b>{test_name}</b><br/><font size='8' color='#64748B'>Category: {category}</font>", body_style),
            Paragraph(sample_type, body_style),
            Paragraph(f"₹{base_price:,.2f}", right_body),
            Paragraph(f"{discount_pct:.0f}%<br/><font size='7' color='#059669'>(-₹{discount_amt:,.2f})</font>" if discount_amt > 0 else "0%", right_body),
            Paragraph(f"<b>₹{final_amt:,.2f}</b>", right_bold)
        ]
    ]

    items_table = Table(items_data, colWidths=[8 * mm, 74 * mm, 36 * mm, 22 * mm, 20 * mm, 22 * mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (3,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 8))

    # 4. Total Calculation and Payment Verification Box
    pay_status = str(booking_data.get('payment_status', 'unpaid')).upper()
    pay_method = str(booking_data.get('payment_method', 'UPI')).upper()
    txn_ref = booking_data.get('transaction_reference') or 'Manual Admin Reconciliation'
    verified_at = booking_data.get('payment_verified_at') or str(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # Generate small QR code for receipt authentication
    qr_text = f"BLOODLAB INVOICE: {invoice_id} | AMOUNT: INR {final_amt:.2f} | STATUS: {pay_status} | UTR: {txn_ref} | PATIENT: {patient_name}"
    qr_img = qrcode.make(qr_text, box_size=3, border=1)
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format='PNG')
    qr_buf.seek(0)
    qr_flowable = Image(qr_buf, width=24 * mm, height=24 * mm)

    summary_data = [
        [
            Paragraph("<b>PAYMENT CONFIRMATION & VERIFICATION</b>", h2_style),
            Paragraph("<b>Subtotal (List Price):</b>", right_body),
            Paragraph(f"₹{base_price:,.2f}", right_body)
        ],
        [
            Paragraph(f"<b>Payment Status:</b> <font color='#059669'><b>{pay_status} (Verified)</b></font><br/><b>Payment Method:</b> {pay_method}<br/><b>Transaction Ref / UTR:</b> {txn_ref}<br/><b>Verified On:</b> {verified_at}", body_style),
            Paragraph("<b>Diagnostic Discount:</b>", right_body),
            Paragraph(f"- ₹{discount_amt:,.2f}", right_body)
        ],
        [
            qr_flowable,
            Paragraph("<b>GRAND TOTAL PAID:</b>", right_bold),
            Paragraph(f"<font size='12' color='#0F5132'><b>₹{final_amt:,.2f}</b></font>", right_bold)
        ]
    ]

    summary_table = Table(summary_data, colWidths=[96 * mm, 50 * mm, 36 * mm])
    summary_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#94A3B8')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F0FDF4')),
        ('BACKGROUND', (1,2), (-1,2), colors.HexColor('#DCFCE7')),
        ('INNERGRID', (1,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 14))

    # 5. Terms, Notes & Authorized Stamp
    terms_text = Paragraph(
        "<b>Terms & Information:</b><br/>"
        "1. This is a computer-generated tax invoice and verified payment receipt issued by BloodLab Diagnostic Services.<br/>"
        "2. Home sample collection will be conducted by an authorized phlebotomist during the selected slot.<br/>"
        "3. Laboratory reports will be available online and sent to the registered email within the committed turnaround time.<br/>"
        "4. For customer support or test queries, please contact <b>+91 1800-425-0011</b> or email <b>support@bloodlab.com</b>.",
        subtitle_style
    )
    auth_sign = Paragraph(
        "<br/><br/><br/>________________________________<br/><b>Authorized Laboratory Signatory</b><br/><font size='7' color='#64748B'>BloodLab Quality Assurance & Accounts</font>",
        ParagraphStyle('AuthSign', parent=styles['Normal'], alignment=TA_RIGHT, fontSize=8, leading=11)
    )

    footer_table = Table([[terms_text, auth_sign]], colWidths=[118 * mm, 64 * mm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(KeepTogether(footer_table))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

if __name__ == "__main__":
    test_booking = {
        "id": 101,
        "booking_reference": "BL-20261018-7821",
        "invoice_id": "INV-20261018-0101",
        "patient_name": "Vithunraj Sakthikumaran",
        "phone": "+91 9876543210",
        "patient_email": "vithunraj@example.com",
        "collection_address": "Flat 4B, Emerald Heights, Anna Nagar, Chennai - 600040",
        "appointment_date": "2026-10-19",
        "appointment_slot": "07:30 AM - 08:30 AM",
        "company_name_snapshot": "Apollo Diagnostics",
        "brand_color": "#1769AA",
        "test_name_snapshot": "Complete Blood Count (CBC) with ESR",
        "test_category_snapshot": "Blood tests",
        "sample_type_snapshot": "EDTA Whole Blood (3 ml)",
        "base_price_snapshot": 350.0,
        "discount_percent_snapshot": 10.0,
        "discount_amount_snapshot": 35.0,
        "final_amount_snapshot": 315.0,
        "payment_status": "paid",
        "payment_method": "UPI",
        "transaction_reference": "UPI/428901928472",
        "payment_verified_at": "2026-10-18 22:30:00",
        "collection_status": "Assigned"
    }
    pdf_bytes = generate_pdf_receipt(test_booking)
    with open("sample_receipt.pdf", "wb") as f:
        f.write(pdf_bytes)
    print(f"Sample PDF receipt generated successfully: {len(pdf_bytes)} bytes.")
