CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dingtalk_userid VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(500),
  mobile VARCHAR(20),
  title VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT NOT NULL,
  approver_id INT NOT NULL,
  apply_date DATE NOT NULL,
  travel_date DATE NOT NULL,
  reason TEXT NOT NULL,
  location_id VARCHAR(20) NOT NULL,
  person_count INT NOT NULL DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  attachments JSON DEFAULT NULL,
  status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft',
  reject_reason TEXT,
  approver_comment VARCHAR(500),
  approved_at DATETIME,
  dingtalk_task_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

INSERT INTO locations (id, name, amount, status) VALUES
('A001', '本市本区', 100.00, 1),
('A002', '本市外区', 150.00, 1),
('A003', '省内其他城市', 250.00, 1),
('A004', '省外一线城市', 400.00, 1),
('A005', '省外其他城市', 300.00, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  amount = VALUES(amount),
  status = VALUES(status);

INSERT INTO users (dingtalk_userid, name, department, role, is_admin) VALUES
('test_admin', '管理员', '行政部', 'admin', 1),
('test_approver', '审批负责人', '管理层', '校长', 0),
('test_employee', '普通员工', '技术部', 'employee', 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  department = VALUES(department),
  role = VALUES(role),
  is_admin = VALUES(is_admin);
