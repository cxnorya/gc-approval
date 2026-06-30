const mysql = require('mysql2');

async function initMySQL() {
  try {
    console.log('正在初始化MySQL数据库...');
    
    const connection = mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'Bswhtlq83@'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query('CREATE DATABASE IF NOT EXISTS gc_approval CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query('USE gc_approval', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          dingtalk_userid VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(50) NOT NULL,
          department VARCHAR(100),
          role ENUM('employee', 'approver', 'admin') NOT NULL DEFAULT 'employee',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query(`
        CREATE TABLE IF NOT EXISTS locations (
          id VARCHAR(20) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          status TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query(`
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
          status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft',
          reject_reason TEXT,
          approver_comment VARCHAR(500),
          approved_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (applicant_id) REFERENCES users(id),
          FOREIGN KEY (approver_id) REFERENCES users(id),
          FOREIGN KEY (location_id) REFERENCES locations(id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO locations (id, name, amount, status) VALUES ('A001', '本市本区', 100.00, 1)", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO locations (id, name, amount, status) VALUES ('A002', '本市外区', 150.00, 1)", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO locations (id, name, amount, status) VALUES ('A003', '省内其他城市', 250.00, 1)", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO locations (id, name, amount, status) VALUES ('A004', '省外一线城市', 400.00, 1)", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO locations (id, name, amount, status) VALUES ('A005', '省外其他城市', 300.00, 1)", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO users (dingtalk_userid, name, department, role) VALUES ('admin', '管理员', '行政部', 'admin')", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO users (dingtalk_userid, name, department, role) VALUES ('approver', '审批负责人', '管理层', 'approver')", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await new Promise((resolve, reject) => {
      connection.query("INSERT IGNORE INTO users (dingtalk_userid, name, department, role) VALUES ('employee', '普通员工', '技术部', 'employee')", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    connection.end();
    
    console.log('MySQL数据库初始化完成！');
  } catch (error) {
    console.error('MySQL初始化失败:', error.message);
    console.log('将继续使用内存数据库...');
  }
}

initMySQL();