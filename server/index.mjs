import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { uploadHandler } from './upload.mjs';
import mysql from 'mysql2';
import fs from 'fs/promises';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { analyzeSkillGap } from './analyzeSkills.mjs'; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


app.use('/uploads', express.static(path.resolve('uploads')));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

app.get('/', (req, res) => {
  res.send('Backend is live at http://localhost:5000');
});


async function extractTextFromPDF(pdfPath) {
  try {
    const pdfData = await fs.readFile(pdfPath);
    const pdfDataArray = new Uint8Array(pdfData);
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfDataArray }).promise;

    let extractedText = '';
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    return extractedText.trim();
  } catch (err) {
    console.error('Error extracting text from PDF:', err);
    throw new Error('Failed to extract text from PDF');
  }
}

app.post('/upload', uploadHandler.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const jobRole = req.body.jobRole;
    if (!jobRole || jobRole.trim().length === 0) {
      return res.status(400).json({ message: 'Job role is required for skill gap analysis' });
    }

    const filePath = path.resolve(req.file.path);
    console.log('Resolved absolute file path:', filePath);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(400).json({ message: 'File does not exist at path: ' + filePath });
    }

    const extractedText = await extractTextFromPDF(filePath);

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ message: 'PDF contains no extractable text' });
    }

   
    const sql = `
      INSERT INTO resumes (filename, originalname, filepath, uploaded_at)
      VALUES (?, ?, ?, NOW())
    `;
    const relativeFilePath = path.join('uploads', req.file.filename);
    const values = [req.file.filename, req.file.originalname, relativeFilePath];
    const [result] = await db.promise().query(sql, values);

    
    const skillReport = await analyzeSkillGap(extractedText, jobRole);

    
    const matchedSkills = skillReport.matchedSkills || [];
    const missingSkills = skillReport.missingSkills || [];
    const recommendations = skillReport.recommendations || [];

    
    const resumeId = result.insertId; 

    const sqlAnalysis = `
      INSERT INTO skill_analysis (resume_id, job_role, matched_skills, missing_skills, recommendations)
      VALUES (?, ?, ?, ?, ?)
    `;
    const analysisValues = [
      resumeId,
      jobRole,
      matchedSkills.join(', '),  
      missingSkills.join(', '),  
      recommendations.join('; ') 
    ];

    await db.promise().query(sqlAnalysis, analysisValues);

    res.status(200).json({
      message: 'File uploaded, analyzed, and saved successfully',
      file: req.file.filename,
      downloadUrl: `/uploads/${req.file.filename}`,
      extractedText,
      skillReport,
    });
  } catch (err) {
    console.error('Error during upload or analysis:', err);

    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
        console.log('Deleted uploaded file due to error:', req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete uploaded file:', unlinkErr);
      }
    }

    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
