const db = require('../models');
const { verifyToken } = require('../utils/jwt');

async function exportMonthlyData(req, res) {
  const { month } = req.query;
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
  
  const user = await db.User.findById(decoded.id);
  if (!user || user.role !== '财务') {
    return res.status(403).json({ success: false, message: '无导出权限，仅财务角色可导出数据' });
  }
  
  if (!month) {
    return res.status(400).json({ success: false, message: '请提供月份参数' });
  }
  
  try {
    let apps = await db.Application.findAll();
    
    if (month) {
      apps = apps.filter(a => a.apply_date.startsWith(month.slice(0, 4) + '-' + month.slice(4)));
    }
    
    const data = await Promise.all(apps.map(async app => {
      const applicant = await db.User.findById(app.applicant_id);
      const approver = await db.User.findById(app.approver_id);
      const location = await db.Location.findById(app.location_id);
      const statusText = app.status === 'approved' ? '已通过' : app.status === 'rejected' ? '已驳回' : app.status === 'pending' ? '待审批' : app.status === 'cancelled' ? '已取消' : '草稿';
      
      return {
        '申请日期': app.apply_date,
        '出行日期': app.travel_date,
        '申请人': applicant?.name || '',
        '审批负责人': approver?.name || '',
        '公出事由': app.reason,
        '公出地点': location?.name || '',
        '出行人数': app.person_count,
        '报销金额': app.amount,
        '审批状态': statusText,
        '审批时间': app.approved_at || ''
      };
    }));
    
    const headers = Object.keys(data[0] || {});
    let csv = headers.join('\t') + '\n';
    
    data.forEach(row => {
      csv += headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join('\t') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="公出审批数据_${month}.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    res.status(500).json({ success: false, message: '导出失败', error: error.message });
  }
}

module.exports = { exportMonthlyData };