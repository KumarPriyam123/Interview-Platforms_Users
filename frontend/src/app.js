/* eslint-disable no-unused-vars */
// ===== Configuration =====
const API_BASE_URL = 'http://localhost:8000';

// ===== State =====
let selectedFile = null;
let currentView = 'match';

// ===== DOM Elements =====
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const matchBtn = document.getElementById('matchBtn');
const resultsSection = document.getElementById('resultsSection');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

// ===== File Upload Handling =====
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(ext)) {
        showToast('Please upload a PDF or DOCX file', 'error');
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    selectedFile = file;

    // Update UI
    dropZone.style.display = 'none';
    fileInfo.style.display = 'flex';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    matchBtn.disabled = false;
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    matchBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== API Calls =====
async function uploadAndMatch() {
    if (!selectedFile) return;

    showLoading(true);
    matchBtn.querySelector('.btn-text').textContent = 'Processing...';
    matchBtn.querySelector('.btn-loader').style.display = 'block';
    matchBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch(`${API_BASE_URL}/api/parse-and-match?top_n=5`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            displayResults(data);
            showToast('Successfully matched interviewers!', 'success');
        } else {
            showToast(data.error || 'Failed to process resume', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to connect to server. Make sure all services are running.', 'error');
    } finally {
        showLoading(false);
        matchBtn.querySelector('.btn-text').textContent = 'Find Matching Interviewers';
        matchBtn.querySelector('.btn-loader').style.display = 'none';
        matchBtn.disabled = false;
    }
}

async function fetchAllInterviewers(skillFilter = '') {
    try {
        let url = `${API_BASE_URL}/api/interviewers?per_page=20`;
        if (skillFilter) {
            url += `&skills=${skillFilter}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            displayAllInterviewers(data.interviewers);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to fetch interviewers', 'error');
    }
}

// ===== Display Functions =====
function displayResults(data) {
    resultsSection.style.display = 'block';

    // Scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Display parsed resume
    const resume = data.parsed_resume;
    if (resume) {
        document.getElementById('candidateName').textContent = resume.name || 'Not detected';
        document.getElementById('candidateExp').textContent =
            resume.total_experience_years ? `${resume.total_experience_years} years` : 'Not detected';
        document.getElementById('candidateLevel').textContent =
            capitalizeFirst(resume.experience_level) || 'Entry';

        // Display skills
        const skillsList = document.getElementById('skillsList');
        skillsList.innerHTML = '';
        (resume.skills || []).forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            skillsList.appendChild(tag);
        });
    }

    // Display matching interviewers
    const matching = data.matching_results;
    if (matching && matching.top_matches) {
        document.getElementById('matchCount').textContent =
            `${matching.top_matches.length} of ${matching.total_interviewers_evaluated} evaluated`;

        const grid = document.getElementById('interviewersGrid');
        grid.innerHTML = '';

        matching.top_matches.forEach(match => {
            grid.appendChild(createInterviewerCard(match, true));
        });
    }
}

function displayAllInterviewers(interviewers) {
    const grid = document.getElementById('allInterviewersGrid');
    grid.innerHTML = '';

    interviewers.forEach(interviewer => {
        grid.appendChild(createInterviewerCard(interviewer, false));
    });
}

function createInterviewerCard(data, showMatchScore) {
    const card = document.createElement('div');
    card.className = 'interviewer-card';

    const scoreClass = data.overall_score >= 0.8 ? 'high' :
        data.overall_score >= 0.6 ? 'medium' : 'low';

    let scoreHTML = '';
    if (showMatchScore && data.overall_score !== undefined) {
        scoreHTML = `
            <div class="match-score">
                <div class="score-circle ${scoreClass}">
                    ${Math.round(data.overall_score * 100)}%
                </div>
                <span class="score-label">Match</span>
            </div>
        `;
    }

    let breakdownHTML = '';
    if (showMatchScore && data.score_breakdown) {
        const sb = data.score_breakdown;
        breakdownHTML = `
            <div class="score-breakdown">
                <div class="breakdown-item">
                    <span class="label">Skills</span>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: ${sb.skill_match_score * 100}%"></div>
                    </div>
                </div>
                <div class="breakdown-item">
                    <span class="label">Experience</span>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: ${sb.experience_compatibility_score * 100}%"></div>
                    </div>
                </div>
                <div class="breakdown-item">
                    <span class="label">Domain</span>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: ${sb.domain_match_score * 100}%"></div>
                    </div>
                </div>
                <div class="breakdown-item">
                    <span class="label">Interview Type</span>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: ${sb.interview_type_match_score * 100}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Skills to display
    const skills = showMatchScore ?
        [...(data.matched_skills || []), ...(data.missing_skills || []).slice(0, 2)] :
        (data.expertise_skills || []).slice(0, 6);

    const matchedSkills = data.matched_skills || [];

    const skillsHTML = skills.map(skill => {
        const isMatched = matchedSkills.includes(skill);
        return `<span class="skill-tag ${isMatched ? 'matched' : ''}">${skill}</span>`;
    }).join('');

    // Interview types
    const types = data.interview_types || [];
    const typesHTML = types.map(type =>
        `<span class="type-badge">${type.replace(/_/g, ' ')}</span>`
    ).join('');

    card.innerHTML = `
        <div class="card-header">
            <div class="interviewer-info">
                <h3>${data.name}</h3>
                <div class="title">${data.title}</div>
                <div class="company">${data.company}</div>
            </div>
            ${scoreHTML}
        </div>
        ${breakdownHTML}
        <div class="card-skills">${skillsHTML}</div>
        <div class="interview-types">${typesHTML}</div>
    `;

    return card;
}

// ===== Navigation =====
function showMatch(e) {
    if (e) e.preventDefault();

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link:first-child').classList.add('active');

    document.querySelector('.upload-section').style.display = 'flex';
    document.getElementById('allInterviewersSection').style.display = 'none';
    // Keep results visible if they exist
}

function showInterviewers(e) {
    if (e) e.preventDefault();

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link:last-child').classList.add('active');

    document.querySelector('.upload-section').style.display = 'none';
    resultsSection.style.display = 'none';
    document.getElementById('allInterviewersSection').style.display = 'block';

    fetchAllInterviewers();
}

function filterInterviewers() {
    const skill = document.getElementById('skillFilter').value;
    fetchAllInterviewers(skill);
}

// ===== UI Helpers =====
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Check API health
    fetch(`${API_BASE_URL}/health`)
        .then(res => res.json())
        .then(data => {
            if (data.status !== 'healthy') {
                showToast('Some services may be unavailable', 'warning');
            }
        })
        .catch(() => {
            showToast('Cannot connect to API. Start the backend services first.', 'error');
        });
});
