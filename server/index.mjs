import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse";
import { uploadHandler } from "./upload.mjs";
import { analyzeSkillGap } from "./analyzeSkills.mjs";
import pool from "./db.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, "uploads");

if (!fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.send("Backend is live!");
});

async function testDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully!");
  } catch (err) {
    console.error("❌ Failed to connect to the database:", err.message);
    process.exit(1);
  }
}

await testDatabaseConnection();

async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text.trim();
  } catch (err) {
    console.error("Error extracting text from PDF:", err);
    throw new Error("Failed to extract text from PDF");
  }
}

app.post("/upload", uploadHandler.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const jobRole = req.body.jobRole?.trim();
    if (!jobRole) {
      return res
        .status(400)
        .json({ message: "Job role is required for skill gap analysis" });
    }

    const filePath = path.resolve(req.file.path);
    try {
      await fs.access(filePath);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "File does not exist at path: " + filePath });
    }

    const extractedText = await extractTextFromPDF(filePath);
    if (!extractedText) {
      return res
        .status(400)
        .json({ message: "PDF contains no extractable text" });
    }

    const relativeFilePath = path.relative(__dirname, filePath);

    const insertResumeSQL = `
      INSERT INTO resumes (filename, originalname, filepath, uploaded_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [resumeResult] = await pool.query(insertResumeSQL, [
      req.file.filename,
      req.file.originalname,
      relativeFilePath,
    ]);

    const resumeId = resumeResult.insertId;

    const skillReport = await analyzeSkillGap(extractedText, jobRole);
    const matchedSkills = skillReport.matchedSkills || [];
    const missingSkills = skillReport.missingSkills || [];
    let recommendations = skillReport.recommendations || [];

    if (!Array.isArray(recommendations)) {
      if (typeof recommendations === "object") {
        recommendations = Object.entries(recommendations).map(
          ([key, val]) => `${key}: ${val}`
        );
      } else if (typeof recommendations === "string") {
        recommendations = [recommendations];
      } else {
        recommendations = [];
      }
    }

    const insertAnalysisSQL = `
      INSERT INTO skill_analysis (resume_id, job_role, matched_skills, missing_skills, recommendations)
      VALUES (?, ?, ?, ?, ?)
    `;
    await pool.query(insertAnalysisSQL, [
      resumeId,
      jobRole,
      matchedSkills.join(", "),
      missingSkills.join(", "),
      recommendations.join("; "),
    ]);

    res.status(200).json({
      message: "File uploaded, analyzed, and saved successfully",
      file: req.file.filename,
      downloadUrl: `/uploads/${req.file.filename}`,
      extractedText,
      skillReport,
    });
  } catch (err) {
    console.error("Error during upload or analysis:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
