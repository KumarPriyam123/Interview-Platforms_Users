import 'dotenv/config';
import { connectDB } from '../src/config/db.js';

await connectDB(process.env.MONGODB_URI);

const { generateAllQuestions } = await import('../src/services/llm.service.js');

console.log('Calling generateAllQuestions...');
const sections = await generateAllQuestions({
  resumeData: {
    technical_skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    experience_summary: '3 years of full-stack development',
    experience_years: 3,
    education: 'B.Tech Computer Science',
    projects: ['E-commerce platform', 'Chat application'],
  },
  role: 'Software Engineer',
  company: 'Google',
});

console.log('\n=== SECTIONS ===');
for (const section of sections) {
  console.log(`\nSection: ${section.title} (${section.questions.length} questions)`);
  for (const q of section.questions) {
    console.log(`  [${q.difficulty}] [${q.type || 'text'}] ${q.question.substring(0, 100)}...`);
  }
}

process.exit(0);
