"""Generate a sample resume PDF for testing the Interview Platform."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def create_sample_resume(filename="sample_resume.pdf"):
    doc = SimpleDocTemplate(filename, pagesize=letter, 
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=6
    )
    
    contact_style = ParagraphStyle(
        'Contact',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor('#2563eb')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontSize=10,
        leftIndent=20,
        spaceAfter=4
    )
    
    story = []
    
    # Header
    story.append(Paragraph("Alex Johnson", title_style))
    story.append(Paragraph(
        "alex.johnson@email.com | +1 (555) 123-4567 | San Francisco, CA",
        contact_style
    ))
    story.append(Paragraph(
        "LinkedIn: linkedin.com/in/alexjohnson | GitHub: github.com/alexjohnson",
        contact_style
    ))
    story.append(Spacer(1, 20))
    
    # Summary
    story.append(Paragraph("Professional Summary", section_style))
    story.append(Paragraph(
        "Senior Software Engineer with 6+ years of experience building scalable web applications "
        "and distributed systems. Expertise in Python, JavaScript, and cloud technologies. "
        "Passionate about clean code, system design, and mentoring junior developers.",
        normal_style
    ))
    
    # Skills
    story.append(Paragraph("Technical Skills", section_style))
    skills_text = """
    <b>Languages:</b> Python, JavaScript, TypeScript, SQL, Go<br/>
    <b>Frameworks:</b> Django, FastAPI, React, Node.js, Express<br/>
    <b>Cloud & DevOps:</b> AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, CI/CD<br/>
    <b>Databases:</b> PostgreSQL, MongoDB, Redis, Elasticsearch<br/>
    <b>Tools:</b> Git, Linux, REST APIs, GraphQL, Microservices Architecture
    """
    story.append(Paragraph(skills_text, normal_style))
    
    # Experience
    story.append(Paragraph("Work Experience", section_style))
    
    # Job 1
    story.append(Paragraph("<b>Senior Software Engineer</b> | TechCorp Inc. | Jan 2021 - Present", normal_style))
    story.append(Paragraph("• Led development of microservices architecture serving 2M+ daily users", bullet_style))
    story.append(Paragraph("• Designed and implemented RESTful APIs using Python/FastAPI and Node.js", bullet_style))
    story.append(Paragraph("• Reduced API response time by 40% through caching and query optimization", bullet_style))
    story.append(Paragraph("• Mentored team of 4 junior developers and conducted code reviews", bullet_style))
    story.append(Spacer(1, 8))
    
    # Job 2
    story.append(Paragraph("<b>Software Engineer</b> | StartupXYZ | Mar 2018 - Dec 2020", normal_style))
    story.append(Paragraph("• Built full-stack features using React, Django, and PostgreSQL", bullet_style))
    story.append(Paragraph("• Implemented real-time notifications using WebSockets and Redis", bullet_style))
    story.append(Paragraph("• Deployed applications on AWS using Docker and Kubernetes", bullet_style))
    story.append(Paragraph("• Collaborated with product team to define technical requirements", bullet_style))
    story.append(Spacer(1, 8))
    
    # Job 3
    story.append(Paragraph("<b>Junior Developer</b> | WebAgency | Jun 2017 - Feb 2018", normal_style))
    story.append(Paragraph("• Developed responsive web applications using JavaScript and React", bullet_style))
    story.append(Paragraph("• Created REST APIs with Node.js and Express", bullet_style))
    story.append(Paragraph("• Participated in agile development and sprint planning", bullet_style))
    
    # Education
    story.append(Paragraph("Education", section_style))
    story.append(Paragraph(
        "<b>Bachelor of Science in Computer Science</b><br/>"
        "University of California, Berkeley | 2013 - 2017<br/>"
        "GPA: 3.7/4.0 | Dean's List",
        normal_style
    ))
    
    # Certifications
    story.append(Paragraph("Certifications", section_style))
    story.append(Paragraph("• AWS Certified Solutions Architect - Associate (2023)", bullet_style))
    story.append(Paragraph("• Kubernetes Certified Application Developer (2022)", bullet_style))
    
    # Build PDF
    doc.build(story)
    print(f"[OK] Sample resume created: {filename}")
    return filename


if __name__ == "__main__":
    create_sample_resume("frontend/sample_resume.pdf")
