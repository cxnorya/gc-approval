const User = require('./User');
const Location = require('./Location');
const Application = require('./Application');
const memoryDb = require('../config/memoryDb');

let useMysql = true;

async function testMysqlConnection() {
  try {
    await runMigrations();
    await User.findAll();
    console.log('MySQL连接成功');
  } catch (error) {
    console.log(`MySQL连接失败，回退到内存数据库: ${error.message}`);
    useMysql = false;
  }
}

const pool = require('../config/db');

// 执行数据库迁移
async function runMigrations() {
  const migrations = [
    'ALTER TABLE users ADD COLUMN mobile VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN title VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0',
    'ALTER TABLE applications ADD COLUMN attachments JSON DEFAULT NULL',
    'ALTER TABLE applications ADD COLUMN dingtalk_task_id VARCHAR(255) DEFAULT NULL'
  ];

  for (const sql of migrations) {
    try {
      await pool.execute(sql);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && !error.message.includes('Duplicate column')) {
        console.warn('数据库迁移警告:', error.message);
      }
    }
  }
  console.log('数据库迁移检查完成');
}
const db = {
  User: {
    findByDingtalkUserId: async (dingtalk_userid) => {
      if (useMysql) {
        return User.findByDingtalkUserId(dingtalk_userid);
      }
      return memoryDb.users.findByDingtalkUserId(dingtalk_userid);
    },
    findByDingtalkId: async (dingtalk_userid) => {
      if (useMysql) {
        return User.findByDingtalkId(dingtalk_userid);
      }
      return memoryDb.users.findByDingtalkUserId(dingtalk_userid);
    },
    findById: async (id) => {
      if (useMysql) {
        return User.findById(id);
      }
      return memoryDb.users.findById(id);
    },
    findByName: async (name) => {
      if (useMysql) {
        return User.findByName(name);
      }
      return memoryDb.users.findByName(name);
    },
    findAll: async () => {
      if (useMysql) {
        return User.findAll();
      }
      return memoryDb.users.findAll();
    },
    updateRole: async (id, role) => {
      if (useMysql) {
        return User.updateRole(id, role);
      }
      return memoryDb.users.updateRole(id, role);
    },
    create: async (data) => {
      if (useMysql) {
        return User.create(data);
      }
      return memoryDb.users.create(data);
    },
    update: async (id, data) => {
      if (useMysql) {
        return User.update(id, data);
      }
      return memoryDb.users.update(id, data);
    }
  },
  Location: {
    findAllActive: async () => {
      if (useMysql) {
        return Location.findAllActive();
      }
      return memoryDb.locations.findAllActive();
    },
    findAll: async () => {
      if (useMysql) {
        return Location.findAll();
      }
      return memoryDb.locations.findAll();
    },
    findById: async (id) => {
      if (useMysql) {
        return Location.findById(id);
      }
      return memoryDb.locations.findById(id);
    },
    create: async (data) => {
      if (useMysql) {
        return Location.create(data);
      }
      return memoryDb.locations.create(data);
    },
    update: async (id, data) => {
      if (useMysql) {
        return Location.update(id, data);
      }
      return memoryDb.locations.update(id, data);
    },
    delete: async (id) => {
      if (useMysql) {
        return Location.delete(id);
      }
      return memoryDb.locations.delete(id);
    }
  },
  Application: {
    findAll: async () => {
      if (useMysql) {
        return Application.findAll();
      }
      return memoryDb.applications.findAll();
    },
    findByApplicantId: async (applicant_id) => {
      if (useMysql) {
        return Application.findByApplicantId(applicant_id);
      }
      return memoryDb.applications.findByApplicantId(applicant_id);
    },
    findByApproverId: async (approver_id) => {
      if (useMysql) {
        return Application.findByApproverId(approver_id);
      }
      return memoryDb.applications.findByApproverId(approver_id);
    },
    findByStatus: async (status) => {
      if (useMysql) {
        return Application.findByStatus(status);
      }
      return memoryDb.applications.findByStatus(status);
    },
    findById: async (id) => {
      if (useMysql) {
        return Application.findById(id);
      }
      return memoryDb.applications.findById(id);
    },
    calculateAmount: (personCount, locationAmount) => {
      return memoryDb.calculateAmount(personCount, locationAmount);
    },
    create: async (data) => {
      if (useMysql) {
        return Application.create(data);
      }
      return memoryDb.applications.create({
        applicant_id: data.applicant_id,
        approver_id: data.approver_id,
        apply_date: data.apply_date,
        travel_date: data.travel_date,
        reason: data.reason,
        location_id: data.location_id,
        person_count: data.person_count
      });
    },
    update: async (id, data) => {
      if (useMysql) {
        return Application.update(id, data);
      }
      return memoryDb.applications.update(id, data);
    },
    delete: async (id) => {
      if (useMysql) {
        return Application.delete(id);
      }
      return memoryDb.applications.delete(id);
    },
    updateStatus: async (id, status, comment = null, reason = null) => {
      if (useMysql) {
        return Application.updateStatus(id, status, comment, reason);
      }
      return memoryDb.applications.updateStatus(id, status, comment, reason);
    }
  },
  init: testMysqlConnection
};

module.exports = db;
