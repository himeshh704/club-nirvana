import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def build_pdf():
    pdf_path = r"c:\Users\choud\.gemini\antigravity-ide\scratch\event-ticketing-system\RANGILO_RAAS_2DAY_QR_SCANNING_SYSTEM.pdf"
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    PRIMARY_COLOR = colors.HexColor("#4c1d95")
    ACCENT_COLOR = colors.HexColor("#be185d")
    TEXT_DARK = colors.HexColor("#1e293b")
    BG_LIGHT = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e1")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.white,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#fbcfe8"),
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY_COLOR,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=ACCENT_COLOR,
        spaceBefore=8,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        bulletIndent=4,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=TEXT_DARK
    )

    badge_green = ParagraphStyle('BadgeGreen', parent=table_cell_style, fontName='Helvetica-Bold', textColor=colors.HexColor("#15803d"))
    badge_red = ParagraphStyle('BadgeRed', parent=table_cell_style, fontName='Helvetica-Bold', textColor=colors.HexColor("#b91c1c"))
    badge_darkred = ParagraphStyle('BadgeDarkRed', parent=table_cell_style, fontName='Helvetica-Bold', textColor=colors.HexColor("#7f1d1d"))

    story = []

    # --- HEADER BANNER TABLE ---
    banner_data = [
        [
            Paragraph("RANGILO RAAS 2026 — 2-DAY SEASON PASS QR SCANNING SYSTEM", title_style),
        ],
        [
            Paragraph("Official Operational Blueprint | 17 - 18 October 2026 | Jodhpur, Rajasthan", subtitle_style),
        ],
        [
            Paragraph("<b>Ticketing Policy:</b> ALL PASSES ARE 2-DAY COMBO PASSES (VALID FOR BOTH OCT 17 & OCT 18. NO SINGLE-DAY PASSES SOLD)", ParagraphStyle('Meta', parent=subtitle_style, fontSize=8, textColor=colors.HexColor("#fce7f3")))
        ]
    ]

    banner_table = Table(banner_data, colWidths=[523])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [4, 4, 4, 4])
    ]))
    
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # --- 1. EXECUTIVE SUMMARY ---
    story.append(Paragraph("1. Executive Summary & Pass Policy", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceBefore=1, spaceAfter=6))
    
    exec_summary_text = (
        "<b>Rangilo Raas</b> is a premier 2-day Garba festival in Jodhpur taking place on <b>17th & 18th October 2026</b>. "
        "<b>All official passes sold for the event are 2-Day Season Combo Passes</b> (covering entry for both October 17 and October 18). "
        "No single-day passes (Day 1 only / Day 2 only) are sold. Each pass grants 1 entry on Night 1 (Oct 17) and 1 entry on Night 2 (Oct 18)."
    )
    story.append(Paragraph(exec_summary_text, body_style))
    story.append(Spacer(1, 3))

    bullets = [
        "<b>One Master QR Pass per Attendee:</b> Each attendee receives 1 digital pass. Covers entry for both Day 1 (Oct 17) and Day 2 (Oct 18).",
        "<b>Automatic Date-Aware Gate Security:</b> Scanner app enforces 1 entry per day (1 scan on October 17 + 1 scan on October 18).",
        "<b>100% Offline-First Engine:</b> Sub-50ms scanning speed per ticket without live internet connection, preventing gate queues.",
        "<b>Real-Time Anti-Passback Defense:</b> Flags duplicate entry attempts instantly across all gate scanners with exact timestamps.",
        "<b>Live Organizer Command Dashboard:</b> Live crowd counter, VIP table tracking, and gate throughput metrics."
    ]

    for bullet in bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 8))

    # --- 2. 2-DAY COMBO PASS DECISION MATRIX ---
    story.append(Paragraph("2. 2-Day Combo Pass Scan Decision Matrix", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceBefore=1, spaceAfter=6))

    # Matrix Table Data
    table_data = [
        [
            Paragraph("Scan Date", table_header_style),
            Paragraph("Day 1 Scan Status", table_header_style),
            Paragraph("Day 2 Scan Status", table_header_style),
            Paragraph("Scanner Result", table_header_style),
            Paragraph("Guard UI Alert & Action", table_header_style)
        ],
        [
            Paragraph("Oct 17 (Day 1)", table_cell_style),
            Paragraph("Not Used", table_cell_style),
            Paragraph("Not Used", table_cell_style),
            Paragraph("GRANT ENTRY", badge_green),
            Paragraph("GREEN: Welcome [Guest Name] (Day 1 of 2)", badge_green)
        ],
        [
            Paragraph("Oct 17 (Day 1)", table_cell_style),
            Paragraph("Already Used", table_cell_style),
            Paragraph("Not Used", table_cell_style),
            Paragraph("REJECT (DUPLICATE)", badge_red),
            Paragraph("RED: Already Scanned Today at 8:14 PM", badge_red)
        ],
        [
            Paragraph("Oct 18 (Day 2)", table_cell_style),
            Paragraph("Used (Oct 17)", table_cell_style),
            Paragraph("Not Used", table_cell_style),
            Paragraph("GRANT ENTRY", badge_green),
            Paragraph("GREEN: Welcome [Guest Name] (Day 2 of 2)", badge_green)
        ],
        [
            Paragraph("Oct 18 (Day 2)", table_cell_style),
            Paragraph("Used (Oct 17)", table_cell_style),
            Paragraph("Already Used", table_cell_style),
            Paragraph("REJECT (DUPLICATE)", badge_red),
            Paragraph("RED: Already Scanned Today at 7:50 PM", badge_red)
        ],
        [
            Paragraph("Any Date", table_cell_style),
            Paragraph("Banned", table_cell_style),
            Paragraph("Banned", table_cell_style),
            Paragraph("DENY (BLACKLIST)", badge_darkred),
            Paragraph("DARK RED: Pass Blacklisted - Alert Security", badge_darkred)
        ]
    ]

    col_widths = [80, 80, 80, 115, 168]
    matrix_table = Table(table_data, colWidths=col_widths)
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))

    story.append(matrix_table)
    story.append(Spacer(1, 10))

    # --- 3. OFFLINE-FIRST & ANTI-FRAUD ---
    story.append(Paragraph("3. Offline Engine & Security Countermeasures", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceBefore=1, spaceAfter=6))

    threat_data = [
        [
            Paragraph("<b>Threat Model</b>", table_header_style),
            Paragraph("<b>System Defense & Pass Verification Rule</b>", table_header_style)
        ],
        [
            Paragraph("<b>Screenshot & WhatsApp Sharing</b>", table_cell_style),
            Paragraph("Once scanned at Gate 1, ticket status updates globally across all scanners within seconds. A secondary scan attempt triggers instant <b>DUPLICATE SCAN ALERT</b>.", table_cell_style)
        ],
        [
            Paragraph("<b>Pass-Back (Ticket handed back across fence)</b>", table_cell_style),
            Paragraph("Instant timestamp registration. Re-scanning the same ticket within 5 minutes or at an adjacent gate immediately trips a security warning.", table_cell_style)
        ],
        [
            Paragraph("<b>Fake Generated QR Codes</b>", table_cell_style),
            Paragraph("QR payloads use HMAC-SHA256 digital signatures. Counterfeit generated QR codes fail cryptographic decryption and display <b>FAKE TICKET</b>.", table_cell_style)
        ]
    ]

    threat_table = Table(threat_data, colWidths=[150, 373])
    threat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))

    story.append(threat_table)
    story.append(Spacer(1, 10))

    # --- 4. ORGANIZER DASHBOARD & TIMELINE ---
    story.append(Paragraph("4. Real-Time Organizer Dashboard & Execution Timeline", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceBefore=1, spaceAfter=6))

    story.append(Paragraph("• <b>Live Occupancy Counter:</b> Real-time headcount inside event venue.", bullet_style))
    story.append(Paragraph("• <b>Gate Traffic Heatmap:</b> Scans/minute per gate to balance security queues.", bullet_style))
    story.append(Paragraph("• <b>VIP Table Tracker:</b> Real-time alerts when VIP hosts check in.", bullet_style))

    story.append(Spacer(1, 6))
    
    timeline_text = (
        "<b>OCTOBER 16 (Day -1):</b> Setup event metadata & generate staff access PINs. Conduct offline scan dry-run.<br/>"
        "<b>OCTOBER 17 (DAY 1 - GARBA NIGHT 1):</b> 05:30 PM manifest download | 06:30 PM gates open (Day 1 Mode) | 11:30 PM Night 1 report.<br/>"
        "<b>OCTOBER 18 (DAY 2 - GRAND FINALE):</b> 05:30 PM Day 2 scanner update | 06:30 PM gates open (Day 2 Mode) | 11:30 PM final festival summary report."
    )
    
    timeline_box = Table([[Paragraph(timeline_text, body_style)]], colWidths=[523])
    timeline_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    
    story.append(timeline_box)

    doc.build(story)
    print("PDF build complete:", pdf_path)

if __name__ == '__main__':
    build_pdf()
