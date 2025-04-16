import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [resume, setResume] = useState(null);
  const [jobRole, setJobRole] = useState('');
  const [skillReport, setSkillReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file);
    if (file) {
      setResume(file);
    }
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

    
    console.log('Uploading...');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Server response:', response.data);
      setSkillReport(response.data.skillReport);
      setErrorMessage('');
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('Something went wrong. Try again!');
    }
  };

  return (
    <div className="App">
      <h1>Skill Gap Analyzer</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Upload Resume:</label>
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
        </div>
        <div>
          <label>Job Role:</label>
          <input type="text" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
        </div>
        <button type="submit">Analyze</button>
      </form>

      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      {skillReport && (
        <div>
          <h2>Skill Gap Report</h2>

          <h3>Matched Skills:</h3>
          <ul>
            {Array.isArray(skillReport.matchedSkills) && skillReport.matchedSkills.length > 0 ? (
              skillReport.matchedSkills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))
            ) : (
              <li>No matched skills found.</li>
            )}
          </ul>

          <h3>Missing Skills:</h3>
          <ul>
            {Array.isArray(skillReport.missingSkills) && skillReport.missingSkills.length > 0 ? (
              skillReport.missingSkills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))
            ) : (
              <li>No missing skills, your resume is perfect!</li>
            )}
          </ul>

          <h3>Recommendations:</h3>
          {Array.isArray(skillReport.recommendations)
  ? skillReport.recommendations.map((rec, idx) => (
      <li key={idx}>{rec}</li>
    ))
  : typeof skillReport.recommendations === 'object'
  ? Object.entries(skillReport.recommendations).map(([category, value], idx) => (
      <li key={idx}>
        <strong>{category}</strong>: {value}
      </li>
    ))
  : <p>{String(skillReport.recommendations)}</p>}

        </div>
      )}
    </div>
  );
}

export default App;
