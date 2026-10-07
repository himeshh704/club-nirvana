import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
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
            self.drawString(36, 762, "RANGILO RAAS 2026 — MASTER CREDENTIALS & ACCESS PORTAL SHEET")
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
        self.drawString(130, 26, "•  Filos 24/7, Jodhpur  •  Confidential Access Sheet")
        
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
        fontSize=18,
        leading=22,
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
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#991b1b'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#27272a'),
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

    # Hero Banner
    hero_data = [
        [
            Paragraph("RANGILO RAAS 2026 — MASTER CREDENTIALS SHEET", title_style),
        ],
        [
            Paragraph("OFFICIAL ACCESS CODES, PORTAL URLS & DATABASE SECRETS • FILOS 24/7", subtitle_style),
        ],
        [
            Paragraph("<b>Organizer:</b> House of Chaos &nbsp;|&nbsp; <b>Venue:</b> Filos 24/7, Jodhpur &nbsp;|&nbsp; <b>Live URL:</b> https://rangilo-raas1.vercel.app", ParagraphStyle('HeroMeta', parent=body_style, textColor=colors.HexColor('#f3f4f6'), fontSize=8))
        ]
    ]
    hero_table = Table(hero_data, colWidths=[540])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#7f1d1d')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [6, 6, 6, 6])
    ]))
    story.append(hero_table)
    story.append(Spacer(1, 10))

    # Confidential Notice Box
    notice_text = "<b>CONFIDENTIAL ACCESS SHEET:</b> Keep these credentials secure. Contains Super Admin access, promoter manager pass generation logins, staff gate scanner PIN codes, and Supabase database secret keys."
    notice_p = Paragraph(notice_text, ParagraphStyle('NoticeText', parent=body_style, fontSize=8.5, leading=12, textColor=colors.HexColor('#991b1b')))
    notice_table = Table([[notice_p]], colWidths=[540])
    notice_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#fca5a5')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(notice_table)
    story.append(Spacer(1, 10))

    # Section 1: User Logins & Portal Passwords
    story.append(Paragraph("1. User Logins & Portal Access Passwords", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=6))

    login_data = [
        [
            Paragraph("User Role", table_header_style),
            Paragraph("Username", table_header_style),
            Paragraph("Access Code / Password", table_header_style),
            Paragraph("Portal Login URL", table_header_style),
            Paragraph("Permissions & Capabilities", table_header_style)
        ],
        [
            Paragraph("<b>Super Admin</b><br/>(Organizers)", table_cell_style),
            Paragraph("<code>admin</code><br/><i>(or superadmin)</i>", table_cell_style),
            Paragraph("<b><code>adminsanyam123</code></b><br/><i>(or admin8824 / admin098)</i>", table_cell_style),
            Paragraph("<code>https://rangilo-raas1.vercel.app/staff/login</code><br/><i>(or /admin)</i>", table_cell_style),
            Paragraph("Full control over Pass Creation, Attendee Directory, Financial & Gate Reports, VIP Tables, Blacklist, Delete Pass, & Branding Settings. <b>Only Admin can issue Complimentary (Free) passes.</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Manager</b><br/>(Shailesh)", table_cell_style),
            Paragraph("<code>shailesh</code>", table_cell_style),
            Paragraph("<b><code>shailesh123</code></b>", table_cell_style),
            Paragraph("<code>https://rangilo-raas1.vercel.app/staff/login</code>", table_cell_style),
            Paragraph("Issue passes locked under Shailesh's collection logs (Cash/UPI only), 1-click WhatsApp pass dispatch, live gate feed. <i>No Complimentary passes allowed.</i>", table_cell_style)
        ],
        [
            Paragraph("<b>Manager</b><br/>(Ankur Bishnoi)", table_cell_style),
            Paragraph("<code>ankur</code><br/><i>(or ankur bishnoi)</i>", table_cell_style),
            Paragraph("<b><code>ankur1234</code></b>", table_cell_style),
            Paragraph("<code>https://rangilo-raas1.vercel.app/staff/login</code>", table_cell_style),
            Paragraph("Issue passes locked under Ankur's collection logs (Cash/UPI only), 1-click WhatsApp pass dispatch, live gate feed. <i>No Complimentary passes allowed.</i>", table_cell_style)
        ],
        [
            Paragraph("<b>Manager</b><br/>(Angad Bishnoi)", table_cell_style),
            Paragraph("<code>angad</code><br/><i>(or angad bishnoi)</i>", table_cell_style),
            Paragraph("<b><code>angad1234</code></b>", table_cell_style),
            Paragraph("<code>https://rangilo-raas1.vercel.app/staff/login</code>", table_cell_style),
            Paragraph("Issue passes locked under Angad's collection logs (Cash/UPI only), 1-click WhatsApp pass dispatch, live gate feed. <i>No Complimentary passes allowed.</i>", table_cell_style)
        ],
        [
            Paragraph("<b>Gate Security</b><br/>(Gate Staff)", table_cell_style),
            Paragraph("<code>staff</code><br/><i>(or gate)</i>", table_cell_style),
            Paragraph("<b><code>gate123</code></b><br/><i>(or staf1234)</i>", table_cell_style),
            Paragraph("<code>https://rangilo-raas1.vercel.app/staff/login</code><br/><i>(opens /staff/dashboard)</i>", table_cell_style),
            Paragraph("Camera QR scanner, Day 1 (18 Oct) vs Day 2 (19 Oct) toggle, full-screen color alerts (Green/Red/Yellow), 100% offline IndexedDB caching.", table_cell_style)
        ]
    ]

    login_table = Table(login_data, colWidths=[90, 85, 110, 125, 130])
    login_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#991b1b')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fafafa')]),
    ]))
    story.append(login_table)
    story.append(Spacer(1, 10))

    # Section 2: Supabase Database & HMAC Cryptographic Keys
    story.append(Paragraph("2. Database & HMAC Cryptographic Secrets", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=6))

    db_data = [
        [
            Paragraph("Secret / Variable Name", table_header_style),
            Paragraph("Environment Key Value", table_header_style),
            Paragraph("Usage & Description", table_header_style)
        ],
        [
            Paragraph("<b>Supabase Project URL</b><br/><code>NEXT_PUBLIC_SUPABASE_URL</code>", table_cell_style),
            Paragraph("<code>https://khstjwlxlwbdjgafjups.supabase.co</code>", table_cell_style),
            Paragraph("Live cloud Supabase database host for tickets, checkins, users, and settings.", table_cell_style)
        ],
        [
            Paragraph("<b>Supabase Anon Key</b><br/><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>", table_cell_style),
            Paragraph("<code>sb_publishable_yBTDwyklIMCFZrLsPMCg2w_IVBKFZbo</code>", table_cell_style),
            Paragraph("Public client-side database read key for gate synchronization.", table_cell_style)
        ],
        [
            Paragraph("<b>Supabase Service Role Key</b><br/><code>SUPABASE_SERVICE_ROLE_KEY</code>", table_cell_style),
            Paragraph("<code>" + "sb_secret_" + "whpo-P_hN2u3WZsY4yfSbQ_PMuPqV-t</code>", table_cell_style),
            Paragraph("Admin backend secret key for creating tickets, updating blacklist, and sync.", table_cell_style)
        ],
        [
            Paragraph("<b>HMAC QR Signing Secret</b><br/><code>QR_JWT_SECRET</code>", table_cell_style),
            Paragraph("<code>super-secret-key-change-me-in-production-123456</code>", table_cell_style),
            Paragraph("Cryptographic secret used to sign HMAC-SHA256 QR tokens to prevent pass forgery.", table_cell_style)
        ]
    ]

    db_table = Table(db_data, colWidths=[140, 210, 190])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#991b1b')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fafafa')]),
    ]))
    story.append(db_table)
    story.append(Spacer(1, 10))

    # Section 3: Pass Pricing Quick Reference
    story.append(Paragraph("3. Pass Pricing & Date Reference", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#fca5a5'), spaceBefore=2, spaceAfter=6))

    price_data = [
        [
            Paragraph("Pass Category", table_header_style),
            Paragraph("Solo Price", table_header_style),
            Paragraph("Couple Price", table_header_style),
            Paragraph("Group of 10 Price", table_header_style),
            Paragraph("Valid Dates", table_header_style)
        ],
        [
            Paragraph("<b>2-Day Phase 1 Passes</b>", table_cell_style),
            Paragraph("₹699/-", table_cell_style),
            Paragraph("₹999/-", table_cell_style),
            Paragraph("₹5,999/-", table_cell_style),
            Paragraph("18 & 19 Oct 2026 (Both Days)", table_cell_style)
        ],
        [
            Paragraph("<b>Single Day Early Bird Passes</b>", table_cell_style),
            Paragraph("₹599/-", table_cell_style),
            Paragraph("₹899/-", table_cell_style),
            Paragraph("₹4,999/-", table_cell_style),
            Paragraph("18 Oct (Day 1) OR 19 Oct (Day 2)", table_cell_style)
        ]
    ]

    price_table = Table(price_data, colWidths=[140, 90, 90, 100, 120])
    price_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#991b1b')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fafafa')]),
    ]))
    story.append(price_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated Credentials PDF: {filename}")

if __name__ == '__main__':
    target_path = "RANGILO_RAAS_SYSTEM_CREDENTIALS.pdf"
    build_pdf(target_path)
    
    artifact_dir = "C:/Users/choud/.gemini/antigravity-ide/brain/62ccfd12-bdd4-463a-8854-cd79e6b3a491"
    if os.path.exists(artifact_dir):
        import shutil
        shutil.copy(target_path, os.path.join(artifact_dir, "RANGILO_RAAS_SYSTEM_CREDENTIALS.pdf"))
        print(f"Copied Credentials PDF to artifact dir: {artifact_dir}")
