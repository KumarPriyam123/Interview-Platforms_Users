import 'dotenv/config';
import { connectDB } from '../src/config/db.js';

await connectDB(process.env.MONGODB_URI);

const { evaluateAnswer, resolveDoubt } = await import('../src/services/llm.service.js');

// Test evaluateAnswer
console.log('=== Testing evaluateAnswer ===');
const evalResult = await evaluateAnswer({
  question: 'Explain how React Virtual DOM works and its benefits.',
  answer: 'React creates a lightweight copy of the actual DOM called virtual DOM. When state changes, it creates a new virtual DOM tree and diffs it with the previous one using a reconciliation algorithm. Only the changed nodes get updated in the real DOM, which improves performance.',
  role: 'Software Engineer',
  company: 'Google',
  conversationHistory: [],
});
console.log('Score:', evalResult.score);
console.log('Feedback:', evalResult.feedback);
console.log('Should counter:', evalResult.should_counter_question);
console.log('Counter Q:', evalResult.counter_question);

// Test with a bad answer that should trigger counter question
console.log('\n=== Testing evaluateAnswer (bad answer, should trigger counter) ===');
const evalBad = await evaluateAnswer({
  question: 'Explain how React Virtual DOM works and its benefits.',
  answer: 'I like pizza.',
  role: 'Software Engineer',
  company: 'Google',
  conversationHistory: [],
});
console.log('Score:', evalBad.score);
console.log('Feedback:', evalBad.feedback);
console.log('Should counter:', evalBad.should_counter_question);
console.log('Counter Q:', evalBad.counter_question);

// Test resolveDoubt
console.log('\n=== Testing resolveDoubt ===');
const doubtResult = await resolveDoubt({
  doubt: 'What does virtual DOM mean exactly?',
  currentQuestion: 'Explain how React Virtual DOM works and its benefits.',
  role: 'Software Engineer',
  company: 'Google',
  conversationHistory: [],
});
console.log('Response:', doubtResult.response);
console.log('Hint:', doubtResult.hint);

process.exit(0);
