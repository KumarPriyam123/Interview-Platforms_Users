"""
Profile Matching - Sample Interviewer Database
Contains 15 diverse interviewer profiles for testing and demonstration.
"""

from models.matching_models import (
    InterviewerProfile, SeniorityLevel, InterviewType, CandidateLevel, TimeSlot
)


INTERVIEWERS_DATABASE: list[InterviewerProfile] = [
    # 1. Senior Backend Engineer - Python/Django Expert
    InterviewerProfile(
        interviewer_id="INT001",
        name="Sarah Chen",
        title="Staff Software Engineer",
        company="Google",
        total_experience_years=10.0,
        seniority_level=SeniorityLevel.EXPERT,
        expertise_skills=[
            "Python", "Django", "Flask", "FastAPI", "PostgreSQL", 
            "Redis", "Kubernetes", "AWS", "System Design", "Microservices",
            "Docker", "CI/CD", "REST API", "GraphQL"
        ],
        domain_expertise=["cloud", "fintech", "saas", "e-commerce"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.SYSTEM_DESIGN,
            InterviewType.BACKEND
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "Mandarin"],
        rating=4.9,
        total_interviews_conducted=150,
        bio="10+ years building scalable backend systems at Google and startups. Expert in Python ecosystem and distributed systems."
    ),
    
    # 2. Frontend React Specialist
    InterviewerProfile(
        interviewer_id="INT002",
        name="Michael Rodriguez",
        title="Senior Frontend Engineer",
        company="Meta",
        total_experience_years=7.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "JavaScript", "TypeScript", "React", "Next.js", "Redux",
            "HTML", "CSS", "Tailwind", "Webpack", "Jest",
            "React Native", "GraphQL", "Node.js"
        ],
        domain_expertise=["social media", "saas", "e-commerce", "consumer"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.FRONTEND,
            InterviewType.BEHAVIORAL
        ],
        can_interview_levels=[
            CandidateLevel.ENTRY,
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR
        ],
        languages=["English", "Spanish"],
        rating=4.7,
        total_interviews_conducted=85,
        bio="Frontend architect specializing in React and performance optimization. Built UI systems serving millions of users."
    ),
    
    # 3. Full-Stack Java Engineer
    InterviewerProfile(
        interviewer_id="INT003",
        name="Priya Sharma",
        title="Principal Engineer",
        company="Amazon",
        total_experience_years=12.0,
        seniority_level=SeniorityLevel.EXPERT,
        expertise_skills=[
            "Java", "Spring Boot", "Microservices", "AWS", "DynamoDB",
            "Kafka", "Docker", "Kubernetes", "System Design", "SQL",
            "React", "TypeScript", "CI/CD", "Terraform"
        ],
        domain_expertise=["e-commerce", "cloud", "logistics", "fintech"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.SYSTEM_DESIGN,
            InterviewType.BACKEND,
            InterviewType.LEADERSHIP
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "Hindi"],
        rating=4.8,
        total_interviews_conducted=200,
        bio="Principal Engineer at Amazon with expertise in large-scale distributed systems and microservices architecture."
    ),
    
    # 4. Mobile Developer iOS/Android
    InterviewerProfile(
        interviewer_id="INT004",
        name="David Kim",
        title="Senior Mobile Engineer",
        company="Uber",
        total_experience_years=6.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Swift", "iOS", "Kotlin", "Android", "React Native",
            "Flutter", "Mobile Architecture", "REST API", "Firebase",
            "CI/CD", "Unit Testing", "UI/UX"
        ],
        domain_expertise=["transportation", "fintech", "consumer", "logistics"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.MOBILE,
            InterviewType.BEHAVIORAL
        ],
        can_interview_levels=[
            CandidateLevel.ENTRY,
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR
        ],
        languages=["English", "Korean"],
        rating=4.6,
        total_interviews_conducted=60,
        bio="Mobile engineer building the Uber driver and rider apps. Expert in cross-platform development."
    ),
    
    # 5. DevOps/SRE Specialist
    InterviewerProfile(
        interviewer_id="INT005",
        name="Alex Thompson",
        title="Staff SRE",
        company="Netflix",
        total_experience_years=9.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Kubernetes", "Docker", "AWS", "GCP", "Terraform",
            "Ansible", "Jenkins", "GitHub Actions", "Prometheus", "Grafana",
            "Linux", "Bash", "Python", "Go", "CI/CD"
        ],
        domain_expertise=["streaming", "cloud", "entertainment", "saas"],
        interview_types=[
            InterviewType.DEVOPS,
            InterviewType.SYSTEM_DESIGN,
            InterviewType.TECHNICAL_CODING
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English"],
        rating=4.7,
        total_interviews_conducted=75,
        bio="SRE at Netflix ensuring 99.99% uptime for streaming platform. Expert in cloud infrastructure and observability."
    ),
    
    # 6. Data Scientist / ML Engineer
    InterviewerProfile(
        interviewer_id="INT006",
        name="Emily Zhang",
        title="Senior Machine Learning Engineer",
        company="OpenAI",
        total_experience_years=8.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning",
            "NLP", "Computer Vision", "Pandas", "NumPy", "Scikit-learn",
            "SQL", "Spark", "AWS SageMaker", "MLOps", "Statistics"
        ],
        domain_expertise=["ai", "research", "healthcare", "fintech"],
        interview_types=[
            InterviewType.DATA_SCIENCE,
            InterviewType.TECHNICAL_CODING,
            InterviewType.SYSTEM_DESIGN
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "Mandarin"],
        rating=4.9,
        total_interviews_conducted=90,
        bio="ML Engineer building large language models. PhD in Computer Science with focus on NLP."
    ),
    
    # 7. Junior-Mid Friendly Backend Engineer
    InterviewerProfile(
        interviewer_id="INT007",
        name="James Wilson",
        title="Software Engineer II",
        company="Stripe",
        total_experience_years=4.0,
        seniority_level=SeniorityLevel.INTERMEDIATE,
        expertise_skills=[
            "Python", "Ruby", "Rails", "PostgreSQL", "Redis",
            "REST API", "Docker", "AWS", "Git", "Testing"
        ],
        domain_expertise=["fintech", "payments", "saas"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.BACKEND,
            InterviewType.BEHAVIORAL
        ],
        can_interview_levels=[
            CandidateLevel.ENTRY,
            CandidateLevel.INTERMEDIATE
        ],
        languages=["English"],
        rating=4.5,
        total_interviews_conducted=40,
        bio="Backend engineer at Stripe focused on payment processing. Great at mentoring junior engineers."
    ),
    
    # 8. Engineering Manager / Leadership
    InterviewerProfile(
        interviewer_id="INT008",
        name="Lisa Anderson",
        title="Engineering Manager",
        company="Airbnb",
        total_experience_years=11.0,
        seniority_level=SeniorityLevel.EXPERT,
        expertise_skills=[
            "System Design", "Architecture", "Python", "Java", "AWS",
            "Team Leadership", "Agile", "Scrum", "Technical Strategy",
            "Mentoring", "Project Management"
        ],
        domain_expertise=["travel", "hospitality", "marketplace", "consumer"],
        interview_types=[
            InterviewType.LEADERSHIP,
            InterviewType.BEHAVIORAL,
            InterviewType.SYSTEM_DESIGN
        ],
        can_interview_levels=[
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "French"],
        rating=4.8,
        total_interviews_conducted=120,
        bio="Engineering Manager leading platform teams at Airbnb. Expert in building and scaling engineering organizations."
    ),
    
    # 9. Go/Rust Systems Engineer
    InterviewerProfile(
        interviewer_id="INT009",
        name="Viktor Petrov",
        title="Senior Systems Engineer",
        company="Cloudflare",
        total_experience_years=8.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Go", "Rust", "C++", "Linux", "Networking",
            "Distributed Systems", "Performance Optimization", "Docker",
            "Kubernetes", "System Design", "TCP/IP", "DNS"
        ],
        domain_expertise=["infrastructure", "networking", "security", "cloud"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.SYSTEM_DESIGN,
            InterviewType.BACKEND
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "Russian"],
        rating=4.7,
        total_interviews_conducted=65,
        bio="Systems engineer at Cloudflare building edge computing infrastructure. Expert in low-level systems programming."
    ),
    
    # 10. Node.js / TypeScript Specialist
    InterviewerProfile(
        interviewer_id="INT010",
        name="Rachel Green",
        title="Senior Backend Engineer",
        company="Shopify",
        total_experience_years=6.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Node.js", "TypeScript", "JavaScript", "Express", "NestJS",
            "GraphQL", "PostgreSQL", "MongoDB", "Redis", "AWS",
            "Docker", "REST API", "Microservices"
        ],
        domain_expertise=["e-commerce", "saas", "retail", "fintech"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.BACKEND,
            InterviewType.SYSTEM_DESIGN
        ],
        can_interview_levels=[
            CandidateLevel.ENTRY,
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR
        ],
        languages=["English"],
        rating=4.6,
        total_interviews_conducted=55,
        bio="Backend engineer building Shopify's merchant platform. Expert in Node.js and TypeScript ecosystems."
    ),
    
    # 11. Data Engineer
    InterviewerProfile(
        interviewer_id="INT011",
        name="Omar Hassan",
        title="Staff Data Engineer",
        company="Snowflake",
        total_experience_years=9.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Python", "SQL", "Spark", "Airflow", "Kafka",
            "Snowflake", "BigQuery", "Redshift", "dbt", "AWS",
            "Data Modeling", "ETL", "Data Pipelines", "Scala"
        ],
        domain_expertise=["data", "analytics", "fintech", "saas"],
        interview_types=[
            InterviewType.DATA_SCIENCE,
            InterviewType.TECHNICAL_CODING,
            InterviewType.SYSTEM_DESIGN
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "Arabic"],
        rating=4.7,
        total_interviews_conducted=70,
        bio="Data Engineer building petabyte-scale data platforms. Expert in modern data stack tools."
    ),
    
    # 12. Security Engineer
    InterviewerProfile(
        interviewer_id="INT012",
        name="Maria Santos",
        title="Senior Security Engineer",
        company="CrowdStrike",
        total_experience_years=7.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Security", "Python", "Go", "Penetration Testing", "AWS Security",
            "OWASP", "Cryptography", "Linux", "Network Security",
            "Incident Response", "Threat Modeling", "SOC"
        ],
        domain_expertise=["security", "cloud", "fintech", "enterprise"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.SYSTEM_DESIGN,
            InterviewType.BEHAVIORAL
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR
        ],
        languages=["English", "Portuguese", "Spanish"],
        rating=4.8,
        total_interviews_conducted=50,
        bio="Security engineer specializing in cloud security and threat detection. OSCP and AWS Security certified."
    ),
    
    # 13. Entry-Level Friendly Full-Stack
    InterviewerProfile(
        interviewer_id="INT013",
        name="Kevin Nguyen",
        title="Software Engineer",
        company="Atlassian",
        total_experience_years=3.0,
        seniority_level=SeniorityLevel.INTERMEDIATE,
        expertise_skills=[
            "JavaScript", "TypeScript", "React", "Node.js", "Python",
            "PostgreSQL", "Docker", "Git", "REST API", "HTML", "CSS"
        ],
        domain_expertise=["saas", "productivity", "enterprise"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.FRONTEND,
            InterviewType.BACKEND
        ],
        can_interview_levels=[
            CandidateLevel.ENTRY,
            CandidateLevel.INTERMEDIATE
        ],
        languages=["English", "Vietnamese"],
        rating=4.5,
        total_interviews_conducted=30,
        bio="Full-stack engineer at Atlassian. Passionate about helping bootcamp grads and junior developers."
    ),
    
    # 14. Platform/Infrastructure Expert
    InterviewerProfile(
        interviewer_id="INT014",
        name="Jennifer Martinez",
        title="Principal Platform Engineer",
        company="Datadog",
        total_experience_years=13.0,
        seniority_level=SeniorityLevel.EXPERT,
        expertise_skills=[
            "Go", "Python", "Kubernetes", "Docker", "Terraform",
            "AWS", "GCP", "Distributed Systems", "System Design",
            "Observability", "Infrastructure", "Linux", "Networking"
        ],
        domain_expertise=["monitoring", "observability", "cloud", "saas"],
        interview_types=[
            InterviewType.SYSTEM_DESIGN,
            InterviewType.DEVOPS,
            InterviewType.TECHNICAL_CODING,
            InterviewType.LEADERSHIP
        ],
        can_interview_levels=[
            CandidateLevel.SENIOR,
            CandidateLevel.EXPERT
        ],
        languages=["English", "Spanish"],
        rating=4.9,
        total_interviews_conducted=180,
        bio="Principal engineer building Datadog's core infrastructure. Expert in platform engineering and distributed systems."
    ),
    
    # 15. Blockchain/Web3 Specialist
    InterviewerProfile(
        interviewer_id="INT015",
        name="Chris Taylor",
        title="Senior Blockchain Engineer",
        company="Coinbase",
        total_experience_years=5.0,
        seniority_level=SeniorityLevel.SENIOR,
        expertise_skills=[
            "Solidity", "Ethereum", "Web3", "JavaScript", "TypeScript",
            "Rust", "Python", "Smart Contracts", "DeFi", "AWS",
            "Node.js", "PostgreSQL", "Docker"
        ],
        domain_expertise=["blockchain", "fintech", "crypto", "defi"],
        interview_types=[
            InterviewType.TECHNICAL_CODING,
            InterviewType.BACKEND,
            InterviewType.SYSTEM_DESIGN
        ],
        can_interview_levels=[
            CandidateLevel.INTERMEDIATE,
            CandidateLevel.SENIOR
        ],
        languages=["English"],
        rating=4.6,
        total_interviews_conducted=45,
        bio="Blockchain engineer at Coinbase building trading infrastructure. Expert in smart contracts and DeFi protocols."
    ),
]


def get_all_interviewers() -> list[InterviewerProfile]:
    """Return all interviewers from the database."""
    return INTERVIEWERS_DATABASE.copy()


def get_interviewer_by_id(interviewer_id: str) -> InterviewerProfile | None:
    """Get a specific interviewer by ID."""
    for interviewer in INTERVIEWERS_DATABASE:
        if interviewer.interviewer_id == interviewer_id:
            return interviewer
    return None


def filter_interviewers(
    skills: list[str] | None = None,
    experience_level: str | None = None,
    domain: str | None = None,
    interview_type: str | None = None,
) -> list[InterviewerProfile]:
    """Filter interviewers by various criteria."""
    result = INTERVIEWERS_DATABASE.copy()
    
    if skills:
        skills_lower = [s.lower() for s in skills]
        result = [
            i for i in result
            if any(
                skill.lower() in skills_lower or
                any(s in skill.lower() for s in skills_lower)
                for skill in i.expertise_skills
            )
        ]
    
    if experience_level:
        level_map = {
            "entry": [SeniorityLevel.INTERMEDIATE, SeniorityLevel.SENIOR],
            "intermediate": [SeniorityLevel.SENIOR, SeniorityLevel.EXPERT],
            "senior": [SeniorityLevel.SENIOR, SeniorityLevel.EXPERT],
            "expert": [SeniorityLevel.EXPERT],
        }
        valid_levels = level_map.get(experience_level.lower(), [])
        result = [i for i in result if i.seniority_level in valid_levels]
    
    if domain:
        domain_lower = domain.lower()
        result = [
            i for i in result
            if any(d.lower() == domain_lower or domain_lower in d.lower() for d in i.domain_expertise)
        ]
    
    if interview_type:
        try:
            it = InterviewType(interview_type.lower())
            result = [i for i in result if it in i.interview_types]
        except ValueError:
            pass
    
    return result
