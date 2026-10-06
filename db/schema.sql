-- Tabular Scorer Schema
-- Express + MySQL
-- A-D scoring: A=100, B=95, C=90, D=85

CREATE DATABASE IF NOT EXISTS tabular_score;
USE tabular_score;

-- Contestants
CREATE TABLE IF NOT EXISTS contestants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (display_order)
);

-- Judges
CREATE TABLE IF NOT EXISTS judges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  code VARCHAR(255) NULL UNIQUE   -- scrypt PIN hash: "salt:hash", set by admin
);

-- Scores: store choice + numeric value
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contestant_id INT NOT NULL,
  judge_id INT NOT NULL,
  choice CHAR(1) NULL CHECK (choice IS NULL OR choice IN ('A','B','C','D')),
  score_value DECIMAL(5,2) NULL,
  submitted_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_scores_contestant FOREIGN KEY (contestant_id) REFERENCES contestants(id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_judge FOREIGN KEY (judge_id) REFERENCES judges(id) ON DELETE CASCADE,
  UNIQUE KEY uq_contestant_judge (contestant_id, judge_id),
  INDEX idx_contestant (contestant_id),
  INDEX idx_judge (judge_id)
);

-- Audience votes: one ballot per device (anonymous device token)
CREATE TABLE IF NOT EXISTS audience_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_token CHAR(64) NOT NULL,
  contestant_id INT NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_device (device_token),
  CONSTRAINT fk_av_contestant FOREIGN KEY (contestant_id) REFERENCES contestants(id) ON DELETE CASCADE,
  INDEX idx_contestant (contestant_id)
);

-- Event settings
CREATE TABLE IF NOT EXISTS event_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);

-- Seed judges 1-3
INSERT IGNORE INTO judges (id, label, code) VALUES
(1, 'Judge 1', NULL),
(2, 'Judge 2', NULL),
(3, 'Judge 3', NULL);

-- Seed default settings
INSERT IGNORE INTO event_settings (setting_key, setting_value) VALUES
('scores_locked', '0'),
('judges_count', '3'),
('blind_scoring', '1'),
('scoring_mode', 'ad'),
('allow_revision', '1');
