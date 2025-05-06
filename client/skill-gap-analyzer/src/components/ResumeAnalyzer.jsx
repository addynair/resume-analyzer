import React, { useState } from 'react';
import axios from 'axios';
import './ResumeAnalyzer.css';

const ResumeAnalyzer = () => {
  const [resume, setResume] = useState(null);
  const [jobRole, setJobRole] = useState('');
  const [skillReport, setSkillReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setResume(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !jobRole.trim()) {
      setErrorMessage('Please provide both a resume and a job role.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jobRole', jobRole.trim());

    try {
      const response =await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSkillReport(response.data.skillReport);
      setErrorMessage('');
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('Something went wrong. Try again!');
    }
  };

  const handleReset = () => {
    setResume(null);
    setJobRole('');
    setSkillReport(null);
    setErrorMessage('');
  };

  return (
    <div className="resume-analyzer-container">
      <div className="header">
        <h1>Resume Analyzer</h1>
      </div>

      {!skillReport && (
        <>
          <p className="description">Upload your resume and desired job role to get a skill gap report.</p>

          <form onSubmit={handleSubmit} className="form-container">
            <div className="input-group">
              <label>Upload resume:</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="input-group">
              <label>Desired Job Role:</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
              />
            </div>

            <button type="submit">Analyze</button>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </form>
        </>
      )}

      {skillReport && (
        <div className="skill-report-container">
          <h2>Skill Gap Report</h2>

          <h3>Matched Skills:</h3>
          <ul>
            {Array.isArray(skillReport.matchedSkills) && skillReport.matchedSkills.length > 0 ? (
              skillReport.matchedSkills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))
            ) : (
              <li className="no-skills">No matched skills found.</li>
            )}
          </ul>

          <h3>Missing Skills:</h3>
          <ul>
            {Array.isArray(skillReport.missingSkills) && skillReport.missingSkills.length > 0 ? (
              skillReport.missingSkills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))
            ) : (
              <li className="no-skills">No missing skills, your resume is perfect!</li>
            )}
          </ul>

          <h3>Recommendations:</h3>
          <ul>
            {Array.isArray(skillReport.recommendations) ? (
              skillReport.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))
            ) : typeof skillReport.recommendations === 'object' ? (
              Object.entries(skillReport.recommendations).map(([category, value], idx) => (
                <li key={idx}>
                  <strong>{category}</strong>: {value}
                </li>
              ))
            ) : (
              <li>{String(skillReport.recommendations)}</li>
            )}
          </ul>

          <button className="analyze-another-btn" onClick={handleReset}>
            Analyze Another
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
