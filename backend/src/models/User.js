const pool = require('../config/db');

class User {
  static async findByDingtalkUserId(dingtalk_userid) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE dingtalk_userid = ?',
      [dingtalk_userid]
    );
    return rows[0] || null;
  }

  static async findByDingtalkId(dingtalk_userid) {
    return this.findByDingtalkUserId(dingtalk_userid);
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByName(name) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE name = ?',
      [name]
    );
    return rows[0] || null;
  }

  static async findAll() {
    const [rows] = await pool.execute('SELECT * FROM users');
    return rows;
  }

  static async updateRole(id, role) {
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );
  }

  static async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO users (dingtalk_userid, name, department, mobile, title, role, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.dingtalk_userid, data.name, data.department, data.mobile, data.title, data.role, data.is_admin ? 1 : 0]
    );
    return result;
  }

  static async update(id, data) {
    const updates = [];
    const params = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.department !== undefined) {
      updates.push('department = ?');
      params.push(data.department);
    }
    if (data.mobile !== undefined) {
      updates.push('mobile = ?');
      params.push(data.mobile);
    }
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.is_admin !== undefined) {
      updates.push('is_admin = ?');
      params.push(data.is_admin ? 1 : 0);
    }

    params.push(id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }
}

module.exports = User;