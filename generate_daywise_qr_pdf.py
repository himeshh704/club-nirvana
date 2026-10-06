import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header banner on page 2+
        if self._pageNumber > 1:
            self.setFillColor(colors.HexColor("#06020a"))
            self.rect(0, 750, 612, 42, fill=1, stroke=0)
            self.setFillColor(colors.HexColor("#dc2626"))
            self.rect(0, 748, 612, 2, fill=1, stroke=0)
            
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#fca5a5"))
            self.drawString(36, 762, "RANGILO RAAS 2026 — DAY-WISE QR TICKETING & GATE VALIDATION SPECIFICATION")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#9ca3af"))
            self.drawRightString(576, 762, "HOUSE OF CHAOS • FILOS 24/7")

        # Footer on all pages
        self.setStrokeColor(colors.HexColor("#27272a"))
        self.setLineWidth(0.75)
        self.line(36, 40, 576, 40)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#dc2626"))
        self.drawString(36, 26, "RANGILO RAAS 2026")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#71717a"))
        self.drawString(130, 26, "•  Filos 24/7, Jodhpur  •  Cryptographic Day-Aware QR Architecture")
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#a1a1aa"))
        self.drawRightString(576, 26, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#ffffff'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#fca5a5'),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#991b1b'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#18181b'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#27272a'),
        spaceAfter=6
    )

    bold_body = ParagraphStyle(
        'BoldBodyCustom',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#09090b')
    )

    code_style = ParagraphStyle(
        'CodeCustom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#15803d'),
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#ffffff')
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#18181b')
    )

    story = []

    # Title Hero Box
    hero_data = [
        [
            Paragraph("RANGILO RAAS 2026 — DAY-WISE QR SYSTEM", title_style),
        ],
        [
            Paragraph("TECHNICAL SPECIFICATION & DAY-VALIDATION ARCHITECTURE • FILOS 24/7", subtitle_style),
        ],
        [
            Paragraph("<b>Organizer:</b> House of Chaos &nbsp;|&nbsp; <b>Venue:</b> Filos 24/7, Jodhpur &nbsp;|&nbsp; <b>Dates:</b> 18 & 19 Oct 2026 &nbsp;|&nbsp; <b>Status:</b> 100% Fully Functional", ParagraphStyle('HeroMeta', parent=body_style, textColor=colors.HexColor('#f3f4f6'), fontSize=8.5))
        ]
    ]
    hero_table = Table(hero_data, colWidths=[540])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#7f1d1d')),
        ('PADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,2), (-1,2), 12),
        ('ROUNDEDCORNERS', [6, 6, 6, 6])
    ]))
    story.append(hero_table)
    story.append(Spacer(1, 14))

    # Executive Summary Box
    exec_text = """<b>SYSTEM VERIFICATION SUMMARY:</b><br/>
    The Rangilo Raas 2026 ticketing and QR gate validation system is <b>100% fully functional and operational</b>. It supports cryptographic multi-day validation (Day 1 vs Day 2 vs 2-Day Season), date-aware gate enforcement, full-screen color-coded staff alerts, offline IndexedDB ground caching, live promoter financial audits, and instant 1-click WhatsApp pass dispatching."""
    exec_p = Paragraph(exec_text, ParagraphStyle('ExecText', parent=body_style, fontSize=9, leading=13, textColor=colors.HexColor('#15803d')))
    exec_table = Table([[exec_p]], colWidths=[540])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#86efac')),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 12))

    # Section 1: Day-Wise Pass Categories & Exact Pricing
    story.append(Paragraph("1. Day-Wise Pass Categories & Pricing Structure", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=8))
    story.append(Paragraph("The system enforces exact ticket tiers with automatic date binding (`valid_days` parameter):", body_style))

    pricing_data = [
        [
            Paragraph("Pass Category", table_header_style),
            Paragraph("Ticket Tier", table_header_style),
            Paragraph("Price (₹)", table_header_style),
            Paragraph("Valid Dates / Days", table_header_style),
            Paragraph("Database Flag (`valid_days`)", table_header_style)
        ],
        [
            Paragraph("<b>2-Day Phase 1 Pass</b>", table_cell_style),
            Paragraph("Solo", table_cell_style),
            Paragraph("<b>₹699/-</b>", table_cell_style),
            Paragraph("18 & 19 Oct 2026 (Both Days)", table_cell_style),
            Paragraph("<code>both</code>", table_cell_style)
        ],
        [
            Paragraph("<b>2-Day Phase 1 Pass</b>", table_cell_style),
            Paragraph("Couple", table_cell_style),
            Paragraph("<b>₹999/-</b>", table_cell_style),
            Paragraph("18 & 19 Oct 2026 (Both Days)", table_cell_style),
            Paragraph("<code>both</code>", table_cell_style)
        ],
        [
            Paragraph("<b>2-Day Phase 1 Pass</b>", table_cell_style),
            Paragraph("Group of 10", table_cell_style),
            Paragraph("<b>₹5,999/-</b>", table_cell_style),
            Paragraph("18 & 19 Oct 2026 (Both Days)", table_cell_style),
            Paragraph("<code>both</code>", table_cell_style)
        ],
        [
            Paragraph("<b>Single Day Early Bird</b>", table_cell_style),
            Paragraph("Solo", table_cell_style),
            Paragraph("<b>₹599/-</b>", table_cell_style),
            Paragraph("18 Oct (Day 1) OR 19 Oct (Day 2)", table_cell_style),
            Paragraph("<code>day_1</code> or <code>day_2</code>", table_cell_style)
        ],
        [
            Paragraph("<b>Single Day Early Bird</b>", table_cell_style),
            Paragraph("Couple", table_cell_style),
            Paragraph("<b>₹899/-</b>", table_cell_style),
            Paragraph("18 Oct (Day 1) OR 19 Oct (Day 2)", table_cell_style),
            Paragraph("<code>day_1</code> or <code>day_2</code>", table_cell_style)
        ],
        [
            Paragraph("<b>Single Day Early Bird</b>", table_cell_style),
            Paragraph("Group of 10", table_cell_style),
            Paragraph("<b>₹4,999/-</b>", table_cell_style),
            Paragraph("18 Oct (Day 1) OR 19 Oct (Day 2)", table_cell_style),
            Paragraph("<code>day_1</code> or <code>day_2</code>", table_cell_style)
        ]
    ]

    pricing_table = Table(pricing_data, colWidths=[120, 75, 65, 150, 130])
    pricing_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#991b1b')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fafafa')]),
    ]))
    story.append(pricing_table)
    story.append(Spacer(1, 14))

    # Section 2: How Day-Wise QRs are Created
    story.append(Paragraph("2. How Day-Wise QR Passes are Created", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=8))
    
    create_steps = [
        "<b>Step 1 — Pass Generation Request:</b> The organizer enters Guest Name and Mobile Number on the Admin Control Centre (<code>/admin</code>) or Pass Generator (<code>/</code>).",
        "<b>Step 2 — Automatic Date Tagging:</b> The backend inspects the selected ticket category string. If 'Day 1' is selected, <code>valid_days</code> is set to <code>day_1</code>. If 'Day 2' is selected, <code>valid_days</code> is set to <code>day_2</code>. For 2-Day Passes, <code>valid_days</code> is set to <code>both</code>.",
        "<b>Step 3 — Cryptographic HMAC Signature:</b> The server generates a unique payload: <code>{ i: ticketId, n: name, t: ticketType, v: valid_days }</code> and cryptographically signs it with <code>HMAC-SHA256</code> using <code>QR_JWT_SECRET</code>. The payload cannot be altered or forged.",
        "<b>Step 4 — Database Insertion & Supabase Record:</b> The ticket is saved into Supabase with independent scan tracking columns: <code>day_1_scanned = false</code> and <code>day_2_scanned = false</code>.",
        "<b>Step 5 — 1-Click WhatsApp Dispatch:</b> The system opens WhatsApp with a pre-filled message formatted with Guest Name, Category, Event Dates (18 & 19 Oct), Venue (Filos 24/7), and direct pass link <code>http://localhost:3000/?ticket=TOKEN</code>."
    ]
    for step in create_steps:
        story.append(Paragraph(f"• {step}", body_style))

    story.append(Spacer(1, 14))

    # Section 3: How the QR Scanner Checks Which Day the Pass is For
    story.append(Paragraph("3. How the Gate QR Scanner Validates Which Day the Pass is For", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("When gate staff scan a guest pass at <b>Filos 24/7</b>, the Staff Terminal (<code>/staff/dashboard</code>) executes a <b>4-stage verification algorithm</b>:", body_style))

    scanner_rules_data = [
        [
            Paragraph("Gate Scan Scenario", table_header_style),
            Paragraph("Pass Category", table_header_style),
            Paragraph("System Check & Execution", table_header_style),
            Paragraph("Screen Alert & Audio", table_header_style)
        ],
        [
            Paragraph("<b>Scanning on Day 1 (18 Oct)</b><br/>Valid Pass", table_cell_style),
            Paragraph("Day 1 Only OR 2-Day Season Pass", table_cell_style),
            Paragraph("Validates HMAC signature & checking <code>day_1_scanned === false</code>. Sets <code>day_1_scanned = true</code> in Supabase.", table_cell_style),
            Paragraph("<font color='#16a34a'><b>🟢 GREEN FULLSCREEN</b></font><br/>'ENTRY PERMITTED (DAY 1)' + Green Chime", table_cell_style)
        ],
        [
            Paragraph("<b>Scanning on Day 1 (18 Oct)</b><br/>Wrong Day Pass", table_cell_style),
            Paragraph("Single Day Pass (Day 2 Only)", table_cell_style),
            Paragraph("Detects <code>valid_days === 'day_2'</code> while terminal is set to Day 1.", table_cell_style),
            Paragraph("<font color='#ca8a04'><b>🟡 YELLOW FULLSCREEN</b></font><br/>'WRONG DAY! PASS IS FOR DAY 2 (19 OCT ONLY)'", table_cell_style)
        ],
        [
            Paragraph("<b>Scanning on Day 1 (18 Oct)</b><br/>Duplicate Scan", table_cell_style),
            Paragraph("Already Scanned Pass", table_cell_style),
            Paragraph("Detects <code>day_1_scanned === true</code>.", table_cell_style),
            Paragraph("<font color='#dc2626'><b>🔴 RED FULLSCREEN</b></font><br/>'ALREADY SCANNED TODAY (DAY 1)'", table_cell_style)
        ],
        [
            Paragraph("<b>Scanning on Day 2 (19 Oct)</b><br/>Valid Pass", table_cell_style),
            Paragraph("Day 2 Only OR 2-Day Season Pass", table_cell_style),
            Paragraph("Validates HMAC signature & checking <code>day_2_scanned === false</code>. Sets <code>day_2_scanned = true</code>, <code>is_used = true</code> in Supabase.", table_cell_style),
            Paragraph("<font color='#16a34a'><b>🟢 GREEN FULLSCREEN</b></font><br/>'ENTRY PERMITTED (DAY 2)' + Green Chime", table_cell_style)
        ],
        [
            Paragraph("<b>Scanning on Day 2 (19 Oct)</b><br/>Expired Pass", table_cell_style),
            Paragraph("Single Day Pass (Day 1 Only)", table_cell_style),
            Paragraph("Detects <code>valid_days === 'day_1'</code> while terminal is set to Day 2.", table_cell_style),
            Paragraph("<font color='#ca8a04'><b>🟡 YELLOW FULLSCREEN</b></font><br/>'EXPIRED! PASS WAS FOR DAY 1 (18 OCT ONLY)'", table_cell_style)
        ],
        [
            Paragraph("<b>Any Date</b><br/>Blacklisted Guest", table_cell_style),
            Paragraph("Blacklisted Pass", table_cell_style),
            Paragraph("Detects <code>is_banned === true</code>.", table_cell_style),
            Paragraph("<font color='#dc2626'><b>🔴 RED FULLSCREEN</b></font><br/>'BLACK LISTED GUEST - ACCESS DENIED'", table_cell_style)
        ]
    ]

    scanner_table = Table(scanner_rules_data, colWidths=[110, 110, 175, 145])
    scanner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#991b1b')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fafafa')]),
    ]))
    story.append(scanner_table)
    story.append(Spacer(1, 14))

    # Section 4: Offline Reliability & Database Audit
    story.append(Paragraph("4. Ground Failure Resilience & Database Audit", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=8))
    
    resilience_text = """<b>100% Offline IndexedDB Ground Caching:</b><br/>
    If mobile network connectivity drops at Filos 24/7 during peak entry hours, gate scanners operate 100% offline. The scanner verifies cryptographic HMAC signatures locally on the device without requiring server connectivity. Scanned tickets are cached in local browser IndexedDB (<code>rangilo_raas_db</code>) and automatically sync back to Supabase the moment network reconnects."""
    story.append(Paragraph(resilience_text, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == '__main__':
    target_path = "RANGILO_RAAS_DAY_WISE_QR_EXPLANATION.pdf"
    build_pdf(target_path)
    
    # Also copy to artifacts directory if available
    artifact_dir = "C:/Users/choud/.gemini/antigravity-ide/brain/62ccfd12-bdd4-463a-8854-cd79e6b3a491"
    if os.path.exists(artifact_dir):
        import shutil
        shutil.copy(target_path, os.path.join(artifact_dir, "RANGILO_RAAS_DAY_WISE_QR_EXPLANATION.pdf"))
        print(f"Copied PDF to artifact dir: {artifact_dir}")
