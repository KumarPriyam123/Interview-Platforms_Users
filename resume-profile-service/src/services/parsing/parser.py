"""
Resume Parser - Core Parsing Logic
Handles PDF and DOCX parsing with skill extraction and experience calculation.
"""

import re
import fitz  # PyMuPDF
from docx import Document
from io import BytesIO
from typing import Optional
from datetime import datetime
from models.parser_models import ParsedResume, WorkExperience, Education


# Common technical skills for matching
TECHNICAL_SKILLS = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "golang",
    "rust", "swift", "kotlin", "scala", "php", "perl", "r", "matlab", "sql",
    
    # Frontend
    "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs", "vue.js",
    "html", "css", "sass", "scss", "less", "tailwind", "bootstrap", "jquery",
    "next.js", "nextjs", "nuxt", "svelte", "webpack", "babel",
    
    # Backend
    "node.js", "nodejs", "express", "expressjs", "django", "flask", "fastapi",
    "spring", "spring boot", "springboot", ".net", "asp.net", "rails", "laravel",
    "gin", "echo", "fiber",
    
    # Databases
    "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "sqlite", "oracle", "sql server", "mariadb",
    "neo4j", "couchdb", "firebase",
    
    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "terraform", "ansible", "jenkins", "circleci", "github actions", "gitlab ci",
    "nginx", "apache", "linux", "unix", "bash", "shell",
    
    # Data Science & ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "scikit-learn", "pandas", "numpy", "scipy", "matplotlib", "seaborn",
    "nlp", "computer vision", "data science", "data analysis", "spark",
    "hadoop", "airflow", "kafka",
    
    # Mobile
    "ios", "android", "react native", "flutter", "xamarin", "ionic",
    
    # Tools & Methodologies
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "agile",
    "scrum", "kanban", "ci/cd", "tdd", "bdd", "rest", "graphql", "grpc",
    "microservices", "system design", "api design",
}

# Soft skills
SOFT_SKILLS = {
    "leadership", "communication", "teamwork", "problem solving", "critical thinking",
    "project management", "time management", "mentoring", "collaboration",
    "presentation", "analytical", "strategic thinking",
}

# Email pattern
EMAIL_PATTERN = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+')

# Phone pattern (various formats)
PHONE_PATTERN = re.compile(r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}')

# LinkedIn pattern
LINKEDIN_PATTERN = re.compile(r'linkedin\.com/in/[\w-]+')

# GitHub pattern
GITHUB_PATTERN = re.compile(r'github\.com/[\w-]+')

# Year pattern for experience/education
YEAR_PATTERN = re.compile(r'(19|20)\d{2}')

# Date range pattern
DATE_RANGE_PATTERN = re.compile(
    r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*,?\s*(19|20)\d{2}\s*[-–—to]+\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Present|Current)\s*,?\s*((19|20)\d{2})?',
    re.IGNORECASE
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text content from a DOCX file."""
    try:
        doc = Document(BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {str(e)}")


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract text based on file extension."""
    filename_lower = filename.lower()
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_bytes)
    elif filename_lower.endswith('.docx'):
        return extract_text_from_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file format: {filename}")


def extract_email(text: str) -> Optional[str]:
    """Extract email address from text."""
    match = EMAIL_PATTERN.search(text)
    return match.group() if match else None


def extract_phone(text: str) -> Optional[str]:
    """Extract phone number from text."""
    match = PHONE_PATTERN.search(text)
    return match.group() if match else None


def extract_linkedin(text: str) -> Optional[str]:
    """Extract LinkedIn URL from text."""
    match = LINKEDIN_PATTERN.search(text)
    return f"https://{match.group()}" if match else None


def extract_github(text: str) -> Optional[str]:
    """Extract GitHub URL from text."""
    match = GITHUB_PATTERN.search(text)
    return f"https://{match.group()}" if match else None


def extract_name(text: str) -> Optional[str]:
    """Extract candidate name (usually first line of resume)."""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines:
        # First non-empty line that's not an email/phone/URL
        for line in lines[:5]:
            if not EMAIL_PATTERN.search(line) and not PHONE_PATTERN.match(line):
                if len(line) < 50 and not any(c.isdigit() for c in line[:10]):
                    return line
    return None


def extract_skills(text: str) -> list[str]:
    """Extract skills from resume text."""
    text_lower = text.lower()
    found_skills = []
    
    # Check for technical skills
    for skill in TECHNICAL_SKILLS:
        # Use word boundary matching
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            # Normalize skill name
            found_skills.append(skill.title() if len(skill) > 3 else skill.upper())
    
    # Check for soft skills
    for skill in SOFT_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill.title())
    
    return list(set(found_skills))


def extract_experience_years(text: str) -> float:
    """Estimate total years of experience from resume text."""
    # Look for explicit mentions
    exp_patterns = [
        r'(\d+)\+?\s*years?\s*(?:of)?\s*experience',
        r'experience[:\s]+(\d+)\+?\s*years?',
        r'(\d+)\+?\s*years?\s*(?:in|of|working)',
    ]
    
    for pattern in exp_patterns:
        match = re.search(pattern, text.lower())
        if match:
            return float(match.group(1))
    
    # Calculate from date ranges
    date_matches = DATE_RANGE_PATTERN.findall(text)
    total_months = 0
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    month_map = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
        'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
        'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    }
    
    for match in date_matches:
        try:
            start_month = month_map.get(match[0].lower()[:3], 1)
            start_year = int(match[1])
            
            end_str = match[2].lower()
            if end_str in ['present', 'current']:
                end_month = current_month
                end_year = current_year
            else:
                end_month = month_map.get(end_str[:3], 12)
                end_year = int(match[3]) if match[3] else current_year
            
            months = (end_year - start_year) * 12 + (end_month - start_month)
            if months > 0:
                total_months += months
        except (ValueError, IndexError):
            continue
    
    return round(total_months / 12, 1) if total_months > 0 else 0.0


def determine_experience_level(years: float) -> str:
    """Determine experience level based on years."""
    if years < 2:
        return "entry"
    elif years < 5:
        return "intermediate"
    elif years < 10:
        return "senior"
    else:
        return "expert"


def extract_work_experiences(text: str) -> list[WorkExperience]:
    """Extract work experience entries from resume."""
    experiences = []
    
    # Common section headers for work experience
    work_section_pattern = re.compile(
        r'(work experience|professional experience|experience|employment history|work history)',
        re.IGNORECASE
    )
    
    # Try to find work experience section
    lines = text.split('\n')
    in_work_section = False
    current_exp = {}
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Check if entering work section
        if work_section_pattern.search(line):
            in_work_section = True
            continue
        
        # Check if leaving work section (education, skills, etc.)
        if in_work_section and re.match(r'^(education|skills|certifications|projects|awards)', line, re.IGNORECASE):
            in_work_section = False
            if current_exp.get('company') and current_exp.get('title'):
                experiences.append(WorkExperience(**current_exp))
            break
        
        if in_work_section:
            # Look for date ranges
            date_match = DATE_RANGE_PATTERN.search(line)
            if date_match:
                if current_exp.get('company') and current_exp.get('title'):
                    experiences.append(WorkExperience(**current_exp))
                    current_exp = {}
                
                current_exp['start_date'] = f"{date_match.group(2)}-{date_match.group(1)[:3]}"
                end_str = date_match.group(3)
                if end_str.lower() in ['present', 'current']:
                    current_exp['end_date'] = 'Present'
                else:
                    current_exp['end_date'] = f"{date_match.group(4) or ''}-{end_str[:3]}"
            
            # Look for company names (often in title case or ALL CAPS)
            elif re.match(r'^[A-Z][A-Za-z\s&,\.]+$', line) and len(line) < 60:
                if not current_exp.get('company'):
                    current_exp['company'] = line
                elif not current_exp.get('title'):
                    current_exp['title'] = line
    
    # Add last experience if exists
    if current_exp.get('company') and current_exp.get('title'):
        experiences.append(WorkExperience(**current_exp))
    
    return experiences


def extract_education(text: str) -> list[Education]:
    """Extract education entries from resume."""
    education_list = []
    
    # Common degree patterns
    degree_patterns = [
        r"(Bachelor'?s?|B\.?S\.?|B\.?A\.?|B\.?E\.?|B\.?Tech)",
        r"(Master'?s?|M\.?S\.?|M\.?A\.?|M\.?E\.?|M\.?Tech|MBA)",
        r"(Ph\.?D\.?|Doctorate|Doctor)",
        r"(Associate'?s?|A\.?S\.?|A\.?A\.?)",
    ]
    
    # Find education section
    edu_section_pattern = re.compile(r'(education|academic|qualifications)', re.IGNORECASE)
    
    lines = text.split('\n')
    in_edu_section = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        if edu_section_pattern.search(line):
            in_edu_section = True
            continue
        
        if in_edu_section:
            # Check if leaving education section
            if re.match(r'^(experience|skills|work|projects)', line, re.IGNORECASE):
                break
            
            # Look for degree info
            for pattern in degree_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    edu = Education(institution="", degree="")
                    
                    # Extract degree
                    degree_match = re.search(pattern, line, re.IGNORECASE)
                    if degree_match:
                        edu.degree = degree_match.group(1)
                    
                    # Extract year
                    year_match = YEAR_PATTERN.search(line)
                    if year_match:
                        edu.graduation_year = int(year_match.group())
                    
                    # Rest might be institution
                    remaining = re.sub(pattern, '', line, flags=re.IGNORECASE)
                    remaining = re.sub(r'\d{4}', '', remaining)
                    remaining = re.sub(r'[,\-–]', ' ', remaining).strip()
                    if remaining:
                        edu.institution = remaining[:100]
                    
                    if edu.degree:
                        education_list.append(edu)
                    break
    
    return education_list


def parse_resume(file_bytes: bytes, filename: str) -> ParsedResume:
    """
    Main function to parse a resume file.
    
    Args:
        file_bytes: Raw bytes of the resume file
        filename: Original filename (used to determine format)
    
    Returns:
        ParsedResume object with extracted information
    """
    # Extract raw text
    raw_text = extract_text(file_bytes, filename)
    
    if not raw_text:
        raise ValueError("Could not extract text from resume")
    
    # Extract all components
    name = extract_name(raw_text)
    email = extract_email(raw_text)
    phone = extract_phone(raw_text)
    linkedin = extract_linkedin(raw_text)
    github = extract_github(raw_text)
    skills = extract_skills(raw_text)
    experience_years = extract_experience_years(raw_text)
    experience_level = determine_experience_level(experience_years)
    work_experiences = extract_work_experiences(raw_text)
    education = extract_education(raw_text)
    
    # Calculate confidence based on how much we extracted
    confidence = 0.0
    if name:
        confidence += 0.15
    if email:
        confidence += 0.15
    if skills:
        confidence += 0.25
    if experience_years > 0:
        confidence += 0.20
    if work_experiences:
        confidence += 0.15
    if education:
        confidence += 0.10
    
    return ParsedResume(
        name=name,
        email=email,
        phone=phone,
        linkedin=linkedin,
        github=github,
        skills=skills,
        total_experience_years=experience_years,
        experience_level=experience_level,
        work_experiences=work_experiences,
        education=education,
        raw_text=raw_text[:5000],  # Limit raw text length
        file_name=filename,
        parse_confidence=round(confidence, 2),
    )
