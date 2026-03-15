"""
Profile Matching - Matching Algorithm
Calculates compatibility scores between candidates and interviewers.
"""

from typing import Optional
from models.matching_models import (
    InterviewerProfile, InterviewerMatch, ScoreBreakdown,
    CandidateInput, MatchingResponse, SeniorityLevel, CandidateLevel, InterviewType
)
from services.matching.database import get_all_interviewers


# Related skills for similarity matching
SKILL_SIMILARITY_MAP: dict[str, set[str]] = {
    "python": {"django", "flask", "fastapi", "pandas", "numpy"},
    "javascript": {"typescript", "node.js", "nodejs", "react", "vue", "angular"},
    "java": {"spring", "spring boot", "kotlin"},
    "machine learning": {"deep learning", "ai", "data science", "tensorflow", "pytorch"},
    "deep learning": {"machine learning", "neural networks", "tensorflow", "pytorch"},
    "aws": {"cloud", "gcp", "azure", "infrastructure"},
    "docker": {"kubernetes", "containers", "k8s"},
    "kubernetes": {"docker", "k8s", "containers"},
    "react": {"frontend", "javascript", "typescript", "next.js"},
    "sql": {"postgresql", "mysql", "database"},
    "postgresql": {"sql", "database", "mysql"},
    "system design": {"architecture", "distributed systems", "scalability"},
    "microservices": {"distributed systems", "docker", "kubernetes"},
}

# Experience level scoring matrix (candidate_level -> interviewer_level -> score)
EXPERIENCE_MATRIX: dict[str, dict[str, float]] = {
    "entry": {
        "junior": 0.5,
        "intermediate": 1.0,
        "senior": 0.9,
        "expert": 0.7,
    },
    "intermediate": {
        "junior": 0.3,
        "intermediate": 0.7,
        "senior": 1.0,
        "expert": 0.9,
    },
    "senior": {
        "junior": 0.2,
        "intermediate": 0.5,
        "senior": 1.0,
        "expert": 0.95,
    },
    "expert": {
        "junior": 0.2,
        "intermediate": 0.3,
        "senior": 0.7,
        "expert": 1.0,
    },
}

# Role to interview type mapping
ROLE_INTERVIEW_MAP: dict[str, list[InterviewType]] = {
    "engineer": [InterviewType.TECHNICAL_CODING, InterviewType.SYSTEM_DESIGN],
    "software": [InterviewType.TECHNICAL_CODING, InterviewType.SYSTEM_DESIGN],
    "developer": [InterviewType.TECHNICAL_CODING],
    "frontend": [InterviewType.FRONTEND, InterviewType.TECHNICAL_CODING],
    "backend": [InterviewType.BACKEND, InterviewType.TECHNICAL_CODING],
    "fullstack": [InterviewType.FRONTEND, InterviewType.BACKEND, InterviewType.TECHNICAL_CODING],
    "full-stack": [InterviewType.FRONTEND, InterviewType.BACKEND, InterviewType.TECHNICAL_CODING],
    "mobile": [InterviewType.MOBILE, InterviewType.TECHNICAL_CODING],
    "ios": [InterviewType.MOBILE, InterviewType.TECHNICAL_CODING],
    "android": [InterviewType.MOBILE, InterviewType.TECHNICAL_CODING],
    "data scientist": [InterviewType.DATA_SCIENCE, InterviewType.TECHNICAL_CODING],
    "data engineer": [InterviewType.DATA_SCIENCE, InterviewType.TECHNICAL_CODING],
    "ml engineer": [InterviewType.DATA_SCIENCE, InterviewType.TECHNICAL_CODING, InterviewType.SYSTEM_DESIGN],
    "devops": [InterviewType.DEVOPS, InterviewType.SYSTEM_DESIGN],
    "sre": [InterviewType.DEVOPS, InterviewType.SYSTEM_DESIGN],
    "manager": [InterviewType.LEADERSHIP, InterviewType.BEHAVIORAL],
    "lead": [InterviewType.LEADERSHIP, InterviewType.SYSTEM_DESIGN, InterviewType.BEHAVIORAL],
    "principal": [InterviewType.SYSTEM_DESIGN, InterviewType.LEADERSHIP],
    "staff": [InterviewType.SYSTEM_DESIGN, InterviewType.LEADERSHIP],
    "architect": [InterviewType.SYSTEM_DESIGN],
}

# Default weights for scoring
DEFAULT_WEIGHTS = {
    "skill_match": 0.40,
    "experience_compatibility": 0.25,
    "domain_match": 0.20,
    "interview_type_match": 0.15,
}


def normalize_skill(skill: str) -> str:
    """Normalize skill name for comparison."""
    return skill.lower().strip().replace(".", "").replace("-", " ")


def get_similar_skills(skill: str) -> set[str]:
    """Get set of similar skills for a given skill."""
    normalized = normalize_skill(skill)
    similar = {normalized}
    
    # Check direct mapping
    if normalized in SKILL_SIMILARITY_MAP:
        similar.update(SKILL_SIMILARITY_MAP[normalized])
    
    # Check reverse mapping
    for key, values in SKILL_SIMILARITY_MAP.items():
        if normalized in values:
            similar.add(key)
    
    return similar


def calculate_skill_match(
    candidate_skills: list[str],
    interviewer_skills: list[str]
) -> tuple[float, list[str], list[str]]:
    """
    Calculate skill match score between candidate and interviewer.
    
    Returns:
        Tuple of (score, matched_skills, missing_skills)
    """
    if not candidate_skills:
        return 0.0, [], []
    
    # Normalize all skills
    candidate_normalized = {normalize_skill(s) for s in candidate_skills}
    interviewer_normalized = {normalize_skill(s) for s in interviewer_skills}
    
    # Expand interviewer skills with similar skills
    interviewer_expanded = set()
    for skill in interviewer_normalized:
        interviewer_expanded.add(skill)
        interviewer_expanded.update(get_similar_skills(skill))
    
    # Find matches
    matched = []
    missing = []
    
    for skill in candidate_skills:
        skill_norm = normalize_skill(skill)
        skill_similar = get_similar_skills(skill_norm)
        
        # Check if any similar skill is in interviewer's expanded set
        if skill_norm in interviewer_expanded or skill_similar & interviewer_expanded:
            matched.append(skill)
        else:
            missing.append(skill)
    
    # Calculate score
    base_score = len(matched) / len(candidate_skills)
    
    # Bonus if interviewer has more skills (can assess broadly)
    breadth_bonus = 0.0
    if len(interviewer_skills) > len(candidate_skills):
        breadth_bonus = min(0.1, (len(interviewer_skills) - len(candidate_skills)) * 0.02)
    
    score = min(1.0, base_score + breadth_bonus)
    
    return round(score, 2), matched, missing


def calculate_experience_compatibility(
    candidate_level: str,
    interviewer_level: SeniorityLevel,
    interviewer_can_interview: list[CandidateLevel]
) -> float:
    """
    Calculate experience level compatibility score.
    
    Args:
        candidate_level: Candidate's experience level
        interviewer_level: Interviewer's seniority level
        interviewer_can_interview: Levels the interviewer can interview
    
    Returns:
        Compatibility score (0-1)
    """
    candidate_level_lower = candidate_level.lower()
    interviewer_level_value = interviewer_level.value
    
    # Get base score from matrix
    base_score = EXPERIENCE_MATRIX.get(
        candidate_level_lower, {}
    ).get(interviewer_level_value, 0.5)
    
    # Check if interviewer explicitly can interview this level
    try:
        candidate_level_enum = CandidateLevel(candidate_level_lower)
        if candidate_level_enum in interviewer_can_interview:
            # Boost score if explicitly listed
            base_score = min(1.0, base_score + 0.1)
        else:
            # Penalty if not in their preferred levels
            base_score = max(0.3, base_score - 0.2)
    except ValueError:
        pass
    
    return round(base_score, 2)


def calculate_domain_match(
    candidate_industries: list[str],
    interviewer_domains: list[str]
) -> float:
    """
    Calculate domain/industry match score.
    
    Args:
        candidate_industries: Industries candidate has worked in
        interviewer_domains: Interviewer's domain expertise
    
    Returns:
        Domain match score (0-1)
    """
    if not interviewer_domains:
        return 0.2
    
    if not candidate_industries:
        # No industry info - give base score if interviewer has multiple domains
        return 0.4 if len(interviewer_domains) >= 2 else 0.3
    
    # Normalize
    candidate_norm = {i.lower().strip() for i in candidate_industries}
    interviewer_norm = {d.lower().strip() for d in interviewer_domains}
    
    # Related domains mapping
    related_domains = {
        "fintech": {"finance", "banking", "payments"},
        "e-commerce": {"retail", "marketplace"},
        "saas": {"cloud", "enterprise"},
        "healthcare": {"healthtech", "medtech"},
        "transportation": {"logistics", "mobility"},
    }
    
    # Expand interviewer domains with related
    interviewer_expanded = set(interviewer_norm)
    for domain in interviewer_norm:
        if domain in related_domains:
            interviewer_expanded.update(related_domains[domain])
    
    # Count matches
    matches = candidate_norm & interviewer_expanded
    
    if matches:
        # Exact or related match
        score = 0.8 + (len(matches) / len(candidate_norm)) * 0.2
    elif len(interviewer_domains) >= 3:
        # Interviewer is versatile
        score = 0.5
    else:
        # No match
        score = 0.2
    
    return round(min(1.0, score), 2)


def determine_needed_interview_types(
    role: Optional[str],
    level: str
) -> list[InterviewType]:
    """
    Determine what interview types a candidate needs based on role and level.
    
    Args:
        role: Candidate's current or target role
        level: Experience level
    
    Returns:
        List of needed interview types
    """
    needed = set()
    
    # Based on role keywords
    if role:
        role_lower = role.lower()
        for keyword, types in ROLE_INTERVIEW_MAP.items():
            if keyword in role_lower:
                needed.update(types)
    
    # Default to coding if no role match
    if not needed:
        needed.add(InterviewType.TECHNICAL_CODING)
    
    # Add based on level
    level_lower = level.lower()
    if level_lower in ["senior", "expert"]:
        needed.add(InterviewType.SYSTEM_DESIGN)
    if level_lower == "expert":
        needed.add(InterviewType.LEADERSHIP)
    
    return list(needed)


def calculate_interview_type_match(
    candidate_role: Optional[str],
    candidate_level: str,
    interviewer_types: list[InterviewType]
) -> float:
    """
    Calculate interview type match score.
    
    Args:
        candidate_role: Candidate's role
        candidate_level: Candidate's experience level
        interviewer_types: Interview types interviewer can conduct
    
    Returns:
        Interview type match score (0-1)
    """
    needed_types = determine_needed_interview_types(candidate_role, candidate_level)
    
    if not needed_types:
        return 0.5
    
    if not interviewer_types:
        return 0.2
    
    # Count matches
    interviewer_set = set(interviewer_types)
    matches = sum(1 for t in needed_types if t in interviewer_set)
    
    if matches == len(needed_types):
        # Can conduct all needed types
        return 1.0
    elif matches >= len(needed_types) * 0.5:
        # Can conduct most types
        return 0.7
    elif matches > 0:
        # Can conduct some types
        return 0.5
    else:
        # No match
        return 0.2


def calculate_overall_score(
    skill_score: float,
    experience_score: float,
    domain_score: float,
    interview_type_score: float,
    weights: dict[str, float] = DEFAULT_WEIGHTS
) -> float:
    """
    Calculate weighted overall score.
    
    Args:
        skill_score: Skill match score (0-1)
        experience_score: Experience compatibility score (0-1)
        domain_score: Domain match score (0-1)
        interview_type_score: Interview type match score (0-1)
        weights: Weight dictionary for each component
    
    Returns:
        Overall weighted score (0-1)
    """
    overall = (
        skill_score * weights["skill_match"] +
        experience_score * weights["experience_compatibility"] +
        domain_score * weights["domain_match"] +
        interview_type_score * weights["interview_type_match"]
    )
    return round(overall, 2)


def generate_match_explanation(
    candidate: CandidateInput,
    interviewer: InterviewerProfile,
    scores: ScoreBreakdown,
    matched_skills: list[str],
    overall_score: float
) -> str:
    """
    Generate a human-readable explanation of why an interviewer is a good match.
    
    Args:
        candidate: Candidate information
        interviewer: Interviewer profile
        scores: Score breakdown
        matched_skills: List of matching skills
        overall_score: Overall match score
    
    Returns:
        Human-readable explanation string
    """
    parts = []
    
    # Skill match explanation
    skill_pct = int(scores.skill_match_score * 100)
    if skill_pct >= 80:
        parts.append(f"Excellent skill alignment ({skill_pct}% match)")
    elif skill_pct >= 60:
        parts.append(f"Good skill overlap ({skill_pct}% match)")
    elif skill_pct >= 40:
        parts.append(f"Moderate skill coverage ({skill_pct}%)")
    else:
        parts.append(f"Some relevant skills")
    
    if matched_skills:
        skill_list = ", ".join(matched_skills[:5])
        if len(matched_skills) > 5:
            skill_list += f" +{len(matched_skills) - 5} more"
        parts.append(f"covering {skill_list}")
    
    # Experience explanation
    parts.append(
        f"{interviewer.name} has {interviewer.total_experience_years:.0f} years of experience "
        f"as {interviewer.title} at {interviewer.company}"
    )
    
    # Interview types
    interview_types_str = ", ".join([t.value.replace("_", " ") for t in interviewer.interview_types[:3]])
    parts.append(f"Can conduct: {interview_types_str}")
    
    # Rating if available
    if interviewer.rating and interviewer.rating >= 4.5:
        parts.append(f"Highly rated ({interviewer.rating}/5.0)")
    
    # Combine into paragraph
    explanation = ". ".join(parts) + "."
    
    return explanation


def find_best_interviewers(
    candidate: CandidateInput,
    interviewers: list[InterviewerProfile] = None,
    top_n: int = 5
) -> MatchingResponse:
    """
    Find the best matching interviewers for a candidate.
    
    Args:
        candidate: Candidate information from parsed resume
        interviewers: List of available interviewers (uses database if None)
        top_n: Number of top matches to return
    
    Returns:
        MatchingResponse with top matches and recommendation
    """
    if interviewers is None:
        interviewers = get_all_interviewers()
    
    matches: list[tuple[float, InterviewerMatch]] = []
    
    for interviewer in interviewers:
        # Calculate all component scores
        skill_score, matched_skills, missing_skills = calculate_skill_match(
            candidate.skills,
            interviewer.expertise_skills
        )
        
        experience_score = calculate_experience_compatibility(
            candidate.experience_level,
            interviewer.seniority_level,
            interviewer.can_interview_levels
        )
        
        domain_score = calculate_domain_match(
            candidate.industries,
            interviewer.domain_expertise
        )
        
        interview_type_score = calculate_interview_type_match(
            candidate.current_role or candidate.target_role,
            candidate.experience_level,
            interviewer.interview_types
        )
        
        # Calculate overall score
        overall_score = calculate_overall_score(
            skill_score,
            experience_score,
            domain_score,
            interview_type_score
        )
        
        # Create score breakdown
        score_breakdown = ScoreBreakdown(
            skill_match_score=skill_score,
            experience_compatibility_score=experience_score,
            domain_match_score=domain_score,
            interview_type_match_score=interview_type_score
        )
        
        # Generate explanation
        explanation = generate_match_explanation(
            candidate,
            interviewer,
            score_breakdown,
            matched_skills,
            overall_score
        )
        
        # Create match object
        match = InterviewerMatch(
            interviewer_id=interviewer.interviewer_id,
            name=interviewer.name,
            title=interviewer.title,
            company=interviewer.company,
            overall_score=overall_score,
            score_breakdown=score_breakdown,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            interviewer_expertise=interviewer.expertise_skills,
            interview_types=[t.value for t in interviewer.interview_types],
            match_explanation=explanation
        )
        
        matches.append((overall_score, match))
    
    # Sort by score descending
    matches.sort(key=lambda x: x[0], reverse=True)
    
    # Get top N matches
    top_matches = [match for _, match in matches[:top_n]]
    
    # Generate recommendation
    if top_matches:
        best = top_matches[0]
        recommendation = (
            f"{best.name} is the best match with {int(best.overall_score * 100)}% overall compatibility. "
            f"They have strong alignment in skills and experience level, "
            f"making them ideal for interviewing this {candidate.experience_level}-level candidate."
        )
    else:
        recommendation = "No suitable interviewers found matching the candidate profile."
    
    return MatchingResponse(
        candidate_name=candidate.name,
        candidate_skills=candidate.skills,
        candidate_experience_years=candidate.experience_years,
        candidate_level=candidate.experience_level,
        top_matches=top_matches,
        total_interviewers_evaluated=len(interviewers),
        recommendation=recommendation
    )


def rank_interviewers(match_results: list[InterviewerMatch]) -> list[InterviewerMatch]:
    """
    Rank interviewers by overall score.
    
    Args:
        match_results: List of interviewer matches
    
    Returns:
        Sorted list of matches (descending by score)
    """
    return sorted(match_results, key=lambda x: x.overall_score, reverse=True)
