const db = require('../models');
const pool = require('../config/db');

async function getLocations(req, res) {
  try {
    const locations = await db.Location.findAllActive();
    
    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取地点列表失败', error: error.message });
  }
}

async function getLocationById(req, res) {
  const { id } = req.params;
  
  try {
    const location = await db.Location.findById(id);
    
    if (!location) {
      return res.status(404).json({ success: false, message: '地点不存在' });
    }
    
    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取地点详情失败', error: error.message });
  }
}

async function getAllLocations(req, res) {
  try {
    const locations = await db.Location.findAll();
    
    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取所有地点失败', error: error.message });
  }
}

async function createLocation(req, res) {
  const { name, amount } = req.body;
  
  if (!name || amount === undefined) {
    return res.status(400).json({ success: false, message: '参数不全' });
  }
  
  try {
    const id = 'L' + Date.now().toString(36).toUpperCase();
    await db.Location.create({ id, name, amount });
    
    res.json({ success: true, message: '创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建地点失败', error: error.message });
  }
}

async function updateLocation(req, res) {
  const { id } = req.params;
  const { name, amount, status } = req.body;
  
  try {
    await db.Location.update(id, { name, amount, status });
    
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新地点失败', error: error.message });
  }
}

async function deleteLocation(req, res) {
  const { id } = req.params;
  
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM applications WHERE location_id = ?',
      [id]
    );
    
    if (rows[0].count > 0) {
      return res.status(400).json({ success: false, message: '该地点已有相关申请记录，无法删除' });
    }
    
    await db.Location.delete(id);
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除地点失败', error: error.message });
  }
}

module.exports = { getLocations, getLocationById, getAllLocations, createLocation, updateLocation, deleteLocation };