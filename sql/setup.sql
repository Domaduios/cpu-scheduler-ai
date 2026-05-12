CREATE DATABASE IF NOT EXISTS cpu_scheduler 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;
USE cpu_scheduler;
CREATE TABLE IF NOT EXISTS datasets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL COMMENT 'Short identifier (e.g., "classic")',
    name VARCHAR(100) NOT NULL COMMENT 'Display name',
    description TEXT COMMENT 'Description of what this dataset tests',
    is_builtin BOOLEAN DEFAULT TRUE COMMENT 'Built-in vs user-created',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dataset_processes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dataset_id INT NOT NULL,
    pid VARCHAR(10) NOT NULL COMMENT 'Process ID (e.g., "P1")',
    arrival INT NOT NULL,
    burst INT NOT NULL,
    priority INT DEFAULT NULL COMMENT 'Lower number = higher priority',
    process_order INT NOT NULL COMMENT 'Order within the dataset',
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    INDEX idx_dataset (dataset_id)
);
CREATE TABLE IF NOT EXISTS simulation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workload_type VARCHAR(20) COMMENT 'Uniform / Mixed / Diverse',
    process_count INT,
    recommended_algorithm VARCHAR(30),
    avg_waiting DECIMAL(6,2),
    avg_turnaround DECIMAL(6,2),
    throughput DECIMAL(6,3),
    fairness DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recommended (recommended_algorithm),
    INDEX idx_created (created_at)
);
INSERT INTO datasets (slug, name, description, is_builtin) VALUES
('classic', 'Classic Textbook Example',
 'Standard OS textbook scenario - 4 processes with mixed burst times', TRUE);
SET @classic_id = LAST_INSERT_ID();
INSERT INTO dataset_processes (dataset_id, pid, arrival, burst, priority, process_order) VALUES
(@classic_id, 'P1', 0, 6, 2, 1),
(@classic_id, 'P2', 1, 8, 1, 2),
(@classic_id, 'P3', 2, 7, 3, 3),
(@classic_id, 'P4', 3, 3, 4, 4);
INSERT INTO datasets (slug, name, description, is_builtin) VALUES
('convoy', 'Convoy Effect Demo',
 'Tests FCFS weakness - one long process blocks short ones', TRUE);
SET @convoy_id = LAST_INSERT_ID();
INSERT INTO dataset_processes (dataset_id, pid, arrival, burst, priority, process_order) VALUES
(@convoy_id, 'P1', 0, 20, 3, 1),
(@convoy_id, 'P2', 1, 2, 1, 2),
(@convoy_id, 'P3', 2, 3, 2, 3),
(@convoy_id, 'P4', 3, 1, 1, 4),
(@convoy_id, 'P5', 4, 4, 2, 5);
INSERT INTO datasets (slug, name, description, is_builtin) VALUES
('uniform', 'Uniform Workload',
 'Similar burst times - tests Round Robin advantage', TRUE);
SET @uniform_id = LAST_INSERT_ID();
INSERT INTO dataset_processes (dataset_id, pid, arrival, burst, priority, process_order) VALUES
(@uniform_id, 'P1', 0, 5, 1, 1),
(@uniform_id, 'P2', 1, 5, 2, 2),
(@uniform_id, 'P3', 2, 6, 3, 3),
(@uniform_id, 'P4', 3, 5, 1, 4),
(@uniform_id, 'P5', 4, 4, 2, 5);
INSERT INTO datasets (slug, name, description, is_builtin) VALUES
('priority', 'Priority-driven Scenario',
 'Mixed priorities - tests priority algorithms strength', TRUE);
SET @priority_id = LAST_INSERT_ID();
INSERT INTO dataset_processes (dataset_id, pid, arrival, burst, priority, process_order) VALUES
(@priority_id, 'P1', 0, 10, 3, 1),
(@priority_id, 'P2', 2, 5, 1, 2),
(@priority_id, 'P3', 4, 2, 4, 3),
(@priority_id, 'P4', 6, 8, 2, 4);