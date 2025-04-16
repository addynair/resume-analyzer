CREATE TABLE resumes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,  
  file_name VARCHAR(255),
  file_path VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INT,
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
