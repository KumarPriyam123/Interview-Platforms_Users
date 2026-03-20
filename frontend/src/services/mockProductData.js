export const dashboardNav = [
  { label: 'Dashboard', to: '/' },
  { label: 'Profile Verification', to: '/profile-verification' },
  { label: 'Job Matches', to: '/job-matches' },
]

export const dashboardQuickActions = [
  {
    id: 'ai',
    eyebrow: 'AI Interview',
    title: 'Interview simulator',
    description: 'Run a structured coding round with adaptive prompts and instant scoring.',
    detailLabel: 'Difficulty',
    detailValue: 'Medium Difficulty',
    buttonLabel: 'Start AI Interview',
    buttonTo: '/ai-interview',
    tone: 'dark',
  },
  {
    id: 'p2p',
    eyebrow: 'P2P Practice',
    title: 'Live peer room',
    description: 'Spin up a shared room with role swap, code sync, and camera controls.',
    detailLabel: 'Role Swap Allowed',
    detailValue: 'Enabled',
    buttonLabel: 'Create P2P Session',
    buttonTo: '/p2p-interview',
    tone: 'light',
  },
  {
    id: 'expert',
    eyebrow: 'Expert Session',
    title: 'Schedule with specialist',
    description: 'Book a focused mock interview with engineers who have run real loops.',
    mentor: {
      name: 'Emily R.',
      role: 'Ex-Meta Engineer',
      availability: 'Tomorrow',
    },
    buttonLabel: 'Schedule with Expert',
    buttonTo: '/industry-leaders',
    tone: 'light',
  },
]

export const dashboardSummary = {
  totalInterviews: {
    value: '32',
    splits: [
      { label: 'AI', value: 18 },
      { label: 'Peer', value: 10 },
      { label: 'Expert', value: 4 },
    ],
  },
  problemBreakdown: {
    total: 112,
    segments: [
      { label: 'Easy', value: 56, color: 'green' },
      { label: 'Med', value: 39, color: 'yellow' },
      { label: 'Hard', value: 17, color: 'red' },
    ],
  },
  coreScores: [
    { label: 'Knowledge Correctness', value: 92 },
    { label: 'Communication', value: 85 },
    { label: 'Fluency', value: 78 },
    { label: 'Professionalism', value: 95 },
  ],
}

export const activeSessions = [
  {
    id: 'mark-room',
    host: 'Mark K.',
    difficulty: 'Medium',
    occupancy: '1/2 Users',
    title: 'Valid Palindrome & Arrays',
    description: 'Open for joining. Looking to practice two-pointer approach.',
    status: 'Open',
    actionLabel: 'Join Now',
    actionTone: 'primary',
  },
  {
    id: 'emily-room',
    host: 'Emily R.',
    difficulty: 'Hard',
    occupancy: '2/2 Users',
    title: 'Dynamic Programming: Edit Distance',
    description: 'You were previously in this room.',
    status: 'Disconnected',
    actionLabel: 'Rejoin Session',
    actionTone: 'ghost',
  },
]

export const completedInterviews = [
  {
    id: 'backend-api',
    score: 92,
    title: 'Backend API Design',
    tag: 'AI Session',
    category: 'System Design',
    date: 'Oct 12, 2023',
  },
  {
    id: 'trees',
    score: 74,
    title: 'Trees & Graphs Review',
    tag: 'Peer Session',
    category: 'Algorithms',
    date: 'Oct 09, 2023',
  },
  {
    id: 'react-performance',
    score: 88,
    title: 'React Performance Optimization',
    tag: 'Expert Mentor',
    category: 'Frontend',
    date: 'Oct 01, 2023',
  },
]

export const coachPanel = {
  dailyLimitUsed: 0,
  dailyLimitTotal: 1,
  slotsUsed: 8,
  slotsTotal: 10,
}

export const coachInsights = [
  {
    id: 'improve',
    title: 'Area to Improve',
    body: 'You solved Maximum Subarray well. Add more detail on edge cases in System Design next time.',
    action: 'Review Edge Cases',
    tone: 'amber',
  },
  {
    id: 'strength',
    title: 'Identified Strength',
    body: 'Strong conceptual clarity in Algorithms, especially your approach to two-pointer logic.',
    action: 'Try Harder DP Problem',
    tone: 'green',
  },
]

export const profileTabs = [
  { label: 'Profile Verification', to: '/profile-verification' },
  { label: 'Job Matches', to: '/job-matches' },
]

export const profileSnapshot = {
  targetRole: 'Senior Frontend Engineer',
  score: 85,
  breakdown: [
    { label: 'Skill Overlap', value: 90, color: 'green' },
    { label: 'Education & Training', value: 100, color: 'violet' },
    { label: 'Experience & Range', value: 65, color: 'yellow' },
  ],
  insights: [
    {
      title: 'Key Strength',
      body: 'Strong alignment in core tech stack (React, Node.js). Education perfectly matches requirements.',
      tone: 'green',
    },
    {
      title: 'Potential Gap',
      body: 'Role asks for 5+ years of experience; parsed data indicates ~3 years. Be prepared to highlight impact over tenure.',
      tone: 'amber',
    },
  ],
  actions: [
    { title: 'View Recommended Jobs', meta: '12 matches found' },
    { title: 'Match Interview Panel', meta: 'Practice with experts' },
  ],
}

export const initialProfile = {
  fileName: 'alex_resume_2023.pdf',
  firstName: 'Alex',
  lastName: 'Chen',
  email: 'alex.chen@example.com',
  mobile: '+1 (555) 019-',
  company: 'TechFlow Inc.',
  jobRole: 'Full Stack Developer',
  duration: 'Jan 2021 - Present',
  hardSkills: ['React', 'Node.js', 'System Design'],
  softSkills: ['Agile Leadership', 'Cross-functional Comms'],
  degree: 'B.S. Computer Science',
  institution: 'University of Technology',
  certifications: ['AWS Certified Solutions Architect'],
  linkedIn: 'https://linkedin.com/in/alexchen',
  portfolio: 'https://github.com/alexchen-dev',
  bio: 'Results-driven Full Stack Developer with 3+ years of experience building scalable MERN applications. Passionate about system design and cloud architecture.',
}

