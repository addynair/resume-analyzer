import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function analyzeSkillGap(resumeText, jobRole) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `
You are an AI career expert.

For the job role: "${jobRole}", compare the skills from the resume text below with the expected skills for that job role.

Generate a JSON response with the following:
- "matchedSkills": List of skills from the resume that match the required skills for the job role.
- "missingSkills": List of skills required for the job role that are missing from the resume.
- "recommendations": Recommendations for learning or improving the missing skills. 

Here is the resume:
"""
${resumeText}
"""
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);

    const skillReport = JSON.parse(jsonString);

    return skillReport;
  } catch (err) {
    console.error('Error analyzing skill gap:', err);
    throw err;
  }
}
