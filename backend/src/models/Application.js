const pool = require('../config/db');

class Application {
  static async findAll() {
    const [rows] = await pool.execute('SELECT * FROM applications ORDER BY id DESC');
    return rows;
  }

  static async findByApplicantId(applicant_id) {
    const [rows] = await pool.execute(
      'SELECT * FROM applications WHERE applicant_id = ? ORDER BY id DESC',
      [applicant_id]
    );
    return rows;
  }

  static async findByApproverId(approver_id) {
    const [rows] = await pool.execute(
      'SELECT * FROM applications WHERE approver_id = ? ORDER BY id DESC',
      [approver_id]
    );
    return rows;
  }

  static async findByStatus(status) {
    const [rows] = await pool.execute(
      'SELECT * FROM applications WHERE status = ? ORDER BY id DESC',
      [status]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM applications WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async calculateAmount(personCount, locationAmount) {
    if (personCount <= 0) {
      throw new Error('出行人数必须大于0');
    }
    if (personCount === 1) {
      return personCount * locationAmount;
    } else {
      const discount = Math.max(0.3, 1 - personCount * 0.1);
      return Math.round(personCount * locationAmount * discount);
    }
  }

  static async create(data) {
    const amount = await this.calculateAmount(data.person_count, data.location_amount);
    const attachments = data.attachments ? JSON.stringify(data.attachments) : null;
    const [result] = await pool.execute(
      'INSERT INTO applications (applicant_id, approver_id, apply_date, travel_date, reason, attachments, location_id, person_count, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.applicant_id, data.approver_id, data.apply_date, data.travel_date, data.reason, attachments, data.location_id, data.person_count, amount, 'pending']
    );
    return { id: result.insertId, amount };
  }

  static async update(id, data) {
    const updates = [];
    const params = [];
    
    if (data.apply_date !== undefined) {
      updates.push('apply_date = ?');
      params.push(data.apply_date);
    }
    if (data.travel_date !== undefined) {
      updates.push('travel_date = ?');
      params.push(data.travel_date);
    }
    if (data.approver_id !== undefined) {
      updates.push('approver_id = ?');
      params.push(data.approver_id);
    }
    if (data.reason !== undefined) {
      updates.push('reason = ?');
      params.push(data.reason);
    }
    if (data.location_id !== undefined) {
      updates.push('location_id = ?');
      params.push(data.location_id);
    }
    if (data.person_count !== undefined) {
      updates.push('person_count = ?');
      params.push(data.person_count);
    }
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      params.push(data.amount);
    }
    if (data.dingtalk_task_id !== undefined) {
      updates.push('dingtalk_task_id = ?');
      params.push(data.dingtalk_task_id);
    }
    if (data.attachments !== undefined) {
      updates.push('attachments = ?');
      params.push(data.attachments);
    }
    
    params.push(id);
    
    await pool.execute(
      `UPDATE applications SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async delete(id) {
    await pool.execute('DELETE FROM applications WHERE id = ?', [id]);
  }

  static async updateStatus(id, status, comment = null, reason = null) {
    const approved_at = status !== 'pending' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await pool.execute(
      'UPDATE applications SET status = ?, approver_comment = ?, reject_reason = ?, approved_at = ? WHERE id = ?',
      [status, comment, reason, approved_at, id]
    );
  }
}

module.exports = Application;