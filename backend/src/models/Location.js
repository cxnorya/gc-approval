const pool = require('../config/db');

class Location {
  static async findAllActive() {
    const [rows] = await pool.execute(
      'SELECT * FROM locations WHERE status = 1'
    );
    return rows;
  }

  static async findAll() {
    const [rows] = await pool.execute('SELECT * FROM locations');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM locations WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO locations (id, name, amount, status) VALUES (?, ?, ?, 1)',
      [data.id, data.name, data.amount]
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
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      params.push(data.amount);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    
    params.push(id);
    
    await pool.execute(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async delete(id) {
    await pool.execute('DELETE FROM locations WHERE id = ?', [id]);
  }
}

module.exports = Location;