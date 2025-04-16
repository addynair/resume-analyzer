import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export async function analyzeSkillGap(resumeText, jobRole) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `
You are a skill analysis expert.

Compare the skills from the resume text below with the expected skills for the job role: "${jobRole}".

Give me a JSON response with:
{
  "skillsInResume": [...],
  "expectedSkills": [...],
  "missingSkills": [...],
  "suggestedLearningPaths": [...]
}

Resume:
"""
${resumeText}
"""
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);

    return JSON.parse(jsonString);
  } catch (err) {
    console.error('Error analyzing skill gap:', err);
    throw err;
  }
}
