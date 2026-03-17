export const landingStats = [
  { value: '10k+', label: 'Active users' },
  { value: '50k+', label: 'Sessions completed' },
  { value: '3+', label: 'Core languages' },
]

export const landingFeatures = [
  {
    id: 'collab',
    icon: '</>',
    title: 'Real-time Collaboration',
    description:
      'Share code instantly with synchronized cursors and low-latency interactions.',
  },
  {
    id: 'feedback',
    icon: 'AI',
    title: 'AI-Powered Feedback',
    description:
      'Get immediate feedback on communication, problem solving, and coding quality.',
  },
  {
    id: 'video',
    icon: 'HD',
    title: 'HD Video Conferencing',
    description:
      'Simulate a complete face-to-face technical interview directly in your browser.',
  },
]

export const mockIndustryLeaders = [
  {
    id: 'i-001',
    name: 'Sarah Miller',
    role: 'Staff Engineer · Stripe',
    experience: '9 years',
    focus: 'Frontend architecture',
    rating: '4.9',
  },
  {
    id: 'i-002',
    name: 'Arjun Mehta',
    role: 'Principal Engineer · Microsoft',
    experience: '12 years',
    focus: 'Distributed systems',
    rating: '4.8',
  },
  {
    id: 'i-003',
    name: 'Elena Kim',
    role: 'Senior Engineering Manager · Atlassian',
    experience: '10 years',
    focus: 'System design & leadership',
    rating: '4.9',
  },
  {
    id: 'i-004',
    name: 'Daniel Rao',
    role: 'Senior Backend Engineer · Uber',
    experience: '8 years',
    focus: 'Backend coding rounds',
    rating: '4.7',
  },
]

export const mockInterviewPrompt =
  'Given the root of a binary tree, invert the tree and return its root.'

export const mockStarterCode = `var invertTree = function(root) {
  if (!root) {
    return null;
  }

  const temp = root.left;
  root.left = root.right;
  root.right = temp;

  invertTree(root.left);
  invertTree(root.right);

  return root;
};`

export const mockChatMessages = [
  {
    id: 'c1',
    sender: 'interviewer',
    text: 'Can you explain your thought process for the recursive approach?',
    time: '10:24 AM',
  },
  {
    id: 'c2',
    sender: 'me',
    text: 'I swap left/right pointers per node, then recurse on both subtrees.',
    time: '10:25 AM',
  },
  {
    id: 'c3',
    sender: 'interviewer',
    text: 'Good. What is the time and space complexity here?',
    time: '10:26 AM',
  },
]

export const mockInterviewReport = {
  interviewId: 'TIQ-8824',
  duration: '45m',
  score: 84,
  performance: [
    { name: 'Communication', score: 92 },
    { name: 'Technical Skills', score: 78 },
    { name: 'Problem Solving', score: 85 },
    { name: 'Code Quality', score: 80 },
  ],
  strengths: [
    'Excellent usage of React hooks with clear architectural choices.',
    'Strong clarity while discussing time complexity and edge cases.',
    'Confident communication when negotiating constraints.',
  ],
  improvements: [
    'Separate utility logic from UI code for cleaner modularity.',
    'Cover null and empty inputs earlier in the solution explanation.',
    'Use more descriptive temporary variable names during implementation.',
  ],
}
